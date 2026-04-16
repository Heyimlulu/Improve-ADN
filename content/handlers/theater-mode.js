/**
 * Theater Mode Handler
 * Manages wide player mode with enhanced layout
 */

import { CSS_CLASSES, SELECTORS, TIMING } from '../../shared/constants.js';
import { Utils } from '../utils/dom-utils.js';

export class TheaterModeHandler {
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
            this.addEventListenerTracked(document, 'mousemove', this.handleMouseMove);
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
        if (this.appState?.settings?.hideComments) {
            const commentsPanel = document.querySelector(SELECTORS.COMMENTS_PANEL);
            if (commentsPanel) {
                commentsPanel.style.setProperty('display', 'none', 'important');
            }
        }

        // Hide last videos section if setting is enabled
        if (this.appState?.settings?.hideLastVideos) {
            const lastVideos = document.querySelector(SELECTORS.LAST_VIDEOS);
            if (lastVideos) {
                lastVideos.style.setProperty('display', 'none', 'important');
            }
        }

        // Hide episode summary if setting is enabled
        if (this.appState?.settings?.hideEpisodeSummary) {
            this.hideEpisodeSummary();
        }
    }

    hideEpisodeSummary() {
        // Find h2 > span with episode summary title and hide the outer container
        const titleElements = document.querySelectorAll(SELECTORS.EPISODE_SUMMARY_TITLE);
        titleElements.forEach(element => {
            if (element.textContent.includes('Résumé de l\'épisode')) {
                // Find the container to hide
                let container = element.closest('div');
                const containerSelectors = ['.sc-b8623451-0.jLepGa', '.sc-b8623451-0'];
                
                for (const containerSelector of containerSelectors) {
                    const foundContainer = element.closest(containerSelector);
                    if (foundContainer) {
                        container = foundContainer;
                        break;
                    }
                }
                
                if (container && Utils.isElementSafeToHide(container)) {
                    container.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    showTheaterModeElements() {
        // Show elements that were hidden for theater mode
        const elementsToShow = [
            SELECTORS.COMMENTS_PANEL,
            SELECTORS.LAST_VIDEOS,
            SELECTORS.EPISODE_SUMMARY_TITLE
        ];

        elementsToShow.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (Utils.isElementSafeToHide(element)) {
                    element.style.removeProperty('display');
                }
            });
        });
    }

    removeTheaterModeStyles() {
        // Remove styles from video player
        const videoPlayer = document.querySelector('.video-js');
        if (videoPlayer) {
            Utils.removeStyles(videoPlayer, [
                'width', 'max-width', 'height', 'margin', 'box-shadow', 'aspect-ratio', 'object-fit'
            ]);
            
            const videoElement = videoPlayer.querySelector('video');
            if (videoElement) {
                Utils.removeStyles(videoElement, ['width', 'height', 'object-fit']);
            }
        }

        // Remove styles from detected elements
        const mainContent = this.detectedElements.get('mainContent');
        if (mainContent) {
            mainContent.style.removeProperty('width');
            mainContent.style.removeProperty('max-width');
            mainContent.style.removeProperty('margin');
            mainContent.style.removeProperty('padding');
            mainContent.style.removeProperty('box-sizing');
        }

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

    // Method to set app state reference
    setAppState(appState) {
        this.appState = appState;
        this.addEventListenerTracked = appState.addEventListenerTracked.bind(appState);
    }
}
