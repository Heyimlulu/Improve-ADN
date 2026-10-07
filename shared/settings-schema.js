/**
 * Single source of truth for every user setting.
 *
 * Both the popup (to render the controls) and the content script (to read
 * values and react to changes) import this file. Adding a new setting means
 * adding ONE entry here plus its label in `_locales/<lang>/messages.json`.
 *
 * Field reference:
 *  - key          : storage key (chrome.storage.sync)
 *  - type         : 'boolean' | 'select' | 'number'
 *  - default      : value used when nothing is stored / value is invalid
 *  - section      : popup tab the setting belongs to
 *  - label        : i18n message key for the title
 *  - description  : (optional) i18n message key for the helper text
 *  - options      : (select) array of { value, label } where label is an i18n key
 *  - min/max/step : (number) bounds used both for the input and for sanitising
 *  - dependsOn    : (optional) key of a boolean setting that must be true for this
 *                   setting to be relevant (popup greys it out when false)
 */

export const SECTIONS = [
    { id: 'player', label: 'sectionPlayer' },
    { id: 'shortcuts', label: 'sectionShortcuts' },
    { id: 'interface', label: 'sectionInterface' },
];

export const SETTINGS_SCHEMA = [
    // ------------------------------------------------------------ Player --
    {
        key: 'theaterMode',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingTheaterMode',
        description: 'settingTheaterModeDesc',
    },
    {
        key: 'theaterSize',
        type: 'select',
        default: 'fill',
        section: 'player',
        label: 'settingTheaterSize',
        dependsOn: 'theaterMode',
        options: [
            { value: 'fill', label: 'theaterSizeFill' },
            { value: 'fit', label: 'theaterSizeFit' },
        ],
    },
    {
        key: 'theaterHeaderOnHover',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingHeaderOnHover',
        description: 'settingHeaderOnHoverDesc',
        dependsOn: 'theaterMode',
    },
    {
        key: 'theaterButton',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingTheaterButton',
        description: 'settingTheaterButtonDesc',
    },
    {
        key: 'playerGradient',
        type: 'select',
        default: 'withControls',
        section: 'player',
        label: 'settingPlayerGradient',
        description: 'settingPlayerGradientDesc',
        options: [
            { value: 'native', label: 'playerGradientNative' },
            { value: 'withControls', label: 'playerGradientWithControls' },
            { value: 'hidden', label: 'playerGradientHidden' },
        ],
    },
    {
        key: 'pauseOverlay',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingPauseOverlay',
        description: 'settingPauseOverlayDesc',
    },
    {
        key: 'playbackRateMenu',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingPlaybackRateMenu',
        description: 'settingPlaybackRateMenuDesc',
    },
    {
        key: 'rememberPlaybackRate',
        type: 'boolean',
        default: false,
        section: 'player',
        label: 'settingRememberPlaybackRate',
        description: 'settingRememberPlaybackRateDesc',
    },
    {
        key: 'pipButton',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingPipButton',
        description: 'settingPipButtonDesc',
    },
    {
        key: 'osd',
        type: 'boolean',
        default: true,
        section: 'player',
        label: 'settingOsd',
        description: 'settingOsdDesc',
    },

    // --------------------------------------------------------- Shortcuts --
    {
        key: 'shortcuts',
        type: 'boolean',
        default: true,
        section: 'shortcuts',
        label: 'settingShortcuts',
        description: 'settingShortcutsDesc',
    },
    {
        key: 'seekStep',
        type: 'number',
        default: 5,
        min: 1,
        max: 60,
        step: 1,
        section: 'shortcuts',
        label: 'settingSeekStep',
        description: 'settingSeekStepDesc',
        dependsOn: 'shortcuts',
    },
    {
        key: 'seekStepLarge',
        type: 'number',
        default: 10,
        min: 1,
        max: 300,
        step: 1,
        section: 'shortcuts',
        label: 'settingSeekStepLarge',
        description: 'settingSeekStepLargeDesc',
        dependsOn: 'shortcuts',
    },
    {
        key: 'volumeStep',
        type: 'number',
        default: 5,
        min: 1,
        max: 50,
        step: 1,
        section: 'shortcuts',
        label: 'settingVolumeStep',
        description: 'settingVolumeStepDesc',
        dependsOn: 'shortcuts',
    },

    // --------------------------------------------------------- Interface --
    {
        key: 'hideScrollbar',
        type: 'boolean',
        default: false,
        section: 'interface',
        label: 'settingHideScrollbar',
        description: 'settingHideScrollbarDesc',
    },
];

/** Map of key -> schema entry, handy for lookups. */
export const SETTINGS_BY_KEY = Object.fromEntries(
    SETTINGS_SCHEMA.map((entry) => [entry.key, entry]),
);

/** Map of key -> default value. */
export const DEFAULT_SETTINGS = Object.fromEntries(
    SETTINGS_SCHEMA.map((entry) => [entry.key, entry.default]),
);

/**
 * Coerce an arbitrary stored value into a valid value for the given setting.
 * Invalid or missing values fall back to the default.
 */
export function sanitizeSetting(key, value) {
    const entry = SETTINGS_BY_KEY[key];
    if (!entry) return undefined;

    switch (entry.type) {
        case 'boolean':
            return typeof value === 'boolean' ? value : entry.default;
        case 'select':
            return entry.options.some((option) => option.value === value)
                ? value
                : entry.default;
        case 'number': {
            const number = Number(value);
            if (!Number.isFinite(number)) return entry.default;
            const min = entry.min ?? -Infinity;
            const max = entry.max ?? Infinity;
            return Math.min(max, Math.max(min, number));
        }
        default:
            return entry.default;
    }
}

/** Sanitise a whole settings object, dropping unknown keys. */
export function sanitizeSettings(raw = {}) {
    const result = {};
    for (const entry of SETTINGS_SCHEMA) {
        result[entry.key] = sanitizeSetting(entry.key, raw[entry.key]);
    }
    return result;
}
