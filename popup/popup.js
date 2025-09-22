// --- Main Settings Logic ---

// Get all settings elements
const settingsToSave = [
    'theaterMode', 'playbackSpeedControl', 'pipButton', 'maximizeOnDoubleClick',
    'hideThumbnails', 'hideScrollbar', 'hidePlayerDim', 'hideSubtitles'
];

// Saves options to chrome.storage
function save_options() {
    const settings = {};
    settingsToSave.forEach(id => {
        const el = document.getElementById(id);
        if (el.type === 'checkbox') {
            settings[id] = el.checked;
        } else {
            settings[id] = el.value;
        }
    });

    chrome.storage.sync.set(settings);
}

// Restores checkbox state using the preferences stored in chrome.storage.
function restore_options() {
    const defaultSettings = {
        theaterMode: false,
        playbackSpeedControl: true,
        hideThumbnails: false,
        hideScrollbar: false,
        hidePlayerDim: false,
        hideSubtitles: false,
        pipButton: true,
        maximizeOnDoubleClick: true
    };

    chrome.storage.sync.get(defaultSettings, (items) => {
        settingsToSave.forEach(id => {
            const el = document.getElementById(id);
            if (el.type === 'checkbox') {
                el.checked = items[id];
            } else {
                el.value = items[id];
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Restore settings first
    restore_options();

    // --- Tab-Switching Logic ---
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- Auto-Save Logic ---
    settingsToSave.forEach(id => {
        document.getElementById(id).addEventListener('change', save_options);
    });
});


// --- Settings Management ---

function backupSettings() {
    Promise.all([
        new Promise(resolve => chrome.storage.sync.get(null, resolve)),
        new Promise(resolve => chrome.storage.local.get(null, resolve))
    ]).then(([syncSettings, localSettings]) => {
        const allSettings = {
            sync: syncSettings,
            local: localSettings
        };

        const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'adn-improver-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            if (settings.sync) {
                chrome.storage.sync.set(settings.sync);
            }
            if (settings.local) {
                chrome.storage.local.set(settings.local);
            }
            // Restore UI to reflect new settings
            restore_options();
            alert('Settings restored successfully!');
        } catch (error) {
            alert('Error: Invalid backup file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to their defaults? This cannot be undone.')) {
        chrome.storage.sync.clear(() => {
            chrome.storage.local.clear(() => {
                restore_options();
                alert('All settings have been reset.');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('backup').addEventListener('click', backupSettings);
    document.getElementById('restore').addEventListener('click', () => document.getElementById('restore-input').click());
    document.getElementById('restore-input').addEventListener('change', handleRestore);
    document.getElementById('reset').addEventListener('click', resetSettings);
});
