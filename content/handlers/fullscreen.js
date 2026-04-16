/**
 * Fullscreen Handler with Enhanced Mode
 * Manages fullscreen functionality with double-click support
 */

import { SELECTORS } from '../../shared/constants.js';

export class FullscreenHandler {
    constructor() {
        this.dblClickHandler = this.dblClickHandler.bind(this);
        this.appState = null;
    }

    toggleDoubleClick(enabled) {
        if (enabled && this.appState?.video) {
            this.appState.addEventListenerTracked(this.appState.video, 'dblclick', this.dblClickHandler);
        } else if (this.appState?.video) {
            this.appState.video.removeEventListener('dblclick', this.dblClickHandler);
        }
    }

    async dblClickHandler() {
        try {
            const playerContainer = this.appState?.video?.closest(SELECTORS.PLAYER_CONTAINER);
            const elementToFullscreen = playerContainer || this.appState?.video;
            
            if (!document.fullscreenElement && elementToFullscreen) {
                await elementToFullscreen.requestFullscreen();
            } else if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn('Fullscreen operation failed:', error);
        }
    }

    // Method to set app state reference
    setAppState(appState) {
        this.appState = appState;
    }
}
