/**
 * ADN Improver Popup Settings Manager
 */

// Default settings (shared with content script)
const DEFAULT_SETTINGS = {
    theaterMode: false,
    hideComments: true,
    hideLastVideos: true,
    hideEpisodeSummary: true,
    playbackSpeedControl: true,
    hideThumbnails: false,
    hideScrollbar: false,
    hidePlayerDim: false,
    hideSubtitles: false,
    pipButton: true,
    maximizeOnDoubleClick: true
};

// Settings that should be saved/restored
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

/**
 * Settings Manager Class
 */
class PopupSettingsManager {
    constructor() {
        this.initializeEventListeners();
    }

    /**
     * Save all settings to chrome storage
     */
    async saveSettings() {
        try {
            const settings = {};
            
            SETTING_KEYS.forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        settings[key] = element.checked;
                    } else {
                        settings[key] = element.value;
                    }
                }
            });

            await chrome.storage.sync.set(settings);
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Restore settings from chrome storage
     */
    async restoreSettings() {
        try {
            const items = await chrome.storage.sync.get(DEFAULT_SETTINGS);
            
            SETTING_KEYS.forEach(key => {
                const element = document.getElementById(key);
                if (element && items.hasOwnProperty(key)) {
                    if (element.type === 'checkbox') {
                        element.checked = items[key];
                    } else {
                        element.value = items[key];
                    }
                }
            });
            
            console.log('Settings restored successfully');
        } catch (error) {
            console.error('Failed to restore settings:', error);
            // Fallback to default settings
            this.applyDefaultSettings();
        }
    }

    /**
     * Apply default settings to UI elements
     */
    applyDefaultSettings() {
        SETTING_KEYS.forEach(key => {
            const element = document.getElementById(key);
            if (element && DEFAULT_SETTINGS.hasOwnProperty(key)) {
                if (element.type === 'checkbox') {
                    element.checked = DEFAULT_SETTINGS[key];
                } else {
                    element.value = DEFAULT_SETTINGS[key];
                }
            }
        });
    }

    /**
     * Initialize event listeners for auto-save
     */
    initializeEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAutoSave();
            });
        } else {
            this.setupAutoSave();
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        SETTING_KEYS.forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.addEventListener('change', () => {
                    this.saveSettings();
                });
            }
        });
    }
}

// Initialize settings manager
const settingsManager = new PopupSettingsManager();

/**
 * Tab Management Class
 */
class TabManager {
    constructor() {
        this.initializeTabs();
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab-link');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab, tabs, contents);
            });
        });
    }

    switchTab(activeTab, allTabs, allContents) {
        // Remove active class from all tabs and contents
        allTabs.forEach(tab => tab.classList.remove('active'));
        allContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        activeTab.classList.add('active');
        const targetContent = document.getElementById(activeTab.dataset.tab);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }
}

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize tab management
        new TabManager();
        
        // Restore settings
        await settingsManager.restoreSettings();
        
        console.log('Popup initialized successfully');
    } catch (error) {
        console.error('Popup initialization failed:', error);
    }
});


/**
 * Backup and Restore Manager
 */
class BackupManager {
    constructor() {
        this.initializeBackupControls();
    }

    initializeBackupControls() {
        document.addEventListener('DOMContentLoaded', () => {
            const backupBtn = document.getElementById('backup');
            const restoreBtn = document.getElementById('restore');
            const restoreInput = document.getElementById('restore-input');
            const resetBtn = document.getElementById('reset');

            if (backupBtn) backupBtn.addEventListener('click', () => this.backupSettings());
            if (restoreBtn) restoreBtn.addEventListener('click', () => this.triggerRestore());
            if (restoreInput) restoreInput.addEventListener('change', (e) => this.handleRestore(e));
            if (resetBtn) resetBtn.addEventListener('click', () => this.resetSettings());
        });
    }

    async backupSettings() {
        try {
            const [syncSettings, localSettings] = await Promise.all([
                chrome.storage.sync.get(null),
                chrome.storage.local.get(null)
            ]);

            const allSettings = {
                sync: syncSettings,
                local: localSettings,
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob(
                [JSON.stringify(allSettings, null, 2)], 
                { type: 'application/json' }
            );
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `adn-improver-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('Settings backup created successfully');
        } catch (error) {
            console.error('Backup failed:', error);
            this.showNotification('Backup failed. Please try again.', 'error');
        }
    }

    triggerRestore() {
        const restoreInput = document.getElementById('restore-input');
        if (restoreInput) {
            restoreInput.click();
        }
    }

    async handleRestore(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const fileContent = await this.readFile(file);
            const settings = JSON.parse(fileContent);
            
            // Validate backup file structure
            if (!settings.sync && !settings.local) {
                throw new Error('Invalid backup file format');
            }

            // Restore settings
            const promises = [];
            if (settings.sync) {
                promises.push(chrome.storage.sync.set(settings.sync));
            }
            if (settings.local) {
                promises.push(chrome.storage.local.set(settings.local));
            }

            await Promise.all(promises);
            
            // Update UI
            await settingsManager.restoreSettings();
            
            this.showNotification('Settings restored successfully!', 'success');
            console.log('Settings restored from backup');
        } catch (error) {
            console.error('Restore failed:', error);
            this.showNotification('Error: Invalid backup file or restore failed.', 'error');
        } finally {
            // Clear the file input
            event.target.value = '';
        }
    }

    async resetSettings() {
        const confirmed = confirm(
            'Are you sure you want to reset all settings to their defaults? This cannot be undone.'
        );
        
        if (!confirmed) return;

        try {
            await Promise.all([
                chrome.storage.sync.clear(),
                chrome.storage.local.clear()
            ]);
            
            // Apply default settings to UI
            settingsManager.applyDefaultSettings();
            
            this.showNotification('All settings have been reset to defaults.', 'success');
            console.log('Settings reset to defaults');
        } catch (error) {
            console.error('Reset failed:', error);
            this.showNotification('Reset failed. Please try again.', 'error');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    showNotification(message, type = 'info') {
        // Simple notification using alert for now
        // Could be enhanced with a custom notification system
        alert(message);
    }
}

// Initialize backup manager
const backupManager = new BackupManager();

// Backup manager initialization is handled in the class constructor
