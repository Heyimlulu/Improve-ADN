/**
 * Base class for every feature.
 *
 * Lifecycle:
 *   start()  -> subscribes to settings / router / player and calls evaluate()
 *   evaluate() -> enables or disables the feature depending on
 *                 `isWanted()` (settings) and `isApplicable()` (current page)
 *   stop()   -> disables and unsubscribes everything
 *
 * Subclasses implement `onEnable()` / `onDisable()` and may override
 * `isWanted()`, `isApplicable()`, `settingKeys` and `watchPageOnly`.
 *
 * Anything registered with `listen()` or `addCleanup()` while enabled is
 * automatically torn down by `disable()`, so features rarely need to track
 * listeners by hand.
 */

import { logger } from './logger.js';

/**
 * Collects listeners and cleanup callbacks tied to one object's lifetime
 * (a <video> element, a control bar...). `dispose()` undoes everything.
 */
export class Scope {
    #cleanups = [];

    listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.#cleanups.push(() => target.removeEventListener(type, handler, options));
    }

    add(cleanup) {
        this.#cleanups.push(cleanup);
    }

    dispose() {
        for (const cleanup of this.#cleanups.splice(0).reverse()) {
            try {
                cleanup();
            } catch (error) {
                logger.error('Scope cleanup failed', error);
            }
        }
    }
}

export class Feature {
    /** Unique identifier (used in logs). */
    static id = 'feature';

    /** Settings keys that should trigger a re-evaluation when they change. */
    settingKeys = [];

    /** Whether the feature only makes sense on a watch page. */
    watchPageOnly = true;

    /** @type {import('../main.js').AppContext} */
    ctx;

    #enabled = false;
    #cleanups = [];
    #subscriptions = [];

    constructor(ctx) {
        this.ctx = ctx;
    }

    get id() {
        return this.constructor.id;
    }

    get enabled() {
        return this.#enabled;
    }

    // ---------------------------------------------------------------- API --

    start() {
        this.#subscriptions.push(
            this.ctx.settings.onChange((changes) => {
                const relevant = this.settingKeys.some((key) => key in changes);
                if (relevant) {
                    this.onSettingsChange(changes);
                    this.evaluate();
                }
            }),
        );

        const onRoute = () => this.evaluate();
        this.ctx.router.addEventListener('change', onRoute);
        this.#subscriptions.push(() => this.ctx.router.removeEventListener('change', onRoute));

        this.evaluate();
    }

    stop() {
        this.disable();
        for (const unsubscribe of this.#subscriptions.splice(0)) unsubscribe();
    }

    evaluate() {
        const shouldEnable = this.isWanted() && this.isApplicable();
        if (shouldEnable && !this.#enabled) this.enable();
        else if (!shouldEnable && this.#enabled) this.disable();
    }

    enable() {
        if (this.#enabled) return;
        this.#enabled = true;
        logger.debug(`enable ${this.id}`);
        try {
            this.onEnable();
        } catch (error) {
            logger.error(`Failed to enable ${this.id}`, error);
        }
    }

    disable() {
        if (!this.#enabled) return;
        this.#enabled = false;
        logger.debug(`disable ${this.id}`);
        try {
            this.onDisable();
        } catch (error) {
            logger.error(`Failed to disable ${this.id}`, error);
        }
        for (const cleanup of this.#cleanups.splice(0).reverse()) {
            try {
                cleanup();
            } catch (error) {
                logger.error(`Cleanup failed in ${this.id}`, error);
            }
        }
    }

    // ------------------------------------------------- Overridable hooks --

    /** Is the feature turned on by the user? Default: first setting key is truthy. */
    isWanted() {
        const [key] = this.settingKeys;
        return key ? Boolean(this.ctx.settings.get(key)) : true;
    }

    /** Does the feature apply to the current page? */
    isApplicable() {
        return this.watchPageOnly ? this.ctx.router.isWatchPage : true;
    }

    /** Called when one of `settingKeys` changed, before re-evaluation. */
    // eslint-disable-next-line no-unused-vars
    onSettingsChange(changes) {}

    onEnable() {}

    onDisable() {}

    // ------------------------------------------------------------ Helpers --

    /** addEventListener that is removed automatically on disable(). */
    listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.addCleanup(() => target.removeEventListener(type, handler, options));
    }

    /** Register a function to run on disable(). */
    addCleanup(fn) {
        this.#cleanups.push(fn);
    }

    /**
     * Run `callback(video, container, scope)` for the current video (if any)
     * and for every video that appears later while the feature is enabled.
     * Whatever is registered on `scope` is disposed when that video goes away,
     * when the next video shows up, or when the feature is disabled.
     */
    onEachVideo(callback) {
        this.#forEach('video', (player) => player.video && [player.video, player.container], callback);
    }

    /** Same as onEachVideo but for the control bar: `callback(controlBar, container, scope)`. */
    onEachControlBar(callback) {
        this.#forEach('controlbar', (player) => player.controlBar && [player.controlBar, player.container], callback);
    }

    #forEach(eventType, current, callback) {
        const { player } = this.ctx;
        let scope = null;

        const dispose = () => {
            scope?.dispose();
            scope = null;
        };
        const attach = (target, container) => {
            dispose();
            scope = new Scope();
            callback(target, container, scope);
        };

        const existing = current(player);
        if (existing) attach(...existing);
        this.listen(player, eventType, (event) => {
            const { video, controlBar, container } = event.detail;
            attach(eventType === 'video' ? video : controlBar, container);
        });
        this.listen(player, 'videoremoved', dispose);
        this.addCleanup(dispose);
    }
}
