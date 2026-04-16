// Import shared constants from the constants file
let DEFAULT_SETTINGS, SELECTORS, CSS_CLASSES, PLAYBACK_SPEEDS, TIMING, 
    EPISODE_SUMMARY_CONTAINERS, TEXT_CONTENT, VIDEO_SAFETY_SELECTORS;

// Initialize constants from shared file
async function initializeConstants() {
    try {
        const constants = await import(chrome.runtime.getURL('shared/constants.js'));
        DEFAULT_SETTINGS = constants.DEFAULT_SETTINGS;
        SELECTORS = constants.SELECTORS;
        CSS_CLASSES = constants.CSS_CLASSES;
        PLAYBACK_SPEEDS = constants.PLAYBACK_SPEEDS;
        TIMING = constants.TIMING;
        EPISODE_SUMMARY_CONTAINERS = constants.EPISODE_SUMMARY_CONTAINERS;
        TEXT_CONTENT = constants.TEXT_CONTENT;
        VIDEO_SAFETY_SELECTORS = constants.VIDEO_SAFETY_SELECTORS;
        
        console.log('ADN Improver: Constants loaded successfully');
    } catch (error) {
        console.error('ADN Improver: Failed to load constants, using fallback', error);
        // Fallback constants in case import fails
        initializeFallbackConstants();
    }
}

function initializeFallbackConstants() {
    DEFAULT_SETTINGS = {
        theaterMode: false,
        playbackSpeedControl: true,
        hideScrollbar: false,
        pipButton: true
    };
    
    SELECTORS = {
        VIDEO: 'video',
        PLAYER_CONTAINER: '.video-js',
        CONTROL_BAR: '.vjs-control-bar',
        HEADER: 'header',
        THEATER_MAIN_CONTENT: ['[data-testid="main-content"]', 'main'],
        THEATER_LAYOUT_CONTAINER: ['[data-testid="default-layout"]', '.default-layout'],
        THEATER_SIDEBAR: ['[data-testid="relatedshowlist"]', 'aside'],
        COMMENTS_PANEL: 'section[data-testid="comments-panel"], #comments-panel',
        LAST_VIDEOS: 'div[data-testid="last-videos"]',
        EPISODE_SUMMARY_TITLE: 'h2 span'
    };
    
    CSS_CLASSES = {
        THEATER_MODE: 'adn-improver-theater-mode',
        HEADER_VISIBLE: 'adn-improver-header-visible',
        HIDE_SCROLLBAR: 'adn-improver-hide-scrollbar',
        FULLSCREEN: 'adn-improver-fullscreen',
        SPEED_CONTROL: 'adn-improver-speed-control',
        PIP_BUTTON: 'adn-improver-pip-button',
        WATCHED: 'is-watched'
    };
    
    PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    TIMING = { VIDEO_SEARCH_INTERVAL: 500, HEADER_HIDE_THRESHOLD: 60 };
    EPISODE_SUMMARY_CONTAINERS = ['.sc-b8623451-0.jLepGa', '.sc-b8623451-0'];
    TEXT_CONTENT = { EPISODE_SUMMARY_TITLE: 'Résumé de l\'épisode' };
    VIDEO_SAFETY_SELECTORS = ['.video-js', '[class*="video"]', '[class*="player"]'];
}

// Utility functions
const Utils = {
    /**
     * Find element using fallback selectors
     * @param {string[]} selectors - Array of selectors to try
     * @param {string} elementType - Type of element for logging
     * @returns {Element|null} - Found element or null
     */
    findElementWithFallback(selectors, elementType = 'element') {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Found ${elementType} using selector: ${selector}`);
                return element;
            }
        }
        console.warn(`No ${elementType} found with any selector`);
        return null;
    },

    /**
     * Check if element is safe to hide (not video-related)
     * @param {Element} element - Element to check
     * @returns {boolean} - True if safe to hide
     */
    isElementSafeToHide(element) {
        return !element.classList.contains('video-js') && 
               !element.closest('.video-js') &&
               !element.querySelector('.video-js') &&
               !element.querySelector('video') &&
               !VIDEO_SAFETY_SELECTORS.some(selector => 
                   element.closest(selector) || element.querySelector(selector)
               );
    },

    /**
     * Apply styles to element with error handling
     * @param {Element} element - Element to style
     * @param {Object} styles - Styles to apply
     */
    applyStyles(element, styles) {
        if (!element) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            element.style.setProperty(property, value, 'important');
        });
    },

    /**
     * Remove styles from element
     * @param {Element} element - Element to clean
     * @param {string[]} properties - Properties to remove
     */
    removeStyles(element, properties) {
        if (!element) return;
        
        properties.forEach(property => {
            element.style.removeProperty(property);
        });
    }
};

// Application state
class ADNImproverState {
    constructor() {
        this.settings = {};
        this.video = null;
        this.playerControls = null;
        this.observers = [];
        this.eventListeners = [];
    }

    cleanup() {
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Disconnect all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    addEventListenerTracked(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
}

const appState = new ADNImproverState();

// --- FEATURE HANDLERS ---

/**
 * Theater Mode Handler
 */
class TheaterModeHandler {
    constructor() {
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.detectedElements = new Map();
        this.isActive = false;
    }

    /**
     * Check if current URL is a video playback page
     * Theater mode should only work on video playback pages like:
     * https://animationdigitalnetwork.com/video/[show-name]/[episode-id]
     * 
     * NOT on:
     * - Genre pages: /video/genre/*
     * - News pages: news.animationdigitalnetwork.com
     * - Popular pages: /video/order/popular
     */
    isVideoPlaybackPage() {
        const url = window.location.href;
        const pathname = window.location.pathname;
        
        // Exclude news subdomain
        if (url.includes('news.animationdigitalnetwork.com')) {
            return false;
        }
        
        // Exclude genre pages
        if (pathname.includes('/video/genre/')) {
            return false;
        }
        
        // Exclude order/popular pages
        if (pathname.includes('/video/order/')) {
            return false;
        }
        
        // Check if it's a video playback page pattern: /video/[show]/[episode-id]
        const videoPagePattern = /\/video\/[^\/]+\/\d+/;
        return videoPagePattern.test(pathname);
    }

    toggle(enabled) {
        // Only allow theater mode on video playback pages
        if (enabled && !this.isVideoPlaybackPage()) {
            console.log('Theater mode is only available on video playback pages');
            return;
        }
        
        this.isActive = enabled;
        document.body.classList.toggle(CSS_CLASSES.THEATER_MODE, enabled);
        if (enabled) {
            appState.addEventListenerTracked(document, 'mousemove', this.handleMouseMove);
        } else {
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.querySelector(SELECTORS.HEADER)?.classList.remove(CSS_CLASSES.HEADER_VISIBLE);
        }
    }

    handleMouseMove(e) {
        const header = document.querySelector(SELECTORS.HEADER);
        if (!header) return;
        
        if (e.clientY < TIMING.HEADER_HIDE_THRESHOLD) {
            header.classList.add(CSS_CLASSES.HEADER_VISIBLE);
        } else if (!header.matches(':hover')) {
            header.classList.remove(CSS_CLASSES.HEADER_VISIBLE);
        }
    }
}

const theaterModeHandler = new TheaterModeHandler();

/**
 * Playback Speed Control Handler
 */
class PlaybackSpeedHandler {
    toggle(enabled) {
        let speedControl = appState.playerControls?.querySelector(`.${CSS_CLASSES.SPEED_CONTROL}`);
        
        if (enabled) {
            if (speedControl) return; // Already exists
            
            speedControl = this.createSpeedControl();
            appState.playerControls?.prepend(speedControl);
        } else {
            speedControl?.remove();
        }
    }

    createSpeedControl() {
        const speedControl = document.createElement('select');
        speedControl.className = CSS_CLASSES.SPEED_CONTROL;
        
        PLAYBACK_SPEEDS.forEach(speed => {
            const option = document.createElement('option');
            option.value = speed;
            option.innerText = `${speed}x`;
            if (speed === 1) option.selected = true;
            speedControl.appendChild(option);
        });
        
        const changeHandler = (e) => {
            if (appState.video) {
                appState.video.playbackRate = parseFloat(e.target.value);
            }
        };
        
        appState.addEventListenerTracked(speedControl, 'change', changeHandler);
        return speedControl;
    }
}

const playbackSpeedHandler = new PlaybackSpeedHandler();

/**
 * Picture-in-Picture Button Handler
 */
class PipButtonHandler {
    toggle(enabled) {
        let pipButton = appState.playerControls?.querySelector(`.${CSS_CLASSES.PIP_BUTTON}`);
        
        if (enabled) {
            if (pipButton) return;
            
            pipButton = this.createPipButton();
            appState.playerControls?.appendChild(pipButton);
        } else {
            pipButton?.remove();
        }
    }

    createPipButton() {
        const pipButton = document.createElement('button');
        pipButton.innerText = 'PiP';
        pipButton.className = CSS_CLASSES.PIP_BUTTON;
        
        const clickHandler = async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (appState.video) {
                    await appState.video.requestPictureInPicture();
                }
            } catch (error) {
                console.warn('Picture-in-Picture failed:', error);
            }
        };
        
        appState.addEventListenerTracked(pipButton, 'click', clickHandler);
        return pipButton;
    }
}

const pipButtonHandler = new PipButtonHandler();


/**
 * UI Tweaks Handler
 */
class UITweaksHandler {
    apply(settings) {
        // Apply scrollbar hiding to both html and body elements
        const hideScrollbar = settings.hideScrollbar;
        document.documentElement.classList.toggle(CSS_CLASSES.HIDE_SCROLLBAR, hideScrollbar);
        document.body.classList.toggle(CSS_CLASSES.HIDE_SCROLLBAR, hideScrollbar);
    }
}

const uiTweaksHandler = new UITweaksHandler();


/**
 * Settings Manager
 */
class SettingsManager {
    applyAllSettings(settings) {
        appState.settings = { ...settings };
        
        // Apply all feature settings
        theaterModeHandler.toggle(settings.theaterMode);
        playbackSpeedHandler.toggle(settings.playbackSpeedControl);
        pipButtonHandler.toggle(settings.pipButton);
        uiTweaksHandler.apply(settings);
    }

    handleSettingChange(key, newValue) {
        appState.settings[key] = newValue;
        
        switch (key) {
            case 'theaterMode':
                theaterModeHandler.toggle(newValue);
                break;
            case 'playbackSpeedControl':
                playbackSpeedHandler.toggle(newValue);
                break;
            case 'pipButton':
                pipButtonHandler.toggle(newValue);
                break;
            case 'hideScrollbar':
                uiTweaksHandler.apply(appState.settings);
                break;
        }
    }
}

const settingsManager = new SettingsManager();

/**
 * Application Initializer
 */
class ADNImproverApp {
    /**
     * Check if current page is a video playback page
     */
    isVideoPlaybackPage() {
        const pathname = window.location.pathname;
        const videoPagePattern = /\/video\/[^\/]+\/\d+/;
        return videoPagePattern.test(pathname);
    }

    async init() {
        try {
            // Initialize constants first
            await initializeConstants();
            
            // Only search for video element on video playback pages
            if (this.isVideoPlaybackPage()) {
                await this.findVideoElement();
            } else {
                console.log('ADN Improver: Not a video playback page, skipping video element search');
                // Ensure theater mode is disabled on non-video pages
                this.disableTheaterModeOnNonVideoPages();
            }
            
            // Load and apply settings (works on all pages)
            await this.loadSettings();
            
            // Setup storage change listener
            this.setupStorageListener();
            
            // Setup navigation listener to handle page changes
            this.setupNavigationListener();
            
            console.log('ADN Improver initialized successfully');
        } catch (error) {
            console.error('ADN Improver initialization failed:', error);
        }
    }

    async findVideoElement() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds max
            
            const find = () => {
                const video = document.querySelector(SELECTORS.VIDEO);
                if (video) {
                    appState.video = video;
                    appState.playerControls = video.closest(SELECTORS.PLAYER_CONTAINER)
                        ?.querySelector(SELECTORS.CONTROL_BAR);
                    console.log('ADN Improver: Video element found');
                    resolve(video);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(find, TIMING.VIDEO_SEARCH_INTERVAL);
                } else {
                    console.warn('ADN Improver: Video element not found after maximum attempts');
                    reject(new Error('Video element not found after maximum attempts'));
                }
            };
            find();
        });
    }


    async loadSettings() {
        try {
            const syncData = await chrome.storage.sync.get(DEFAULT_SETTINGS);
            settingsManager.applyAllSettings(syncData);
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            settingsManager.applyAllSettings(DEFAULT_SETTINGS);
        }
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                for (const [key, { newValue }] of Object.entries(changes)) {
                    settingsManager.handleSettingChange(key, newValue);
                }
            }
        });
    }

    setupNavigationListener() {
        // Listen for URL changes (SPA navigation)
        let lastUrl = window.location.href;
        
        const observer = new MutationObserver(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                this.handleNavigation();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        appState.observers.push(observer);
    }

    handleNavigation() {
        console.log('ADN Improver: Page navigation detected');
        
        // If we're on a video playback page, enable theater mode if setting is enabled
        if (this.isVideoPlaybackPage()) {
            // Re-apply theater mode setting on video pages
            if (appState.settings.theaterMode) {
                console.log('ADN Improver: Enabling theater mode on video page');
                theaterModeHandler.toggle(true);
            }
        } else {
            // If we're not on a video playback page, disable theater mode
            this.disableTheaterModeOnNonVideoPages();
        }
    }

    disableTheaterModeOnNonVideoPages() {
        // Force disable theater mode CSS class
        if (document.body.classList.contains(CSS_CLASSES.THEATER_MODE)) {
            console.log('ADN Improver: Disabling theater mode on non-video page');
            document.body.classList.remove(CSS_CLASSES.THEATER_MODE);
            theaterModeHandler.isActive = false;
            
            // Remove header visible class
            const header = document.querySelector(SELECTORS.HEADER);
            if (header) {
                header.classList.remove(CSS_CLASSES.HEADER_VISIBLE);
            }
        }
    }

    cleanup() {
        appState.cleanup();
    }
}

// Initialize the application
const adnImproverApp = new ADNImproverApp();
adnImproverApp.init();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    adnImproverApp.cleanup();
});
