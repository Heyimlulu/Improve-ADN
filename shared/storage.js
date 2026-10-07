/**
 * Settings store backed by `chrome.storage.sync`.
 *
 * - `load()` must be awaited once before reading values.
 * - `get(key)` is synchronous afterwards.
 * - `set(patch)` writes to storage; every open tab (and the popup) is notified
 *   through `onChange`, including the tab that made the change.
 */

import {
    DEFAULT_SETTINGS,
    SETTINGS_BY_KEY,
    sanitizeSetting,
    sanitizeSettings,
} from './settings-schema.js';

const SYNC_AREA = 'sync';

export class SettingsStore {
    #values = { ...DEFAULT_SETTINGS };
    #listeners = new Set();
    #loaded = false;
    #storageListener = null;

    /** Read every setting from storage and start listening for changes. */
    async load() {
        if (this.#loaded) return this.#values;

        try {
            const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
            this.#values = sanitizeSettings(stored);
        } catch (error) {
            console.warn('[ADN Improver] Unable to read settings, using defaults.', error);
            this.#values = { ...DEFAULT_SETTINGS };
        }

        this.#storageListener = (changes, area) => {
            if (area !== SYNC_AREA) return;
            const applied = {};
            for (const [key, change] of Object.entries(changes)) {
                if (!SETTINGS_BY_KEY[key]) continue;
                const next = sanitizeSetting(key, change.newValue);
                if (next === this.#values[key]) continue;
                this.#values[key] = next;
                applied[key] = next;
            }
            if (Object.keys(applied).length > 0) {
                this.#emit(applied);
            }
        };
        chrome.storage.onChanged.addListener(this.#storageListener);

        this.#loaded = true;
        return this.#values;
    }

    /** Stop listening to storage changes (used by tests / teardown). */
    dispose() {
        if (this.#storageListener) {
            chrome.storage.onChanged.removeListener(this.#storageListener);
            this.#storageListener = null;
        }
        this.#listeners.clear();
        this.#loaded = false;
    }

    get(key) {
        if (!(key in SETTINGS_BY_KEY)) {
            throw new Error(`Unknown setting "${key}"`);
        }
        return this.#values[key];
    }

    /** Snapshot of every setting. */
    getAll() {
        return { ...this.#values };
    }

    /** Persist one or more settings. Unknown keys are ignored. */
    async set(patch) {
        const clean = {};
        for (const [key, value] of Object.entries(patch)) {
            if (!SETTINGS_BY_KEY[key]) continue;
            clean[key] = sanitizeSetting(key, value);
        }
        if (Object.keys(clean).length === 0) return;
        await chrome.storage.sync.set(clean);
    }

    /** Toggle a boolean setting and return the new value. */
    async toggle(key) {
        const next = !this.get(key);
        await this.set({ [key]: next });
        return next;
    }

    /** Restore every setting to its default value. */
    async reset() {
        await chrome.storage.sync.set({ ...DEFAULT_SETTINGS });
    }

    /**
     * Subscribe to changes. The callback receives an object containing only
     * the keys that changed. Returns an unsubscribe function.
     */
    onChange(callback) {
        this.#listeners.add(callback);
        return () => this.#listeners.delete(callback);
    }

    #emit(changes) {
        for (const listener of this.#listeners) {
            try {
                listener(changes);
            } catch (error) {
                console.error('[ADN Improver] Settings listener failed.', error);
            }
        }
    }
}
