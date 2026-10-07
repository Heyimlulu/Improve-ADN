/**
 * Content script entry point (ES module, loaded by `content.js`).
 *
 * Wires the shared services together and starts every feature:
 *
 *   SettingsStore  -> user preferences (chrome.storage.sync)
 *   Router         -> SPA navigation + page classification
 *   PlayerWatcher  -> finds the video.js player on watch pages
 *   Osd            -> on-screen feedback inside the player
 *   PlayerActions  -> play / seek / volume / rate / fullscreen / PiP ...
 *
 * Features receive this context and manage their own lifecycle (see
 * `core/feature.js`). To add a feature: create a class in `features/`,
 * register it in `FEATURES` below, add its settings to
 * `shared/settings-schema.js` and its CSS to `styles/`.
 */

import { SettingsStore } from '../shared/storage.js';
import { Router } from './core/router.js';
import { PlayerWatcher } from './core/player.js';
import { Osd } from './core/osd.js';
import { PlayerActions } from './core/actions.js';
import { logger } from './core/logger.js';
import { setRootAttribute } from './core/dom.js';

import { TheaterMode } from './features/theater-mode.js';
import { TheaterButton } from './features/theater-button.js';
import { PlayerGradient } from './features/player-gradient.js';
import { PauseOverlay } from './features/pause-overlay.js';
import { PlaybackRate } from './features/playback-rate.js';
import { PictureInPicture } from './features/picture-in-picture.js';
import { Shortcuts } from './features/shortcuts.js';
import { HideScrollbar } from './features/hide-scrollbar.js';

/**
 * @typedef {object} AppContext
 * @property {SettingsStore} settings
 * @property {Router} router
 * @property {PlayerWatcher} player
 * @property {Osd} osd
 * @property {PlayerActions} actions
 */

const FEATURES = [
    TheaterMode,
    TheaterButton,
    PlayerGradient,
    PauseOverlay,
    PlaybackRate,
    PictureInPicture,
    Shortcuts,
    HideScrollbar,
];

export async function bootstrap() {
    const settings = new SettingsStore();
    await settings.load();

    const router = new Router();
    const player = new PlayerWatcher();
    const osd = new Osd(() => settings.get('osd'));

    /** @type {AppContext} */
    const ctx = { settings, router, player, osd, actions: null };
    ctx.actions = new PlayerActions(ctx);

    // The player watcher only runs on watch pages; must be wired before the
    // features so they see an up-to-date player when the route changes.
    const syncPage = () => {
        setRootAttribute('data-adn-page', router.page);
        if (router.isWatchPage) player.start();
        else player.stop();
    };
    router.addEventListener('change', syncPage);
    router.start();
    syncPage();

    const features = FEATURES.map((FeatureClass) => new FeatureClass(ctx));
    for (const feature of features) feature.start();

    logger.info(`v${chrome.runtime.getManifest().version} ready, ${features.length} features loaded`);
    return { ctx, features };
}

bootstrap().catch((error) => logger.error('Bootstrap failed', error));
