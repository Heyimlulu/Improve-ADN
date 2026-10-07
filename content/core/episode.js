/**
 * Page-level helpers about the episode being watched.
 *
 * ADN uses hashed styled-components class names (e.g. `.sc-c71a35ae-3`) that
 * change on every deployment, so everything here relies on structure and
 * semantics (headings, links, data-testid, document title) with fallbacks.
 */

import { logger } from './logger.js';

const NEXT_WORDS = /(épisode\s+suivant|episode\s+suivant|suivant|next\s+episode|next)/i;
const PREVIOUS_WORDS = /(épisode\s+précédent|episode\s+précédent|précédent|previous\s+episode|previous|prev)/i;

/**
 * Extract the show name and the episode title.
 * Returns `{ show, episode }` where each part may be an empty string.
 */
export function getEpisodeInfo() {
    const heading = document.querySelector('main h1, h1');
    if (heading) {
        const link = heading.querySelector('a');
        const show = link?.textContent.trim() ?? '';
        const episode = trimSeparators(collectTextExcluding(heading, link));
        if (show || episode) return { show, episode };
    }

    // Fallback: the document title is usually "<episode> - <show> - ADN".
    const parts = document.title
        .split(/\s+[-|–]\s+/)
        .map((part) => part.trim())
        .filter((part) => part && !/^adn$/i.test(part) && !/animation digital network/i.test(part));
    if (parts.length >= 2) return { show: parts[1], episode: parts[0] };
    if (parts.length === 1) return { show: '', episode: parts[0] };

    return { show: '', episode: '' };
}

function isVisible(element) {
    return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

/** Remove decorative separators ("·", "-", "|", ":") around a title fragment. */
function trimSeparators(text) {
    return text.replace(/^[\s·•\-–—|:]+|[\s·•\-–—|:]+$/g, '');
}

function collectTextExcluding(root, excluded) {
    let text = '';
    for (const node of root.childNodes) {
        if (node === excluded) continue;
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
        else if (node.nodeType === Node.ELEMENT_NODE) text += collectTextExcluding(node, excluded) + ' ';
    }
    return text.replace(/\s+/g, ' ');
}

/** Link or button leading to the next episode, if the page exposes one. */
export function findNextEpisodeControl() {
    return findEpisodeControl(NEXT_WORDS, 1);
}

/** Link or button leading to the previous episode, if the page exposes one. */
export function findPreviousEpisodeControl() {
    return findEpisodeControl(PREVIOUS_WORDS, -1);
}

/** video.js wrappers ADN uses for its native previous / next episode buttons. */
const NATIVE_CONTROLS = {
    1: '.vjs-control-next-video',
    [-1]: '.vjs-control-previous-video',
};

function findEpisodeControl(words, direction) {
    // 1. The player's own buttons (hidden on the first / last episode).
    const wrapper = document.querySelector(NATIVE_CONTROLS[direction]);
    if (wrapper && !wrapper.classList.contains('vjs-hidden')) {
        const button = wrapper.querySelector('button, [role="button"]') ?? wrapper;
        if (getComputedStyle(button).display !== 'none') return button;
    }

    // 2. Explicit controls (aria-label, title, text, data-testid).
    const candidates = document.querySelectorAll(
        'a[href*="/video/"], button, [role="button"], [data-testid*="next"], [data-testid*="prev"]',
    );
    for (const candidate of candidates) {
        if (!isVisible(candidate)) continue;
        const label = [
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('title'),
            candidate.dataset?.testid,
            candidate.textContent,
        ]
            .filter(Boolean)
            .join(' ');
        if (label.length < 120 && words.test(label)) return candidate;
    }

    // 3. Episode list: the item after/before the one matching the current URL.
    const items = [...document.querySelectorAll('[data-testid^="season-list-item-"]')];
    const currentIndex = items.findIndex((item) =>
        [...item.querySelectorAll('a[href]')].some((a) => a.pathname === window.location.pathname),
    );
    if (currentIndex !== -1) {
        const target = items[currentIndex + direction];
        const link = target?.querySelector('a[href*="/video/"]');
        if (link) return link;
    }

    logger.debug('No episode control found for direction', direction);
    return null;
}
