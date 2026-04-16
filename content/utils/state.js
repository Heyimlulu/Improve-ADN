/**
 * Application State Manager
 * Centralized state management for the extension
 */

export class ADNImproverState {
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

    addObserver(observer) {
        this.observers.push(observer);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
    }
}
