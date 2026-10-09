/**
 * Single source of truth for user settings.
 *
 * The extension deliberately exposes very few switches: everything that is
 * safe to leave on (speed menu, Picture-in-Picture button, theater button,
 * on-screen feedback, gradient fix) is always active. Only behaviours that
 * change how the page looks or reacts get a toggle.
 *
 * Both the popup (to render the switches) and the content script (to read
 * values and react to changes) import this file. To add a setting: add an
 * entry here and its labels in `_locales/<lang>/messages.json`.
 *
 *  - key         : storage key (chrome.storage.sync)
 *  - default     : value used when nothing is stored / value is invalid
 *  - label       : i18n message key for the title
 *  - description : i18n message key for the helper text
 */

export const SETTINGS_SCHEMA = [
    {
        key: 'theaterMode',
        default: true,
        label: 'settingTheaterMode',
        description: 'settingTheaterModeDesc',
    },
    {
        key: 'pauseOverlay',
        default: true,
        label: 'settingPauseOverlay',
        description: 'settingPauseOverlayDesc',
    },
    {
        key: 'shortcuts',
        default: true,
        label: 'settingShortcuts',
        description: 'settingShortcutsDesc',
    },
    {
        key: 'hideScrollbar',
        default: false,
        label: 'settingHideScrollbar',
        description: 'settingHideScrollbarDesc',
    },
];

/** Features that are always on, listed in the popup for information. */
export const ALWAYS_ON_FEATURES = [
    'alwaysOnTheaterButton',
    'alwaysOnPlaybackRate',
    'alwaysOnPip',
    'alwaysOnGradient',
    'alwaysOnOsd',
];

/** Map of key -> schema entry. */
export const SETTINGS_BY_KEY = Object.fromEntries(SETTINGS_SCHEMA.map((entry) => [entry.key, entry]));

/** Map of key -> default value. */
export const DEFAULT_SETTINGS = Object.fromEntries(SETTINGS_SCHEMA.map((entry) => [entry.key, entry.default]));

/** Coerce a stored value into a valid boolean for the given setting. */
export function sanitizeSetting(key, value) {
    const entry = SETTINGS_BY_KEY[key];
    if (!entry) return undefined;
    return typeof value === 'boolean' ? value : entry.default;
}

/** Sanitise a whole settings object, dropping unknown keys. */
export function sanitizeSettings(raw = {}) {
    const result = {};
    for (const entry of SETTINGS_SCHEMA) {
        result[entry.key] = sanitizeSetting(entry.key, raw[entry.key]);
    }
    return result;
}
