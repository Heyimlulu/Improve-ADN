/**
 * Hides the dark gradient ADN draws at the bottom of the player whenever the
 * controls are hidden.
 *
 * The gradient layer is not always hidden together with the controls, which
 * leaves a black fade over the picture (very visible in theater mode). This
 * feature finds any gradient-painted element inside the player at runtime
 * and marks it so CSS can fade it out with the controls.
 *
 * Marks:
 *   [data-adn-player-gradient="layer"]       pure overlay -> faded out
 *   [data-adn-player-gradient="background"]  element that also hosts controls
 *                                            (the control bar itself included) -> background removed
 *   [data-adn-player-gradient-pseudo~="before|after"] gradient drawn by a ::before / ::after
 *   html[data-adn-controls="hidden|visible"] current control bar visibility
 */

import { Feature } from '../core/feature.js';
import { rafThrottle, setRootAttribute } from '../core/dom.js';
import { PLAYER_SELECTORS } from '../core/player.js';

const MARK = 'data-adn-player-gradient';
const PSEUDO_MARK = 'data-adn-player-gradient-pseudo';
const PSEUDO_ELEMENTS = ['before', 'after'];
const MIN_HEIGHT_PX = 24;
const MIN_WIDTH_RATIO = 0.5;

export class PlayerGradient extends Feature {
    static id = 'player-gradient';

    #container = null;
    #marked = new Set();
    #mutationObserver = null;
    #controlsObserver = null;
    #rescan = rafThrottle(() => this.#scan());
    #refreshControls = rafThrottle(() => this.#updateControlsVisibility());
    // Class changes (e.g. vjs-player-started) can add or remove gradient pseudo-elements.
    #onAttributes = () => {
        this.#rescan();
        this.#refreshControls();
    };

    onEnable() {
        this.onEachVideo((video, container, scope) => this.#attach(video, container, scope));
    }

    onDisable() {
        setRootAttribute('data-adn-controls', null);
    }

    #attach(video, container, scope) {
        this.#container = container;
        scope.add(() => this.#detach());

        this.#mutationObserver = new MutationObserver(this.#rescan);
        this.#mutationObserver.observe(container, { childList: true, subtree: true });

        this.#controlsObserver = new MutationObserver(this.#onAttributes);
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
        for (const element of this.#marked) {
            element.removeAttribute(MARK);
            element.removeAttribute(PSEUDO_MARK);
        }
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

        const minWidth = containerRect.width * MIN_WIDTH_RATIO;
        const isLarge = (rect) => rect.height >= MIN_HEIGHT_PX && rect.width >= minWidth;

        for (const element of [container, ...container.querySelectorAll('*')]) {
            if (element.classList.contains('adn-improver-pause-overlay')) continue;
            // Children of the control bar fade with it; the bar itself may carry the gradient.
            const controlBar = element.closest(PLAYER_SELECTORS.CONTROL_BAR);
            if (controlBar && controlBar !== element) continue;

            // Gradient painted by the element itself.
            if (element !== container && getComputedStyle(element).backgroundImage.includes('gradient')) {
                if (isLarge(element.getBoundingClientRect())) {
                    const hostsControls =
                        controlBar === element || element.querySelector('button, [role="button"], .vjs-control') !== null;
                    element.setAttribute(MARK, hostsControls ? 'background' : 'layer');
                    this.#marked.add(element);
                }
            }

            // Gradient painted by a ::before / ::after (cannot be measured: trust the style).
            const pseudos = PSEUDO_ELEMENTS.filter((pseudo) => {
                const style = getComputedStyle(element, `::${pseudo}`);
                return style.content !== 'none' && style.backgroundImage.includes('gradient');
            });
            if (pseudos.length > 0) {
                element.setAttribute(PSEUDO_MARK, pseudos.join(' '));
                this.#marked.add(element);
            }
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
