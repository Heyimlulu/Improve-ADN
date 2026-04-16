/**
 * Playback Speed Control Handler
 * Manages video playback speed controls
 */

import { CSS_CLASSES, PLAYBACK_SPEEDS } from '../../shared/constants.js';

export class PlaybackSpeedHandler {
    constructor() {
        this.appState = null;
    }

    toggle(enabled) {
        if (!this.appState?.playerControls) return;
        
        let speedControl = this.appState.playerControls.querySelector(`.${CSS_CLASSES.SPEED_CONTROL}`);
        
        if (enabled) {
            if (speedControl) return; // Already exists
            
            speedControl = this.createSpeedControl();
            this.appState.playerControls.prepend(speedControl);
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
            if (this.appState?.video) {
                this.appState.video.playbackRate = parseFloat(e.target.value);
            }
        };
        
        this.appState?.addEventListenerTracked(speedControl, 'change', changeHandler);
        return speedControl;
    }

    // Method to set app state reference
    setAppState(appState) {
        this.appState = appState;
    }
}
