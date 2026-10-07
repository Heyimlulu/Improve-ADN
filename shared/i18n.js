/**
 * Thin wrapper around `chrome.i18n` that never throws and falls back to the
 * message key, so a missing translation is visible instead of silent.
 */

export function t(key, substitutions) {
    try {
        const message = chrome.i18n.getMessage(key, substitutions);
        return message || key;
    } catch {
        return key;
    }
}

/**
 * Translate every element carrying a `data-i18n` attribute in `root`.
 * data-i18n=<messageKey> sets textContent;
 * data-i18n-attr=<attribute>:<messageKey>[,<attribute>:<messageKey>] sets attributes.
 */
export function localizeDom(root = document) {
    for (const element of root.querySelectorAll('[data-i18n]')) {
        element.textContent = t(element.dataset.i18n);
    }
    for (const element of root.querySelectorAll('[data-i18n-attr]')) {
        for (const pair of element.dataset.i18nAttr.split(',')) {
            const [attribute, key] = pair.split(':').map((part) => part.trim());
            if (attribute && key) element.setAttribute(attribute, t(key));
        }
    }
}
