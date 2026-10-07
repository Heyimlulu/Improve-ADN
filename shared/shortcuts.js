/**
 * Keyboard shortcuts reference, shared by the in-player help overlay (`?`)
 * and the popup. `label` is an i18n key; `param` names the setting whose value
 * is injected as `$1` in the label.
 */

export const SHORTCUTS = Object.freeze([
    { keys: ['Space', 'K'], label: 'shortcutPlayPause' },
    { keys: ['←', '→'], label: 'shortcutSeek', param: 'seekStep' },
    { keys: ['J', 'L'], label: 'shortcutSeekLarge', param: 'seekStepLarge' },
    { keys: ['Shift + ←', 'Shift + →'], label: 'shortcutSeekLarge', param: 'seekStepLarge' },
    { keys: ['↑', '↓'], label: 'shortcutVolume', param: 'volumeStep' },
    { keys: ['M'], label: 'shortcutMute' },
    { keys: ['F'], label: 'shortcutFullscreen' },
    { keys: ['T'], label: 'shortcutTheater' },
    { keys: ['P'], label: 'shortcutPip' },
    { keys: ['<', '>'], label: 'shortcutRate' },
    { keys: ['0 … 9'], label: 'shortcutSeekPercent' },
    { keys: ['Shift + N'], label: 'shortcutNextEpisode' },
    { keys: ['Shift + P'], label: 'shortcutPreviousEpisode' },
    { keys: ['?'], label: 'shortcutHelp' },
]);
