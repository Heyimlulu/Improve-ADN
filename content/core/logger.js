/**
 * Tiny namespaced logger. Debug output is silent unless
 * `localStorage.adnImproverDebug = '1'` is set on the page.
 */

const PREFIX = '[ADN Improver]';

function isDebugEnabled() {
    try {
        return window.localStorage.getItem('adnImproverDebug') === '1';
    } catch {
        return false;
    }
}

export const logger = {
    debug(...args) {
        if (isDebugEnabled()) console.debug(PREFIX, ...args);
    },
    info(...args) {
        console.info(PREFIX, ...args);
    },
    warn(...args) {
        console.warn(PREFIX, ...args);
    },
    error(...args) {
        console.error(PREFIX, ...args);
    },
};
