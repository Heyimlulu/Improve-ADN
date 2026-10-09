/**
 * Popup: four switches rendered from `shared/settings-schema.js`, the list of
 * always-on features and the keyboard shortcuts reference.
 */

import { ALWAYS_ON_FEATURES, SETTINGS_SCHEMA } from '../shared/settings-schema.js';
import { SettingsStore } from '../shared/storage.js';
import { SHORTCUTS } from '../shared/shortcuts.js';
import { t, localizeDom } from '../shared/i18n.js';

const store = new SettingsStore();
const inputs = new Map(); // key -> checkbox

function renderSettings() {
    const container = document.getElementById('settings');
    const template = document.getElementById('tpl-switch').content;
    for (const entry of SETTINGS_SCHEMA) {
        const row = template.firstElementChild.cloneNode(true);
        row.dataset.key = entry.key;
        row.querySelector('.row-label').textContent = t(entry.label);
        row.querySelector('.row-desc').textContent = t(entry.description);
        const input = row.querySelector('input');
        input.id = `setting-${entry.key}`;
        input.addEventListener('change', () => store.set({ [entry.key]: input.checked }));
        inputs.set(entry.key, input);
        container.append(row);
    }
}

function renderAlwaysOn() {
    const list = document.getElementById('always-on');
    for (const key of ALWAYS_ON_FEATURES) {
        const item = document.createElement('li');
        item.textContent = t(key);
        list.append(item);
    }
}

function renderShortcuts() {
    const list = document.getElementById('shortcuts');
    for (const shortcut of SHORTCUTS) {
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        const keys = document.createElement('div');
        keys.className = 'shortcut-keys';
        for (const key of shortcut.keys) {
            const kbd = document.createElement('kbd');
            kbd.textContent = key === 'Space' ? t('keySpace') : key;
            keys.append(kbd);
        }
        const label = document.createElement('div');
        label.className = 'shortcut-label';
        label.textContent = t(shortcut.label);
        row.append(keys, label);
        list.append(row);
    }
}

function applyValues() {
    for (const [key, input] of inputs) input.checked = store.get(key);
}

async function init() {
    await store.load();
    renderSettings();
    renderAlwaysOn();
    renderShortcuts();
    localizeDom();
    document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
    applyValues();
    store.onChange(applyValues);
}

init().catch((error) => console.error('[ADN Improver] popup failed to start', error));
