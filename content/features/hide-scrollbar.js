/**
 * Hides the page scrollbar on watch pages for a cleaner picture.
 * Scrolling still works; only the bar is invisible.
 */

import { Feature } from '../core/feature.js';
import { setRootAttribute } from '../core/dom.js';

export class HideScrollbar extends Feature {
    static id = 'hide-scrollbar';
    settingKeys = ['hideScrollbar'];

    onEnable() {
        setRootAttribute('data-adn-scrollbar', 'hidden');
    }

    onDisable() {
        setRootAttribute('data-adn-scrollbar', null);
    }
}
