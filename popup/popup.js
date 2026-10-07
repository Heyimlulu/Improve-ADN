/**
 * Popup: renders the settings from `shared/settings-schema.js`, saves them
 * on change and offers backup / restore / reset.
 */

import { SECTIONS, SETTINGS_SCHEMA, sanitizeSettings } from '../shared/settings-schema.js';
import { SettingsStore } from '../shared/storage.js';
import { SHORTCUTS } from '../shared/shortcuts.js';
import { t, localizeDom } from '../shared/i18n.js';

const MANAGE_SECTION = { id: 'manage', label: 'sectionManage' };
const ACTIVE_TAB_KEY = 'adnImproverPopupTab';
const BACKUP_FORMAT = 'adn-improver-settings';

const store = new SettingsStore();
const controls = new Map(); // key -> input element

/** @param {HTMLElement} element */
function show(element, visible) {
    element.hidden = !visible;
}

function template(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('is-visible'), 2200);
}

// ------------------------------------------------------------- Rendering --

function renderTabs() {
    const tabs = document.getElementById('tabs');
    for (const section of [...SECTIONS, MANAGE_SECTION]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tab';
        button.role = 'tab';
        button.dataset.section = section.id;
        button.textContent = t(section.label);
        button.addEventListener('click', () => activateTab(section.id));
        tabs.append(button);
    }
}

function renderSections() {
    const content = document.getElementById('content');
    for (const section of SECTIONS) {
        const panel = document.createElement('section');
        panel.className = 'panel';
        panel.dataset.section = section.id;
        panel.role = 'tabpanel';
        for (const entry of SETTINGS_SCHEMA.filter((item) => item.section === section.id)) {
            panel.append(renderSetting(entry));
        }
        if (section.id === 'shortcuts') panel.append(renderShortcutList());
        content.append(panel);
    }

    const manage = document.createElement('section');
    manage.className = 'panel';
    manage.dataset.section = MANAGE_SECTION.id;
    manage.append(document.getElementById('tpl-manage').content.cloneNode(true));
    content.append(manage);
}

function renderSetting(entry) {
    const row = template(`tpl-${entry.type === 'boolean' ? 'switch' : entry.type}`);
    row.dataset.key = entry.key;
    if (entry.dependsOn) row.dataset.dependsOn = entry.dependsOn;
    row.querySelector('.row-label').textContent = t(entry.label);
    const description = row.querySelector('.row-desc');
    if (entry.description) description.textContent = t(entry.description);
    else description.remove();

    const input = row.querySelector('input, select');
    input.id = `setting-${entry.key}`;

    if (entry.type === 'select') {
        for (const option of entry.options) {
            const element = document.createElement('option');
            element.value = option.value;
            element.textContent = t(option.label);
            input.append(element);
        }
    } else if (entry.type === 'number') {
        input.min = entry.min;
        input.max = entry.max;
        input.step = entry.step ?? 1;
    }

    input.addEventListener('change', () => {
        const value = entry.type === 'boolean' ? input.checked : entry.type === 'number' ? Number(input.value) : input.value;
        store.set({ [entry.key]: value });
    });

    controls.set(entry.key, input);
    return row;
}

function renderShortcutList() {
    const card = document.createElement('section');
    card.className = 'card card-shortcuts';
    const title = document.createElement('h2');
    title.textContent = t('shortcutsListTitle');
    card.append(title);

    const list = document.createElement('div');
    list.className = 'shortcut-list';
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
        label.dataset.label = shortcut.label;
        if (shortcut.param) label.dataset.param = shortcut.param;
        row.append(keys, label);
        list.append(row);
    }
    card.append(list);
    return card;
}

function refreshShortcutLabels() {
    for (const label of document.querySelectorAll('.shortcut-label')) {
        const substitutions = label.dataset.param ? [String(store.get(label.dataset.param))] : undefined;
        label.textContent = t(label.dataset.label, substitutions);
    }
}

// ----------------------------------------------------------------- State --

function applyValues() {
    for (const entry of SETTINGS_SCHEMA) {
        const input = controls.get(entry.key);
        const value = store.get(entry.key);
        if (entry.type === 'boolean') input.checked = value;
        else input.value = String(value);
    }
    for (const row of document.querySelectorAll('[data-depends-on]')) {
        row.classList.toggle('is-disabled', !store.get(row.dataset.dependsOn));
    }
    refreshShortcutLabels();
}

function activateTab(sectionId) {
    for (const tab of document.querySelectorAll('.tab')) {
        const active = tab.dataset.section === sectionId;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
    }
    for (const panel of document.querySelectorAll('.panel')) {
        show(panel, panel.dataset.section === sectionId);
    }
    try {
        localStorage.setItem(ACTIVE_TAB_KEY, sectionId);
    } catch {
        /* storage may be unavailable, the tab simply is not remembered */
    }
}

// ------------------------------------------------------ Backup / restore --

function downloadBackup() {
    try {
        const payload = {
            format: BACKUP_FORMAT,
            version: chrome.runtime.getManifest().version,
            exportedAt: new Date().toISOString(),
            settings: store.getAll(),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `adn-improver-settings-${payload.exportedAt.slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
        toast(t('backupFailed'));
    }
}

async function restoreBackup(file) {
    try {
        const parsed = JSON.parse(await file.text());
        // Accept both the current format and a raw settings object.
        const raw = parsed?.format === BACKUP_FORMAT ? parsed.settings : parsed?.settings ?? parsed;
        if (!raw || typeof raw !== 'object') throw new Error('Invalid backup');
        await store.set(sanitizeSettings(raw));
        toast(t('restoreDone'));
    } catch {
        toast(t('restoreFailed'));
    }
}

function bindManageActions() {
    document.getElementById('backup').addEventListener('click', downloadBackup);
    const input = document.getElementById('restore-input');
    document.getElementById('restore').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
        if (input.files[0]) await restoreBackup(input.files[0]);
        input.value = '';
    });
    document.getElementById('reset').addEventListener('click', async () => {
        if (!confirm(t('confirmReset'))) return;
        await store.reset();
        toast(t('resetDone'));
    });
}

// ------------------------------------------------------------------ Init --

async function init() {
    await store.load();

    renderTabs();
    renderSections();
    localizeDom();
    bindManageActions();

    const { version } = chrome.runtime.getManifest();
    document.getElementById('version').textContent = `v${version}`;
    document.getElementById('about-version').textContent = t('version', [version]);

    applyValues();
    store.onChange(applyValues);

    let initialTab = SECTIONS[0].id;
    try {
        initialTab = localStorage.getItem(ACTIVE_TAB_KEY) || initialTab;
    } catch {
        /* ignore */
    }
    if (!document.querySelector(`.panel[data-section="${initialTab}"]`)) initialTab = SECTIONS[0].id;
    activateTab(initialTab);
}

init().catch((error) => console.error('[ADN Improver] popup failed to start', error));
