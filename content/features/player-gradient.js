/**
 * Controls the dark gradient ADN draws at the bottom of the player.
 *
 * The gradient layer is not always hidden together with the controls, which
 * leaves a black fade over the picture (very visible in theater mode). This
 * feature finds any gradient-backgrounded element inside the player at runtime
 * and marks it so CSS can hide it:
 *   - `withControls` : hidden whenever the control bar is hidden
 *   - `hidden`       : always hidden
 *   - `native`       : feature off
 *
 * Marks:
 *   [data-adn-player-gradient="layer"]      pure overlay -> faded out
 *   [data-adn-player-gradient="background"] element that also hosts controls -> background removed
 *   html[data-adn-controls="hidden|visible"] current control bar visibility
 */

import { Feature } from '../core/feature.js';
import { rafThrottle, setRootAttribute } from '../core/dom.js';
import { PLAYER_SELECTORS } from '../core/player.js';

const MARK = 'data-adn-player-gradient';
const MIN_HEIGHT_PX = 24;
const MIN_WIDTH_RATIO = 0.5;

export class PlayerGradient extends Feature {
    static id = 'player-gradient';
    settingKeys = ['playerGradient'];

    #container = null;
    #marked = new Set();
    #mutationObserver = null;
    #controlsObserver = null;
    #rescan = rafThrottle(() => this.#scan());
    #refreshControls = rafThrottle(() => this.#updateControlsVisibility());

    isWanted() {
        return this.ctx.settings.get('playerGradient') !== 'native';
    }

    onEnable() {
        this.#applyMode();
        this.onEachVideo((video, container, scope) => this.#attach(video, container, scope));
    }

    onDisable() {
        setRootAttribute('data-adn-gradient', null);
        setRootAttribute('data-adn-controls', null);
    }

    onSettingsChange() {
        if (this.enabled) this.#applyMode();
    }

    #applyMode() {
        setRootAttribute('data-adn-gradient', this.ctx.settings.get('playerGradient'));
    }

    #attach(video, container, scope) {
        this.#container = container;
        scope.add(() => this.#detach());

        this.#mutationObserver = new MutationObserver(this.#rescan);
        this.#mutationObserver.observe(container, { childList: true, subtree: true });

        this.#controlsObserver = new MutationObserver(this.#refreshControls);
        this.#controlsObserver.observe(container, {
            attributes: true,
            attributeFilter: ['class', 'style'],
            subtree: true,
        });

        for (const type of ['play', 'pause', 'ended']) {
            scope.listen(video, type, this.#refreshControls);
        }

        this.#scan();
        this.#updateControlsVisibility();
    }

    #detach() {
        this.#mutationObserver?.disconnect();
        this.#controlsObserver?.disconnect();
        this.#mutationObserver = null;
        this.#controlsObserver = null;
        for (const element of this.#marked) element.removeAttribute(MARK);
        this.#marked.clear();
        this.#container = null;
        setRootAttribute('data-adn-controls', null);
    }

    /** Tag every element of the player drawing a large gradient. */
    #scan() {
        const container = this.#container;
        if (!container?.isConnected) return;
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0) return;

        for (const element of this.#marked) {
            if (!element.isConnected) this.#marked.delete(element);
        }

        for (const element of container.querySelectorAll('*')) {
            if (element === container || element.closest(PLAYER_SELECTORS.CONTROL_BAR)) continue;
            if (element.classList.contains('adn-improver-pause-overlay')) continue;

            const style = getComputedStyle(element);
            if (!style.backgroundImage.includes('gradient')) continue;

            const rect = element.getBoundingClientRect();
            if (rect.height < MIN_HEIGHT_PX || rect.width < containerRect.width * MIN_WIDTH_RATIO) continue;

            const hostsControls = element.querySelector('button, [role="button"], .vjs-control') !== null;
            element.setAttribute(MARK, hostsControls ? 'background' : 'layer');
            this.#marked.add(element);
        }
    }

    /** Mirror the control bar visibility on <html> for the CSS. */
    #updateControlsVisibility() {
        const container = this.#container;
        if (!container?.isConnected) return;
        const controlBar = container.querySelector(PLAYER_SELECTORS.CONTROL_BAR);
        let hidden = false;

        if (controlBar) {
            const style = getComputedStyle(controlBar);
            hidden = style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none';
        }
        if (!hidden && container.classList.contains('vjs-user-inactive') && !this.ctx.player.video?.paused) {
            hidden = true;
        }

        setRootAttribute('data-adn-controls', hidden ? 'hidden' : 'visible');
    }
}
