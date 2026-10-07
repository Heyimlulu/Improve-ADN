/**
 * Adds a Picture-in-Picture button to the control bar when the browser
 * supports it and the player does not already provide one.
 * Note: subtitles are rendered in the page, so they are not part of the PiP window.
 */

import { Feature } from '../core/feature.js';
import { createControlButton, insertIntoControlBar } from '../core/controlbar.js';
import { createSvgIcon } from '../core/dom.js';
import { ICONS } from '../core/icons.js';
import { PLAYER_SELECTORS } from '../core/player.js';
import { t } from '../../shared/i18n.js';

export class PictureInPicture extends Feature {
    static id = 'picture-in-picture';
    settingKeys = ['pipButton'];

    isApplicable() {
        return super.isApplicable() && Boolean(document.pictureInPictureEnabled);
    }

    onEnable() {
        this.onEachControlBar((controlBar, _container, scope) => {
            const native = controlBar.querySelector(PLAYER_SELECTORS.PIP_BUTTON);
            if (native && getComputedStyle(native).display !== 'none') return;

            const button = createControlButton({
                className: 'adn-improver-pip-button',
                label: t('buttonPictureInPicture'),
                content: createSvgIcon(ICONS.pip, { className: 'adn-improver-icon' }),
                onClick: () => this.ctx.actions.togglePictureInPicture(),
            });
            scope.add(insertIntoControlBar(controlBar, button));
        });
    }
}
