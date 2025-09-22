/**
 * Shared constants for ADN Improver extension
 */

// Default settings configuration
export const DEFAULT_SETTINGS = {
    theaterMode: false,
    playbackSpeedControl: true,
    hideThumbnails: false,
    hideScrollbar: false,
    hidePlayerDim: false,
    hideSubtitles: false,
    pipButton: true,
    maximizeOnDoubleClick: true
};

// Setting keys for easy iteration
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

// UI selectors
export const SELECTORS = {
    VIDEO: 'video',
    PLAYER_CONTAINER: '.video-js',
    CONTROL_BAR: '.vjs-control-bar',
    HEADER: 'header',
    MAIN_CONTENT: '[data-testid="main-content"]',
    SEASON_LIST_ITEM: '[data-testid^="season-list-item-"]',
    HOME_PAGE_ITEM: 'li[itemtype="homePage"]',
    THUMBNAIL_AREA: '.sc-2ae2f61a-4',
    MODAL_DIALOG: '.vjs-modal-dialog',
    TEXT_TRACK_DISPLAY: '.vjs-text-track-display'
};

// CSS class names
export const CSS_CLASSES = {
    THEATER_MODE: 'adn-improver-theater-mode',
    HEADER_VISIBLE: 'adn-improver-header-visible',
    HIDE_THUMBNAILS: 'adn-improver-hide-thumbnails',
    HIDE_SCROLLBAR: 'adn-improver-hide-scrollbar',
    HIDE_PLAYER_DIM: 'adn-improver-hide-player-dim',
    HIDE_SUBTITLES: 'adn-improver-hide-subtitles',
    FULLSCREEN: 'adn-improver-fullscreen',
    SPEED_CONTROL: 'adn-improver-speed-control',
    PIP_BUTTON: 'adn-improver-pip-button'
};

// Playback speeds
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Timing constants
export const TIMING = {
    VIDEO_SEARCH_INTERVAL: 500,
    HEADER_HIDE_THRESHOLD: 60,
    TRANSITION_DURATION: 300
};

// Storage keys
export const STORAGE_KEYS = {
    SETTINGS: 'settings'
};

// Error messages
export const ERROR_MESSAGES = {
    VIDEO_NOT_FOUND: 'Video element not found',
    FULLSCREEN_FAILED: 'Failed to enter fullscreen mode',
    PIP_FAILED: 'Picture-in-Picture not supported or failed',
    STORAGE_FAILED: 'Failed to access storage'
};
