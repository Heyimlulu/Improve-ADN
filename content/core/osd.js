/**
 * On-screen display: a short-lived badge inside the player that confirms an
 * action (volume, seek, playback rate, theater mode...). Think YouTube.
 */

import { createElement } from './dom.js';

const CLASS = 'adn-improver-osd';
const VISIBLE_CLASS = 'is-visible';
const DURATION_MS = 900;

export class Osd {
    #element = null;
    #timer = null;

    /**
     * Show `text` inside `container` (the `.video-js` element). An optional
     * `icon` (SVG element) is displayed before the text.
     */
    show(container, text, icon = null) {
        if (!container) return;

        if (!this.#element || this.#element.parentElement !== container) {
            this.#element?.remove();
            this.#element = createElement('div', { class: CLASS, role: 'status', 'aria-live': 'polite' });
            container.append(this.#element);
        }

        this.#element.replaceChildren();
        if (icon) this.#element.append(icon);
        this.#element.append(createElement('span', { text }));

        // Restart the CSS transition even if a message is already displayed.
        this.#element.classList.remove(VISIBLE_CLASS);
        void this.#element.offsetWidth;
        this.#element.classList.add(VISIBLE_CLASS);

        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => this.#element?.classList.remove(VISIBLE_CLASS), DURATION_MS);
    }

    destroy() {
        clearTimeout(this.#timer);
        this.#element?.remove();
        this.#element = null;
    }
}
