// Import constants (Note: In manifest v3, we'll need to use dynamic imports or inline constants)
// For now, we'll define constants inline to maintain compatibility
const DEFAULT_SETTINGS = {
    theaterMode: false,
    playbackSpeedControl: true,
    hideThumbnails: false,
    hideScrollbar: false,
    hidePlayerDim: false,
    hideSubtitles: false,
    pipButton: true,
    maximizeOnDoubleClick: true
};

const SELECTORS = {
    VIDEO: 'video',
    PLAYER_CONTAINER: '.video-js',
    CONTROL_BAR: '.vjs-control-bar',
    HEADER: 'header',
    SEASON_LIST_ITEM: '[data-testid^="season-list-item-"]',
    HOME_PAGE_ITEM: 'li[itemtype="homePage"]',
    THUMBNAIL_AREA: '.sc-2ae2f61a-4'
};

const CSS_CLASSES = {
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

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const TIMING = {
    VIDEO_SEARCH_INTERVAL: 500,
    HEADER_HIDE_THRESHOLD: 60
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
    }

    toggle(enabled) {
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
