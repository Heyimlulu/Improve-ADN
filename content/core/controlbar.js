/**
 * Helpers to add video.js-looking controls to the player's control bar.
 *
 * ADN's skin lays the bar out with its own flex `order` values and hides
 * controls it does not know. To survive that, every injected element copies
 * the computed geometry of the fullscreen button (order, height, font size,
 * colour) and forces the properties a stylesheet could use to hide it, as
 * inline `!important` declarations, which beat any author rule.
 *
 * Buttons are inserted just before the fullscreen button when it exists so
 * they sit where users expect extra controls (like Crunchyroll / YouTube).
 */

import { createElement } from './dom.js';
import { PLAYER_SELECTORS } from './player.js';

const ANCHOR_SELECTORS = [PLAYER_SELECTORS.FULLSCREEN_BUTTON, PLAYER_SELECTORS.PIP_BUTTON];

/** Properties a stylesheet could use to hide our control: pinned to visible values. */
const FORCED_STYLES = Object.freeze({
    display: 'inline-flex',
    visibility: 'visible',
    opacity: '1',
    position: 'relative',
    left: 'auto',
    top: 'auto',
    flex: '0 0 auto',
    width: 'auto',
    'min-width': '3em',
    'max-width': 'none',
    overflow: 'visible',
    transform: 'none',
    'clip-path': 'none',
    'pointer-events': 'auto',
});

/** Properties copied from the reference control so ours lines up with it. */
const COPIED_STYLES = ['order', 'height', 'min-height', 'max-height', 'font-size', 'color', 'align-self', 'margin-top', 'margin-bottom'];

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
 * (fullscreen / PiP buttons), or append it at the end, and keep its geometry
 * aligned with that anchor. Returns a function that removes the element.
 */
export function insertIntoControlBar(controlBar, element) {
    const anchor = ANCHOR_SELECTORS.map((selector) => controlBar.querySelector(selector)).find(Boolean);

    if (anchor) controlBar.insertBefore(element, anchor);
    else controlBar.append(element);

    const harmonize = () => matchReference(element, anchor);
    harmonize();
    window.addEventListener('resize', harmonize);
    document.addEventListener('fullscreenchange', harmonize);

    return () => {
        window.removeEventListener('resize', harmonize);
        document.removeEventListener('fullscreenchange', harmonize);
        element.remove();
    };
}

function matchReference(element, reference) {
    for (const [property, value] of Object.entries(FORCED_STYLES)) {
        element.style.setProperty(property, value, 'important');
    }
    if (!reference?.isConnected) return;
    const computed = getComputedStyle(reference);
    for (const property of COPIED_STYLES) {
        const value = computed.getPropertyValue(property);
        if (value && value !== 'auto' && value !== 'normal') {
            element.style.setProperty(property, value, 'important');
        }
    }
}
