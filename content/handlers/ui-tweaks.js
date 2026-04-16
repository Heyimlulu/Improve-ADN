/**
 * UI Tweaks Handler
 * Manages various UI modifications and toggles
 */

import { CSS_CLASSES } from '../../shared/constants.js';

export class UITweaksHandler {
    apply(settings) {       
        // Apply scrollbar hiding to both html and body elements
        const hideScrollbar = settings.hideScrollbar;
        document.documentElement.classList.toggle(CSS_CLASSES.HIDE_SCROLLBAR, hideScrollbar);
        document.body.classList.toggle(CSS_CLASSES.HIDE_SCROLLBAR, hideScrollbar);
    }
}
