/**
 * Theater Mode Handler
 * Manages wide player mode with enhanced layout
 */

import { CSS_CLASSES, SELECTORS, TIMING } from '../../shared/constants.js';

export class TheaterModeHandler {
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
            this.addEventListenerTracked(document, 'mousemove', this.handleMouseMove);
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

    // Method to set app state reference
    setAppState(appState) {
        this.appState = appState;
        this.addEventListenerTracked = appState.addEventListenerTracked.bind(appState);
    }
}
