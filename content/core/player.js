/**
 * Watches the DOM for the ADN video player (a video.js instance) and exposes
 * its parts to features.
 *
 * Events (CustomEvent, data in `detail`):
 *  - `video`        : a new <video> element is available -> { video, container }
 *  - `controlbar`   : the control bar of the current player exists -> { controlBar, container }
 *  - `videoremoved` : the previous <video> left the DOM -> { video }
 *
 * The watcher only observes while on a watch page.
 */

import { logger } from './logger.js';
import { rafThrottle, setRootAttribute } from './dom.js';

export const PLAYER_SELECTORS = Object.freeze({
    VIDEO: 'video',
    CONTAINER: '.video-js',
    CONTROL_BAR: '.vjs-control-bar',
    FULLSCREEN_BUTTON: '.vjs-fullscreen-control',
    PIP_BUTTON: '.vjs-picture-in-picture-control',
    PLAYBACK_RATE_BUTTON: '.vjs-playback-rate',
    TECH: '.vjs-tech',
});

export class PlayerWatcher extends EventTarget {
    #observer = null;
    #video = null;
    #container = null;
    #controlBar = null;
    #scan = rafThrottle(() => this.#scanNow());
    #onPlay = () => setRootAttribute('data-adn-playing', 'true');
    #onPause = () => setRootAttribute('data-adn-playing', 'false');

    /** Current <video> element or null. */
    get video() {
        return this.#video;
    }

    /** Current `.video-js` container (falls back to the video's parent). */
    get container() {
        return this.#container;
    }

    /** Current `.vjs-control-bar` or null. */
    get controlBar() {
        return this.#controlBar;
    }

    start() {
        if (this.#observer) return;
        this.#observer = new MutationObserver(this.#scan);
        this.#observer.observe(document.documentElement, { childList: true, subtree: true });
        this.#scanNow();
        logger.debug('Player watcher started');
    }

    stop() {
        this.#observer?.disconnect();
        this.#observer = null;
        this.#detachVideo();
        this.#controlBar = null;
        setRootAttribute('data-adn-playing', null);
        logger.debug('Player watcher stopped');
    }

    #scanNow() {
        const video = document.querySelector(PLAYER_SELECTORS.VIDEO);

        if (this.#video && (this.#video !== video || !this.#video.isConnected)) {
            this.#detachVideo();
        }

        if (video && video !== this.#video) {
            this.#attachVideo(video);
        }

        if (this.#container) {
            const controlBar = this.#container.querySelector(PLAYER_SELECTORS.CONTROL_BAR);
            if (controlBar && controlBar !== this.#controlBar) {
                this.#controlBar = controlBar;
                this.dispatchEvent(
                    new CustomEvent('controlbar', {
                        detail: { controlBar, container: this.#container },
                    }),
                );
            } else if (!controlBar && this.#controlBar) {
                this.#controlBar = null;
            }
        }
    }

    #attachVideo(video) {
        this.#video = video;
        this.#container = video.closest(PLAYER_SELECTORS.CONTAINER) ?? video.parentElement;
        this.#controlBar = null;
        video.addEventListener('play', this.#onPlay);
        video.addEventListener('pause', this.#onPause);
        setRootAttribute('data-adn-playing', video.paused ? 'false' : 'true');
        logger.debug('Video attached', video);
        this.dispatchEvent(
            new CustomEvent('video', { detail: { video, container: this.#container } }),
        );
    }

    #detachVideo() {
        const video = this.#video;
        if (!video) return;
        video.removeEventListener('play', this.#onPlay);
        video.removeEventListener('pause', this.#onPause);
        this.#video = null;
        this.#container = null;
        this.#controlBar = null;
        logger.debug('Video detached');
        this.dispatchEvent(new CustomEvent('videoremoved', { detail: { video } }));
    }
}
