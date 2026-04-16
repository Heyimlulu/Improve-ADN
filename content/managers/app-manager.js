/**
 * Application Manager
 * Main application initialization and lifecycle management
 */

import { DEFAULT_SETTINGS, SELECTORS, TIMING } from '../../shared/constants.js';

export class ADNImproverApp {
    constructor(settingsManager, appState) {
        this.settingsManager = settingsManager;
        this.appState = appState;
    }

    async init() {
        try {
            // Initialize constants first
            await this.initializeConstants();
            
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

    async initializeConstants() {
        // Constants are already imported, but we can add any dynamic initialization here
        console.log('ADN Improver: Constants initialized');
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
            console.warn('Failed to load settings, using defaults:', error);
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

    cleanup() {
        this.appState.cleanup();
    }
}
