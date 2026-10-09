/**
 * Popup: a grid of tiles. Four tiles are switches rendered from
 * `shared/settings-schema.js`; two more open the shortcuts reference and the
 * list of always-on features.
 */

import { ALWAYS_ON_FEATURES, SETTINGS_SCHEMA } from '../shared/settings-schema.js';
import { SettingsStore } from '../shared/storage.js';
import { SHORTCUTS } from '../shared/shortcuts.js';
import { ICONS } from '../shared/icons.js';
import { t, localizeDom } from '../shared/i18n.js';

const INFO_TILES = [
    { view: 'shortcuts', icon: 'list', label: 'shortcutsListTitle' },
    { view: 'included', icon: 'checkCircle', label: 'alwaysOnTitle' },
];

const store = new SettingsStore();
const switchTiles = new Map(); // key -> tile button

function svgIcon(name) {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', ICONS[name]);
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
    return svg;
}

function createTile({ icon, label, description }) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    if (description) tile.title = t(description);
    const badge = document.createElement('span');
    badge.className = 'tile-icon';
    badge.append(svgIcon(icon));
    const text = document.createElement('span');
    text.className = 'tile-label';
    text.textContent = t(label);
    tile.append(badge, text);
    return tile;
}

function renderTiles() {
    const grid = document.getElementById('tiles');
    for (const entry of SETTINGS_SCHEMA) {
        const tile = createTile(entry);
        tile.classList.add('tile-switch');
        tile.dataset.key = entry.key;
        tile.setAttribute('role', 'switch');
        tile.addEventListener('click', () => store.toggle(entry.key));
        switchTiles.set(entry.key, tile);
        grid.append(tile);
    }
    for (const info of INFO_TILES) {
        const tile = createTile(info);
        tile.classList.add('tile-info');
        tile.addEventListener('click', () => showView(info.view));
        grid.append(tile);
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

function renderAlwaysOn() {
    const list = document.getElementById('always-on');
    for (const key of ALWAYS_ON_FEATURES) {
        const item = document.createElement('li');
        item.textContent = t(key);
        list.append(item);
    }
}

function applyValues() {
    for (const [key, tile] of switchTiles) {
        const on = store.get(key);
        tile.classList.toggle('is-on', on);
        tile.setAttribute('aria-checked', String(on));
    }
}

function showView(name) {
    for (const view of document.querySelectorAll('.view')) {
        view.classList.toggle('is-active', view.id === `view-${name}`);
    }
}

async function init() {
    await store.load();
    renderTiles();
    renderShortcuts();
    renderAlwaysOn();
    localizeDom();
    for (const button of document.querySelectorAll('[data-back]')) {
        button.append(svgIcon('back'));
        button.addEventListener('click', () => showView('home'));
    }
    document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
    applyValues();
    store.onChange(applyValues);
}

init().catch((error) => console.error('[ADN Improver] popup failed to start', error));
