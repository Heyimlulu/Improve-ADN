/**
 * Playback speed: a speed menu in the control bar (unless the player already
 * has one) and memory of the last speed across episodes. When a remembered
 * speed other than 1× is applied, the OSD says so.
 */

import { Feature } from '../core/feature.js';
import { createControlButton, insertIntoControlBar } from '../core/controlbar.js';
import { createElement, createSvgIcon } from '../core/dom.js';
import { ICONS } from '../core/icons.js';
import { PLAYER_SELECTORS } from '../core/player.js';
import { PLAYBACK_RATES, formatRate } from '../core/actions.js';
import { t } from '../../shared/i18n.js';
import { logger } from '../core/logger.js';

const LAST_RATE_KEY = 'lastPlaybackRate';

export class PlaybackRate extends Feature {
    static id = 'playback-rate';

    #menu = null;
    #label = null;
    #items = new Map();
    #rememberedRate = null;

    onEnable() {
        this.#loadRememberedRate();

        this.onEachVideo((video, container, scope) => {
            scope.listen(video, 'ratechange', () => this.#onRateChange(video));
            scope.listen(video, 'loadedmetadata', () => this.#applyRememberedRate(video, container));
            this.#applyRememberedRate(video, container);
            this.#refresh(video.playbackRate);
        });

        this.onEachControlBar((controlBar, _container, scope) => this.#mountMenu(controlBar, scope));
    }

    // ------------------------------------------------------------- Menu --

    #mountMenu(controlBar, scope) {
        if (controlBar.querySelector(PLAYER_SELECTORS.PLAYBACK_RATE_BUTTON)) {
            logger.debug('Player already has a playback rate control, skipping ours');
            return;
        }

        this.#items.clear();
        const list = createElement('ul', { class: 'adn-improver-menu-list', role: 'menu' });
        for (const rate of PLAYBACK_RATES) {
            const item = createElement('li', {
                class: 'adn-improver-menu-item',
                role: 'menuitemradio',
                tabindex: '-1',
                text: formatRate(rate),
            });
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                this.ctx.actions.setPlaybackRate(rate);
            });
            this.#items.set(rate, item);
            list.append(item);
        }

        this.#label = createElement('span', { class: 'adn-improver-control-text' });
        const button = createControlButton({
            className: 'adn-improver-rate-button',
            label: t('buttonPlaybackRate'),
            content: this.#label,
            onClick: () => this.#menu?.classList.toggle('is-open'),
        });

        this.#menu = createElement(
            'div',
            { class: ['adn-improver-menu', 'adn-improver-rate-menu'] },
            [button, createElement('div', { class: 'adn-improver-menu-popup' }, [list])],
        );
        this.#menu.addEventListener('mouseleave', () => this.#menu?.classList.remove('is-open'));

        const removeMenu = insertIntoControlBar(controlBar, this.#menu);
        scope.add(() => {
            removeMenu();
            this.#menu = null;
            this.#label = null;
            this.#items.clear();
        });
        this.#refresh(this.ctx.player.video?.playbackRate ?? 1);
    }

    #refresh(rate) {
        if (this.#label) this.#label.textContent = formatRate(rate);
        for (const [itemRate, item] of this.#items) {
            const selected = Math.abs(itemRate - rate) < 0.001;
            item.classList.toggle('is-selected', selected);
            item.setAttribute('aria-checked', String(selected));
        }
    }

    // ----------------------------------------------------------- Memory --

    #onRateChange(video) {
        this.#refresh(video.playbackRate);
        this.#rememberedRate = video.playbackRate;
        chrome.storage.local.set({ [LAST_RATE_KEY]: video.playbackRate }).catch((error) => {
            logger.warn('Unable to remember playback rate', error);
        });
    }

    async #loadRememberedRate() {
        try {
            const stored = await chrome.storage.local.get(LAST_RATE_KEY);
            const rate = Number(stored[LAST_RATE_KEY]);
            this.#rememberedRate = Number.isFinite(rate) && rate > 0 ? rate : null;
            const { video, container } = this.ctx.player;
            if (video) this.#applyRememberedRate(video, container);
        } catch (error) {
            logger.warn('Unable to read remembered playback rate', error);
        }
    }

    #applyRememberedRate(video, container) {
        const rate = this.#rememberedRate;
        if (!rate || Math.abs(video.playbackRate - rate) < 0.001) return;
        video.playbackRate = rate;
        if (Math.abs(rate - 1) > 0.001) {
            this.ctx.osd.show(container, formatRate(rate), createSvgIcon(ICONS.speed));
        }
    }
}
