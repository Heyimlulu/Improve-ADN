/**
 * Helpers to add video.js-looking controls to the player's control bar.
 *
 * Buttons are inserted just before the fullscreen button when it exists so
 * they sit where users expect extra controls (like Crunchyroll / YouTube).
 */

import { createElement } from './dom.js';
import { PLAYER_SELECTORS } from './player.js';

const ANCHOR_SELECTORS = [
    PLAYER_SELECTORS.FULLSCREEN_BUTTON,
    PLAYER_SELECTORS.PIP_BUTTON,
];

/**
 * Create a `<button>` styled like a video.js control.
 * @param {object} options
 * @param {string} options.className extra class(es)
 * @param {string} options.label accessible label / tooltip
 * @param {Node|string} options.content icon element or text
 * @param {(event: MouseEvent) => void} options.onClick
 */
export function createControlButton({ className, label, content, onClick }) {
    const button = createElement(
        'button',
        {
            class: ['vjs-control', 'vjs-button', 'adn-improver-control', className],
            type: 'button',
            title: label,
            'aria-label': label,
        },
        [typeof content === 'string' ? createElement('span', { class: 'adn-improver-control-text', text: content }) : content],
    );
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick(event);
        // Keep the keyboard focus off the button so Space still toggles playback.
        button.blur();
    });
    return button;
}

/**
 * Insert `element` into `controlBar` before the first anchor found
 * (fullscreen / PiP buttons), or append it at the end.
 * Returns a function that removes the element.
 */
export function insertIntoControlBar(controlBar, element) {
    const anchor = ANCHOR_SELECTORS
        .map((selector) => controlBar.querySelector(selector))
        .find(Boolean);

    if (anchor) controlBar.insertBefore(element, anchor);
    else controlBar.append(element);

    return () => element.remove();
}
