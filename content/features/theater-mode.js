/**
 * Theater mode.
 *
 * Goal: the player fills the viewport (width and height) while the rest of
 * the page (episode list, summary, comments...) stays reachable by scrolling,
 * exactly like Crunchyroll's theater mode. The header is taken out of the flow
 * and slides back in when the mouse reaches the top of the window or when the
 * user scrolls past the player.
 *
 * ADN's markup uses hashed class names, so the layout is discovered at runtime:
 *
 *   1. `wrapper`  : the outermost ancestor of `.video-js` whose box is only the
 *                   player (same width, no other visible sibling). It is the
 *                   element stretched to the viewport.
 *   2. `inner`    : elements between the wrapper and `.video-js`; they are made
 *                   transparent to the layout so the player fills the wrapper.
 *   3. `chain`    : every ancestor of `wrapper` up to <body>; they must not clip
 *                   the stretched wrapper (`overflow: visible`).
 *   4. `row`      : the first ancestor that lays out something *next to* the
 *                   player (e.g. a sidebar). It is switched to a vertical flow so
 *                   the sidebar moves under the player.
 *
 * Marks are `data-adn-theater-*` attributes; all visual rules live in
 * `styles/theater.css` under `html[data-adn-theater]`.
 */

import { Feature } from '../core/feature.js';
import { queryFirst, rafThrottle, setRootAttribute } from '../core/dom.js';

const MARKS = Object.freeze({
    WRAPPER: 'data-adn-theater-wrapper',
    INNER: 'data-adn-theater-inner',
    CHAIN: 'data-adn-theater-chain',
    ROW: 'data-adn-theater-row',
    COLUMN: 'data-adn-theater-column',
    ASIDE: 'data-adn-theater-aside',
    HEADER: 'data-adn-theater-header',
});

const HEADER_SELECTORS = ['body > header', 'header', '[data-testid*="header" i]', 'body > nav'];
const HEADER_HOVER_ZONE_PX = 64;
const RELAYOUT_DELAYS_MS = [0, 600, 2500];
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT']);
const WIDTH_TOLERANCE_PX = 8;

export class TheaterMode extends Feature {
    static id = 'theater-mode';
    settingKeys = ['theaterMode', 'theaterSize', 'theaterHeaderOnHover'];

    #marked = new Set();
    #wrapper = null;
    #header = null;
    #relayoutTimers = [];
    #mouseNearTop = false;
    #scrolledPastPlayer = false;

    #updateMetrics = rafThrottle(() => this.#measure());
    #onMouseMove = (event) => {
        const nearTop = event.clientY <= HEADER_HOVER_ZONE_PX;
        if (nearTop !== this.#mouseNearTop) {
            this.#mouseNearTop = nearTop;
            this.#updateHeaderVisibility();
        }
    };
    #onScroll = rafThrottle(() => {
        const wrapper = this.#wrapper;
        if (!wrapper) return;
        const headerHeight = this.#header?.getBoundingClientRect().height ?? 0;
        const scrolledPast = wrapper.getBoundingClientRect().bottom <= headerHeight;
        if (scrolledPast !== this.#scrolledPastPlayer) {
            this.#scrolledPastPlayer = scrolledPast;
            this.#updateHeaderVisibility();
        }
    });

    onEnable() {
        this.#applyRootAttributes();
        this.#markHeader();

        this.onEachVideo((_video, container, scope) => {
            this.#scheduleRelayout(container);
            scope.add(() => this.#clearLayout());
        });
        this.addCleanup(() => this.#cancelRelayouts());
        this.listen(window, 'resize', this.#updateMetrics, { passive: true });
        this.listen(document, 'mousemove', this.#onMouseMove, { passive: true });
        this.listen(window, 'scroll', this.#onScroll, { passive: true });

        // Bring the player into view when the mode is switched on near the top.
        if (window.scrollY < window.innerHeight / 2) window.scrollTo({ top: 0 });
    }

    onDisable() {
        this.#clearLayout();
        this.#header?.removeAttribute(MARKS.HEADER);
        this.#header = null;
        setRootAttribute('data-adn-theater', null);
        setRootAttribute('data-adn-header-hover', null);
        setRootAttribute('data-adn-header', null);
        setRootAttribute('data-adn-measuring', null);
        document.documentElement.style.removeProperty('--adn-vw');
    }

    onSettingsChange() {
        if (this.enabled) this.#applyRootAttributes();
    }

    // ----------------------------------------------------------- Layout --

    #applyRootAttributes() {
        const { settings } = this.ctx;
        setRootAttribute('data-adn-theater', settings.get('theaterSize'));
        setRootAttribute('data-adn-header-hover', settings.get('theaterHeaderOnHover'));
        this.#updateHeaderVisibility();
    }

    #markHeader() {
        const header = queryFirst(HEADER_SELECTORS);
        if (!header) return;
        this.#header = header;
        header.setAttribute(MARKS.HEADER, '');
    }

    #scheduleRelayout(container) {
        this.#cancelRelayouts();
        for (const delay of RELAYOUT_DELAYS_MS) {
            this.#relayoutTimers.push(
                window.setTimeout(() => {
                    if (this.enabled && container.isConnected) this.#layout(container);
                }, delay),
            );
        }
    }

    #cancelRelayouts() {
        for (const timer of this.#relayoutTimers.splice(0)) window.clearTimeout(timer);
    }

    /** Discover the layout around `container` (the `.video-js` element). */
    #layout(container) {
        this.#clearLayout();

        // Measure with theater CSS switched off so sizes reflect the native
        // layout. Transitions are suspended meanwhile (see theater.css) so the
        // forced style recalculation does not animate anything.
        const root = document.documentElement;
        const theaterValue = root.getAttribute('data-adn-theater');
        root.setAttribute('data-adn-measuring', '');
        root.removeAttribute('data-adn-theater');

        try {
            const wrapper = this.#findWrapper(container);
            this.#mark(wrapper, MARKS.WRAPPER);
            this.#wrapper = wrapper;

            // Elements between the wrapper and the player must let it fill the stage.
            for (let inner = container.parentElement; inner && inner !== wrapper; inner = inner.parentElement) {
                this.#mark(inner, MARKS.INNER);
            }

            const wrapperRect = wrapper.getBoundingClientRect();
            let rowFound = false;
            let child = wrapper;
            for (let parent = wrapper.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                this.#mark(parent, MARKS.CHAIN);
                if (!rowFound) {
                    const asides = this.#findAsides(parent, child, wrapperRect);
                    if (asides.length > 0) {
                        rowFound = true;
                        this.#mark(parent, MARKS.ROW);
                        this.#mark(child, MARKS.COLUMN);
                        for (const aside of asides) this.#mark(aside, MARKS.ASIDE);
                    }
                }
                child = parent;
            }
        } finally {
            if (theaterValue !== null) root.setAttribute('data-adn-theater', theaterValue);
            requestAnimationFrame(() => root.removeAttribute('data-adn-measuring'));
        }

        this.#measure();
        this.#onScroll();
    }

    /**
     * Outermost ancestor of the player whose box is just the player: same
     * width as its child and no other visible, in-flow sibling.
     */
    #findWrapper(container) {
        let wrapper = container;
        for (;;) {
            const parent = wrapper.parentElement;
            if (!parent || parent === document.body || parent.tagName === 'MAIN') break;

            const parentWidth = parent.getBoundingClientRect().width;
            const wrapperWidth = wrapper.getBoundingClientRect().width;
            if (parentWidth > wrapperWidth + WIDTH_TOLERANCE_PX) break;

            const hasOtherContent = [...parent.children].some(
                (child) => child !== wrapper && this.#isInFlowContent(child),
            );
            if (hasOtherContent) break;

            wrapper = parent;
        }
        return wrapper;
    }

    /** Children of `parent` (other than `child`) displayed beside the player. */
    #findAsides(parent, child, wrapperRect) {
        return [...parent.children].filter((sibling) => {
            if (sibling === child || !this.#isInFlowContent(sibling)) return false;
            const rect = sibling.getBoundingClientRect();
            const beside =
                rect.left >= wrapperRect.right - WIDTH_TOLERANCE_PX ||
                rect.right <= wrapperRect.left + WIDTH_TOLERANCE_PX;
            const verticallyOverlapping = rect.bottom > wrapperRect.top && rect.top < wrapperRect.bottom;
            return beside && verticallyOverlapping;
        });
    }

    #isInFlowContent(element) {
        if (IGNORED_TAGS.has(element.tagName)) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') {
            return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    #mark(element, attribute) {
        element.setAttribute(attribute, '');
        this.#marked.add(element);
    }

    #clearLayout() {
        this.#cancelRelayouts();
        for (const element of this.#marked) {
            for (const attribute of Object.values(MARKS)) {
                if (attribute !== MARKS.HEADER) element.removeAttribute(attribute);
            }
            element.style.removeProperty('--adn-theater-shift');
        }
        this.#marked.clear();
        this.#wrapper = null;
        this.#scrolledPastPlayer = false;
        this.#updateHeaderVisibility();
    }

    /**
     * Feed the CSS with the real viewport width (excluding the scrollbar) and
     * the horizontal shift needed for the wrapper to start at x = 0.
     */
    #measure() {
        if (!this.enabled) return;
        document.documentElement.style.setProperty('--adn-vw', `${document.documentElement.clientWidth}px`);

        const wrapper = this.#wrapper;
        if (!wrapper?.isConnected) return;
        const currentShift = parseFloat(wrapper.style.getPropertyValue('--adn-theater-shift')) || 0;
        const left = wrapper.getBoundingClientRect().left;
        const shift = Math.round(currentShift - left);
        wrapper.style.setProperty('--adn-theater-shift', `${shift}px`);
    }

    // ----------------------------------------------------------- Header --

    #updateHeaderVisibility() {
        if (!this.enabled) return;
        const hoverAllowed = this.ctx.settings.get('theaterHeaderOnHover');
        const visible = this.#scrolledPastPlayer || (hoverAllowed && this.#mouseNearTop);
        setRootAttribute('data-adn-header', visible ? 'visible' : 'hidden');
    }
}
