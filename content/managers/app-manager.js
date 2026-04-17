/**
 * Application Manager
 * Main application initialization and lifecycle management
 */

import { DEFAULT_SETTINGS, SELECTORS, TIMING, CSS_CLASSES } from '../../shared/constants.js';

export class ADNImproverApp {
    constructor(settingsManager, appState) {
        this.settingsManager = settingsManager;
        this.appState = appState;
    }

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
            await this.initializeConstants();
            
            // Only search for video element on video playback pages
            if (this.isVideoPlaybackPage()) {
                await this.findVideoElement();
                // Enable theater mode automatically on video pages
                if (this.settingsManager.handlers?.theaterMode) {
                    this.settingsManager.handlers.theaterMode.toggle(true);
                }
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

    async initializeConstants() {
        // Constants are already imported, but we can add any dynamic initialization here
    }

    async findVideoElement() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds max
            
            const find = () => {
                const video = document.querySelector(SELECTORS.VIDEO);
                if (video) {
                    this.appState.video = video;
                    this.appState.playerControls = video.closest(SELECTORS.PLAYER_CONTAINER)
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
            this.settingsManager.applyAllSettings(syncData);
        } catch (error) {
            this.settingsManager.applyAllSettings(DEFAULT_SETTINGS);
        }
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                for (const [key, { newValue }] of Object.entries(changes)) {
                    this.settingsManager.handleSettingChange(key, newValue);
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
        
        this.appState.observers.push(observer);
    }

        handleNavigation() {
        
        // Always enable theater mode on video playback pages
        if (this.isVideoPlaybackPage()) {
            if (this.settingsManager.handlers?.theaterMode) {
                this.settingsManager.handlers.theaterMode.toggle(true);
            }
        } else {
            // If we're not on a video playback page, disable theater mode
            this.disableTheaterModeOnNonVideoPages();
        }
    }

    disableTheaterModeOnNonVideoPages() {
        // Force disable theater mode CSS class
        if (document.body.classList.contains(CSS_CLASSES.THEATER_MODE)) {
            document.body.classList.remove(CSS_CLASSES.THEATER_MODE);
            
            // Update theater mode handler state if available
            if (this.settingsManager.handlers?.theaterMode) {
                this.settingsManager.handlers.theaterMode.isActive = false;
            }
            
            // Remove header visible class
            const header = document.querySelector(SELECTORS.HEADER);
            if (header) {
                header.classList.remove(CSS_CLASSES.HEADER_VISIBLE);
            }
        }
    }

    cleanup() {
        this.appState.cleanup();
    }
}
