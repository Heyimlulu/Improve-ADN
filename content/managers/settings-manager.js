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
        
        // Theater mode is always active on video pages - no settings to apply
    }

    handleSettingChange(key, newValue) {
        this.appState.setSetting(key, newValue);
        
        // No settings to handle currently
    }
}
