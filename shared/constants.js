/**
 * Shared constants for ADN Improver extension
 */

// Default settings configuration
export const DEFAULT_SETTINGS = {
    // Theater mode is always active on video pages by default
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
    TEXT_TRACK_DISPLAY: '.vjs-text-track-display',
    
    // Theater mode selectors with fallbacks
    THEATER_MAIN_CONTENT: [
        '[data-testid="main-content"]',
        'main',
        '.main-content',
        '[class*="main"]',
        '[class*="content"]:not(aside):not(nav):not(header):not(footer)'
    ],
    THEATER_LAYOUT_CONTAINER: [
        '[data-testid="default-layout"]',
        '.default-layout',
        '[class*="layout"]',
        '.container',
        'main'
    ],
    THEATER_SIDEBAR: [
        '[data-testid="relatedshowlist"]',
        'aside',
        '.sidebar',
        '[class*="related"]',
        '[class*="sidebar"]'
    ],
    
    // Content hiding selectors
    COMMENTS_PANEL: 'section[data-testid="comments-panel"], #comments-panel',
    LAST_VIDEOS: 'div[data-testid="last-videos"]',
    EPISODE_SUMMARY_TITLE: 'h2 span'
};

// CSS class names
export const CSS_CLASSES = {
    THEATER_MODE: 'adn-improver-theater-mode',
    HEADER_VISIBLE: 'adn-improver-header-visible',
    HIDE_SCROLLBAR: 'adn-improver-hide-scrollbar',
    FULLSCREEN: 'adn-improver-fullscreen',
    WATCHED: 'is-watched'
};

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

// Episode summary container selectors (hierarchical priority)
export const EPISODE_SUMMARY_CONTAINERS = [
    '.sc-b8623451-0.jLepGa',
    '.sc-b8623451-0',
    'div[class*="w-[320px]"]',
    'div[class*="inline-block"]'
];

// Text content constants
export const TEXT_CONTENT = {
    EPISODE_SUMMARY_TITLE: 'Résumé de l\'épisode'
};

// Video safety check selectors
export const VIDEO_SAFETY_SELECTORS = [
    '.video-js',
    '[class*="video"]',
    '[class*="player"]'
];

// Error messages
export const ERROR_MESSAGES = {
    VIDEO_NOT_FOUND: 'Video element not found',
    FULLSCREEN_FAILED: 'Failed to enter fullscreen mode',
    PIP_FAILED: 'Picture-in-Picture not supported or failed',
    STORAGE_FAILED: 'Failed to access storage'
};
