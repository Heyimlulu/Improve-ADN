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
        hideComments: true,
        hideLastVideos: true,
        hideEpisodeSummary: true,
        playbackSpeedControl: true,
        hideThumbnails: false,
        hideScrollbar: false,
        hidePlayerDim: false,
        hideSubtitles: false,
        pipButton: true,
        maximizeOnDoubleClick: true
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
        HIDE_THUMBNAILS: 'adn-improver-hide-thumbnails',
        HIDE_SCROLLBAR: 'adn-improver-hide-scrollbar',
        HIDE_PLAYER_DIM: 'adn-improver-hide-player-dim',
        HIDE_SUBTITLES: 'adn-improver-hide-subtitles',
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

    toggle(enabled) {
        this.isActive = enabled;
        document.body.classList.toggle(CSS_CLASSES.THEATER_MODE, enabled);
        if (enabled) {
            this.detectAndCacheElements();
            appState.addEventListenerTracked(document, 'mousemove', this.handleMouseMove);
            this.applyTheaterModeStyles();
        } else {
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.querySelector(SELECTORS.HEADER)?.classList.remove(CSS_CLASSES.HEADER_VISIBLE);
            this.removeTheaterModeStyles();
        }
    }

    detectAndCacheElements() {
        // Detect main content area with fallback selectors
        const mainContent = Utils.findElementWithFallback(
            SELECTORS.THEATER_MAIN_CONTENT, 
            'main content'
        );
        if (mainContent) {
            this.detectedElements.set('mainContent', mainContent);
        }

        // Detect layout container with fallback selectors
        const layoutContainer = Utils.findElementWithFallback(
            SELECTORS.THEATER_LAYOUT_CONTAINER, 
            'layout container'
        );
        if (layoutContainer) {
            this.detectedElements.set('layoutContainer', layoutContainer);
        }

        // Detect sidebar with fallback selectors
        const sidebar = Utils.findElementWithFallback(
            SELECTORS.THEATER_SIDEBAR, 
            'sidebar'
        );
        if (sidebar) {
            this.detectedElements.set('sidebar', sidebar);
        }
    }

    applyTheaterModeStyles() {
        // Optimized theater mode with container-matching width
        const videoPlayer = document.querySelector('.video-js');
        if (videoPlayer) {
            videoPlayer.style.setProperty('width', '100%', 'important');
            videoPlayer.style.setProperty('max-width', 'none', 'important');
            videoPlayer.style.setProperty('height', 'auto', 'important');
            videoPlayer.style.setProperty('margin', '1rem auto', 'important');
            videoPlayer.style.setProperty('box-shadow', '0 4px 20px rgba(0, 0, 0, 0.3)', 'important');
            videoPlayer.style.setProperty('aspect-ratio', '16/9', 'important');
            videoPlayer.style.setProperty('object-fit', 'contain', 'important');
            
            // Also apply to the video element inside
            const videoElement = videoPlayer.querySelector('video');
            if (videoElement) {
                videoElement.style.setProperty('width', '100%', 'important');
                videoElement.style.setProperty('height', '100%', 'important');
                videoElement.style.setProperty('object-fit', 'contain', 'important');
            }
        }

        // Apply comfortable layout changes to detected elements
        const mainContent = this.detectedElements.get('mainContent');
        if (mainContent) {
            mainContent.style.setProperty('width', '100%', 'important');
            mainContent.style.setProperty('max-width', '100%', 'important');
            mainContent.style.setProperty('margin', '0', 'important');
            mainContent.style.setProperty('padding', '0 2rem', 'important');
            mainContent.style.setProperty('box-sizing', 'border-box', 'important');
        }

        const sidebar = this.detectedElements.get('sidebar');
        if (sidebar) {
            sidebar.style.setProperty('width', '100%', 'important');
            sidebar.style.setProperty('max-width', 'none', 'important');
            sidebar.style.setProperty('margin', '2rem auto 0 auto', 'important');
            sidebar.style.setProperty('padding', '0 2rem', 'important');
            sidebar.style.setProperty('box-sizing', 'border-box', 'important');
        }

        // Hide additional content sections in theater mode
        this.hideTheaterModeElements();
    }

    hideTheaterModeElements() {
        // Hide comments panel if setting is enabled
        if (appState.settings.hideComments) {
            const commentsPanel = document.querySelector(SELECTORS.COMMENTS_PANEL);
            if (commentsPanel) {
                commentsPanel.style.setProperty('display', 'none', 'important');
            }
        }

        // Hide last videos section if setting is enabled
        if (appState.settings.hideLastVideos) {
            const lastVideos = document.querySelector(SELECTORS.LAST_VIDEOS);
            if (lastVideos) {
                lastVideos.style.setProperty('display', 'none', 'important');
            }
        }

        // Hide episode summary if setting is enabled
        if (appState.settings.hideEpisodeSummary) {
            this.hideEpisodeSummary();
        }
    }

    hideEpisodeSummary() {
        // Find h2 > span with episode summary title and hide the outer container
        const titleElements = document.querySelectorAll(SELECTORS.EPISODE_SUMMARY_TITLE);
        titleElements.forEach(span => {
            if (span.textContent && span.textContent.trim() === TEXT_CONTENT.EPISODE_SUMMARY_TITLE) {
                // Find the outermost container using hierarchical selectors
                const containerToHide = this.findEpisodeSummaryContainer(span);
                
                if (containerToHide && Utils.isElementSafeToHide(containerToHide)) {
                    containerToHide.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    findEpisodeSummaryContainer(span) {
        // Find container using hierarchical priority
        for (const selector of EPISODE_SUMMARY_CONTAINERS) {
            const container = span.closest(selector);
            if (container) return container;
        }
        return null;
    }

    showTheaterModeElements() {
        // Show comments panel
        const commentsPanel = document.querySelector(SELECTORS.COMMENTS_PANEL);
        if (commentsPanel) {
            commentsPanel.style.removeProperty('display');
        }

        // Show last videos section
        const lastVideos = document.querySelector(SELECTORS.LAST_VIDEOS);
        if (lastVideos) {
            lastVideos.style.removeProperty('display');
        }

        // Show episode summary
        this.showEpisodeSummary();
    }

    showEpisodeSummary() {
        // Find h2 > span with episode summary title and show the outer container
        const titleElements = document.querySelectorAll(SELECTORS.EPISODE_SUMMARY_TITLE);
        titleElements.forEach(span => {
            if (span.textContent && span.textContent.trim() === TEXT_CONTENT.EPISODE_SUMMARY_TITLE) {
                // Find the outermost container using hierarchical selectors
                const containerToShow = this.findEpisodeSummaryContainer(span);
                
                if (containerToShow && Utils.isElementSafeToHide(containerToShow)) {
                    containerToShow.style.removeProperty('display');
                }
            }
        });
    }

    removeTheaterModeStyles() {
        // Restore video player styles
        const videoPlayer = document.querySelector('.video-js');
        if (videoPlayer) {
            videoPlayer.style.removeProperty('width');
            videoPlayer.style.removeProperty('max-width');
            videoPlayer.style.removeProperty('height');
            videoPlayer.style.removeProperty('margin');
            videoPlayer.style.removeProperty('box-shadow');
            videoPlayer.style.removeProperty('aspect-ratio');
            videoPlayer.style.removeProperty('object-fit');
            
            // Also restore the video element inside
            const videoElement = videoPlayer.querySelector('video');
            if (videoElement) {
                videoElement.style.removeProperty('width');
                videoElement.style.removeProperty('height');
                videoElement.style.removeProperty('object-fit');
            }
        }

        // Restore main content
        const mainContent = this.detectedElements.get('mainContent');
        if (mainContent) {
            mainContent.style.removeProperty('width');
            mainContent.style.removeProperty('max-width');
            mainContent.style.removeProperty('margin');
            mainContent.style.removeProperty('padding');
            mainContent.style.removeProperty('box-sizing');
        }

        // Restore sidebar
        const sidebar = this.detectedElements.get('sidebar');
        if (sidebar) {
            sidebar.style.removeProperty('width');
            sidebar.style.removeProperty('max-width');
            sidebar.style.removeProperty('margin');
            sidebar.style.removeProperty('padding');
            sidebar.style.removeProperty('box-sizing');
        }

        // Restore hidden elements
        this.showTheaterModeElements();

        this.detectedElements.clear();
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
 * Fullscreen Handler with Enhanced Mode
 */
class FullscreenHandler {
    constructor() {
        this.dblClickHandler = this.dblClickHandler.bind(this);
    }

    toggleDoubleClick(enabled) {
        if (enabled && appState.video) {
            appState.addEventListenerTracked(appState.video, 'dblclick', this.dblClickHandler);
        } else if (appState.video) {
            appState.video.removeEventListener('dblclick', this.dblClickHandler);
        }
    }

    async dblClickHandler() {
        try {
            const playerContainer = appState.video?.closest(SELECTORS.PLAYER_CONTAINER);
            const elementToFullscreen = playerContainer || appState.video;
            
            if (!document.fullscreenElement && elementToFullscreen) {
                await elementToFullscreen.requestFullscreen();
            } else if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn('Fullscreen operation failed:', error);
        }
    }

}

const fullscreenHandler = new FullscreenHandler();

/**
 * UI Tweaks Handler
 */
class UITweaksHandler {
    apply(settings) {
        // Apply UI toggle classes
        document.body.classList.toggle(CSS_CLASSES.HIDE_THUMBNAILS, settings.hideThumbnails);
        document.body.classList.toggle(CSS_CLASSES.HIDE_PLAYER_DIM, settings.hidePlayerDim);
        document.body.classList.toggle(CSS_CLASSES.HIDE_SUBTITLES, settings.hideSubtitles);
        
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
        fullscreenHandler.toggleDoubleClick(settings.maximizeOnDoubleClick);
        uiTweaksHandler.apply(settings);
    }

    handleSettingChange(key, newValue) {
        appState.settings[key] = newValue;
        
        switch (key) {
            case 'theaterMode':
                theaterModeHandler.toggle(newValue);
                break;
            case 'hideComments':
            case 'hideLastVideos':
            case 'hideEpisodeSummary':
                // If theater mode is active, reapply the styles to reflect changes
                if (theaterModeHandler.isActive) {
                    // First restore elements, then apply new settings
                    theaterModeHandler.showTheaterModeElements();
                    theaterModeHandler.hideTheaterModeElements();
                }
                break;
            case 'playbackSpeedControl':
                playbackSpeedHandler.toggle(newValue);
                break;
            case 'pipButton':
                pipButtonHandler.toggle(newValue);
                break;
            case 'maximizeOnDoubleClick':
                fullscreenHandler.toggleDoubleClick(newValue);
                break;
            case 'hideThumbnails':
            case 'hideScrollbar':
            case 'hidePlayerDim':
            case 'hideSubtitles':
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
    async init() {
        try {
            // Initialize constants first
            await initializeConstants();
            
            // Find video element and controls
            await this.findVideoElement();
            
            // Load and apply settings
            await this.loadSettings();
            
            // Setup storage change listener
            this.setupStorageListener();
            
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
