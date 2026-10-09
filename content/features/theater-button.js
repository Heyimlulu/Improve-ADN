/**
 * Adds a "theater mode" toggle button to the player's control bar.
 */

import { Feature } from '../core/feature.js';
import { createControlButton, insertIntoControlBar } from '../core/controlbar.js';
import { createSvgIcon } from '../core/dom.js';
import { ICONS } from '../../shared/icons.js';
import { t } from '../../shared/i18n.js';

export class TheaterButton extends Feature {
    static id = 'theater-button';
    settingKeys = ['theaterMode'];

    #button = null;

    isWanted() {
        return true;
    }

    onEnable() {
        this.onEachControlBar((controlBar, _container, scope) => {
            const button = createControlButton({
                className: 'adn-improver-theater-button',
                label: t('buttonTheaterMode'),
                content: createSvgIcon(ICONS.theater, { className: 'adn-improver-icon' }),
                onClick: () => this.ctx.actions.toggleTheaterMode(),
            });
            this.#button = button;
            this.#refresh();
            const remove = insertIntoControlBar(controlBar, button);
            scope.add(() => {
                remove();
                if (this.#button === button) this.#button = null;
            });
        });
    }

    onSettingsChange(changes) {
        if ('theaterMode' in changes) this.#refresh();
    }

    #refresh() {
        if (!this.#button) return;
        const active = this.ctx.settings.get('theaterMode');
        this.#button.classList.toggle('is-active', active);
        this.#button.setAttribute('aria-pressed', String(active));
        this.#button.replaceChildren(
            createSvgIcon(active ? ICONS.theaterActive : ICONS.theater, { className: 'adn-improver-icon' }),
        );
    }
}
