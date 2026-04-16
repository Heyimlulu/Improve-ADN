/**
 * Picture-in-Picture Button Handler
 * Manages PiP button functionality
 */

import { CSS_CLASSES } from '../../shared/constants.js';

export class PipButtonHandler {
    constructor() {
        this.appState = null;
    }

    toggle(enabled) {
        if (!this.appState?.playerControls) return;
        
        let pipButton = this.appState.playerControls.querySelector(`.${CSS_CLASSES.PIP_BUTTON}`);
        
        if (enabled) {
            if (pipButton) return;
            
            pipButton = this.createPipButton();
            this.appState.playerControls.appendChild(pipButton);
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
                } else if (this.appState?.video) {
                    await this.appState.video.requestPictureInPicture();
                }
            } catch (error) {
                console.warn('Picture-in-Picture failed:', error);
            }
        };
        
        this.appState?.addEventListenerTracked(pipButton, 'click', clickHandler);
        return pipButton;
    }

    // Method to set app state reference
    setAppState(appState) {
        this.appState = appState;
    }
}
