/**
 * DOM helpers shared by every feature.
 */

/** First element matching any selector of the list, in order of preference. */
export function queryFirst(selectors, root = document) {
    for (const selector of [].concat(selectors)) {
        const element = root.querySelector(selector);
        if (element) return element;
    }
    return null;
}

/**
 * Create an element with attributes / classes / children in one call.
 * `props.class` may be a string or array; `props.text` sets textContent;
 * `props.dataset` sets data-* attributes; everything else is set as attribute.
 */
export function createElement(tag, props = {}, children = []) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
        if (value === undefined || value === null || value === false) continue;
        if (name === 'class') {
            element.className = [].concat(value).filter(Boolean).join(' ');
        } else if (name === 'text') {
            element.textContent = value;
        } else if (name === 'html') {
            element.innerHTML = value;
        } else if (name === 'dataset') {
            Object.assign(element.dataset, value);
        } else if (name === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(name, value === true ? '' : String(value));
        }
    }
    for (const child of [].concat(children)) {
        if (child === null || child === undefined) continue;
        element.append(child);
    }
    return element;
}

/** Create an inline SVG icon from a path `d` attribute (24x24 viewBox). */
export function createSvgIcon(paths, { size = 24, className = '' } = {}) {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (className) svg.setAttribute('class', className);
    for (const d of [].concat(paths)) {
        const path = document.createElementNS(svgNs, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'currentColor');
        svg.append(path);
    }
    return svg;
}

/** Set or remove a `data-*` attribute on <html>. `null`/`false` removes it. */
export function setRootAttribute(name, value) {
    const root = document.documentElement;
    if (value === null || value === undefined || value === false) {
        root.removeAttribute(name);
    } else {
        root.setAttribute(name, value === true ? 'true' : String(value));
    }
}

/** Is the event target a place where the user is typing? */
export function isTypingTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Debounce with trailing call. */
export function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

/** Run `fn` at most once per animation frame. */
export function rafThrottle(fn) {
    let scheduled = false;
    return (...args) => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            fn(...args);
        });
    };
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/** Format seconds as m:ss or h:mm:ss. */
export function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
