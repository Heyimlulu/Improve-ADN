/**
 * Detects SPA navigations on the ADN website and classifies the current page.
 *
 * ADN is a Next.js application: the content script is injected once and the
 * URL then changes without a reload. A content script cannot hook the page's
 * `history.pushState` (isolated world), so we combine `popstate` with a cheap
 * polling loop.
 *
 * Emits a `change` CustomEvent with `{ url, page, previousPage }` in `detail`.
 */

import { logger } from './logger.js';

export const PAGE = Object.freeze({
    WATCH: 'watch',
    OTHER: 'other',
});

const POLL_INTERVAL_MS = 400;

/** `/video/<show-id>-<slug>/<episode-id>-<slug>` is a playback page. */
const WATCH_PATTERN = /^\/video\/[^/]+\/\d+(?:[-/]|$)/;
const EXCLUDED_PATH_PREFIXES = ['/video/genre/', '/video/order/'];

export function classifyUrl(url = window.location.href) {
    const { hostname, pathname } = new URL(url);
    if (hostname.startsWith('news.')) return PAGE.OTHER;
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return PAGE.OTHER;
    }
    return WATCH_PATTERN.test(pathname) ? PAGE.WATCH : PAGE.OTHER;
}

export class Router extends EventTarget {
    #url = window.location.href;
    #page = classifyUrl(this.#url);
    #timer = null;
    #onPopState = () => this.#check();

    get url() {
        return this.#url;
    }

    get page() {
        return this.#page;
    }

    get isWatchPage() {
        return this.#page === PAGE.WATCH;
    }

    start() {
        if (this.#timer) return;
        window.addEventListener('popstate', this.#onPopState);
        this.#timer = window.setInterval(() => this.#check(), POLL_INTERVAL_MS);
        logger.debug('Router started on', this.#page, this.#url);
    }

    stop() {
        window.removeEventListener('popstate', this.#onPopState);
        window.clearInterval(this.#timer);
        this.#timer = null;
    }

    #check() {
        const url = window.location.href;
        if (url === this.#url) return;
        const previousPage = this.#page;
        this.#url = url;
        this.#page = classifyUrl(url);
        logger.debug('Navigation', previousPage, '->', this.#page, url);
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: { url, page: this.#page, previousPage },
            }),
        );
    }
}
