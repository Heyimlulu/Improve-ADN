// Import shared constants from the constants file
let DEFAULT_SETTINGS, SELECTORS, CSS_CLASSES, TIMING, 
    EPISODE_SUMMARY_CONTAINERS, TEXT_CONTENT, VIDEO_SAFETY_SELECTORS;

// Initialize constants from shared file
async function initializeConstants() {
    try {
        const constants = await import(chrome.runtime.getURL('shared/constants.js'));
        DEFAULT_SETTINGS = constants.DEFAULT_SETTINGS;
        SELECTORS = constants.SELECTORS;
        CSS_CLASSES = constants.CSS_CLASSES;
        TIMING = constants.TIMING;
        EPISODE_SUMMARY_CONTAINERS = constants.EPISODE_SUMMARY_CONTAINERS;
        TEXT_CONTENT = constants.TEXT_CONTENT;
        VIDEO_SAFETY_SELECTORS = constants.VIDEO_SAFETY_SELECTORS;
    } catch (error) {
        // Fallback constants in case import fails
        initializeFallbackConstants();
    }
}

function initializeFallbackConstants() {
    DEFAULT_SETTINGS = {
        // Theater mode is always active on video pages by default
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
                return element;
            }
        }
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
 * Pause Overlay Handler
 * Shows a black overlay when video is paused
 */
class PauseOverlayHandler {
    constructor() {
        this.overlay = null;
        this.videoElement = null;
        this.handlePlay = this.handlePlay.bind(this);
        this.handlePause = this.handlePause.bind(this);
    }

    init(video) {
        if (!video) return;
        
        this.videoElement = video;
        
        // Create overlay element
        this.createOverlay();
        
        // Add event listeners
        appState.addEventListenerTracked(video, 'play', this.handlePlay);
        appState.addEventListenerTracked(video, 'pause', this.handlePause);
        
        // Set initial state
        if (video.paused) {
            this.showOverlay();
        }
    }

    createOverlay() {
        // Find the video player container
        const playerContainer = this.videoElement.closest('.video-js');
        if (!playerContainer) return;
        
        // Create overlay div
        this.overlay = document.createElement('div');
        this.overlay.className = 'adn-improver-pause-overlay';
        
        // Extract and add episode title
        this.addEpisodeTitle();
        
        // Insert overlay into player container
        playerContainer.appendChild(this.overlay);
    }

    addEpisodeTitle() {
        // Find the h1 title element
        const h1Element = document.querySelector('h1.sc-c71a35ae-3');
        if (!h1Element) return;
        
        // Extract episode title and show name
        const episodeSpan = h1Element.querySelector('span.sc-c71a35ae-5');
        const showLink = h1Element.querySelector('a.sc-c71a35ae-4');
        
        if (episodeSpan || showLink) {
            const titleContainer = document.createElement('div');
            titleContainer.className = 'adn-improver-overlay-title';
            
            if (showLink) {
                const showName = document.createElement('div');
                showName.className = 'adn-improver-overlay-show';
                showName.textContent = showLink.textContent;
                titleContainer.appendChild(showName);
            }
            
            if (episodeSpan) {
                const episodeName = document.createElement('div');
                episodeName.className = 'adn-improver-overlay-episode';
                episodeName.textContent = episodeSpan.textContent.trim();
                titleContainer.appendChild(episodeName);
            }
            
            this.overlay.appendChild(titleContainer);
        }
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('visible');
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('visible');
        }
    }

    handlePlay() {
        this.hideOverlay();
    }

    handlePause() {
        this.showOverlay();
    }

    cleanup() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.videoElement = null;
    }
}

const pauseOverlayHandler = new PauseOverlayHandler();

/**
 * Settings Manager
 */
class SettingsManager {
    applyAllSettings(settings) {
        appState.settings = { ...settings };
        
        // Theater mode is always active on video pages - no toggle needed
    }

    handleSettingChange(key, newValue) {
        appState.settings[key] = newValue;
        
        // No settings to handle currently
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
                // Enable theater mode automatically on video pages
                theaterModeHandler.toggle(true);
            } else {
                // Ensure theater mode is disabled on non-video pages
                this.disableTheaterModeOnNonVideoPages();
            }
            
            // Load and apply settings (works on all pages)
            await this.loadSettings();
            
            // Setup storage change listener
            this.setupStorageListener();
            
            // Setup navigation listener to handle page changes
            this.setupNavigationListener();
        } catch (error) {
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
                    
                    // Initialize pause overlay handler
                    pauseOverlayHandler.init(video);
                    
                    resolve(video);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(find, TIMING.VIDEO_SEARCH_INTERVAL);
                } else {
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
        // Always enable theater mode on video playback pages
        if (this.isVideoPlaybackPage()) {
            theaterModeHandler.toggle(true);
        } else {
            // If we're not on a video playback page, disable theater mode
            this.disableTheaterModeOnNonVideoPages();
        }
    }

    disableTheaterModeOnNonVideoPages() {
        // Force disable theater mode CSS class
        if (document.body.classList.contains(CSS_CLASSES.THEATER_MODE)) {
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
        pauseOverlayHandler.cleanup();
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
