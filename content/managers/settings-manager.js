/**
 * Settings Manager
 * Handles settings application and change management
 */

export class SettingsManager {
    constructor(handlers, appState) {
        this.handlers = handlers;
        this.appState = appState;
    }

    applyAllSettings(settings) {
        this.appState.updateSettings(settings);
        
        // Apply all feature settings
        this.handlers.theaterMode?.toggle(settings.theaterMode);
        this.handlers.playbackSpeed?.toggle(settings.playbackSpeedControl);
        this.handlers.pipButton?.toggle(settings.pipButton);
        this.handlers.uiTweaks?.apply(settings);
    }

    handleSettingChange(key, newValue) {
        this.appState.setSetting(key, newValue);
        
        switch (key) {
            case 'theaterMode':
                this.handlers.theaterMode?.toggle(newValue);
                break;
            case 'playbackSpeedControl':
                this.handlers.playbackSpeed?.toggle(newValue);
                break;
            case 'pipButton':
                this.handlers.pipButton?.toggle(newValue);
                break;
            case 'hideScrollbar':
                this.handlers.uiTweaks?.apply(this.appState.settings);
                break;
        }
    }
}
