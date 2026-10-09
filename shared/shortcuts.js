/**
 * Keyboard shortcuts: the values used by the content script and the
 * reference list shown in the in-player help (`?`) and in the popup.
 */

/** Seconds moved by the arrow keys. */
export const SEEK_STEP = 5;
/** Seconds moved by J / L and Shift + arrows. */
export const SEEK_STEP_LARGE = 10;
/** Volume change (0..1) for the up / down arrows. */
export const VOLUME_STEP = 0.05;
/** Playback rate change for < and >. */
export const PLAYBACK_RATE_STEP = 0.25;

/** `label` is an i18n key. */
export const SHORTCUTS = Object.freeze([
    { keys: ['Space', 'K'], label: 'shortcutPlayPause' },
    { keys: ['←', '→'], label: 'shortcutSeek' },
    { keys: ['J', 'L', 'Shift + ←', 'Shift + →'], label: 'shortcutSeekLarge' },
    { keys: ['↑', '↓'], label: 'shortcutVolume' },
    { keys: ['M'], label: 'shortcutMute' },
    { keys: ['F'], label: 'shortcutFullscreen' },
    { keys: ['T'], label: 'shortcutTheater' },
    { keys: ['P'], label: 'shortcutPip' },
    { keys: ['<', '>'], label: 'shortcutRate' },
    { keys: ['0 … 9'], label: 'shortcutSeekPercent' },
    { keys: ['Shift + N', 'Shift + P'], label: 'shortcutEpisodes' },
    { keys: ['?'], label: 'shortcutHelp' },
]);
