/**
 * Dims the picture and shows the show / episode title (plus the synopsis the
 * player exposes) while the video is paused, Netflix style. The overlay never
 * captures pointer events so the player keeps reacting to clicks.
 *
 * ADN draws its own title block inside the player (`.vjs-meta-display`); it
 * is hidden while this feature is on so the information is not shown twice
 * (see `html[data-adn-pause-overlay]` in player.css).
 */

import { Feature } from '../core/feature.js';
import { createElement, setRootAttribute } from '../core/dom.js';
import { getEpisodeInfo } from '../core/episode.js';
import { PLAYER_SELECTORS } from '../core/player.js';

const SHOW_DELAY_MS = 400;
const NATIVE_SUMMARY_SELECTOR = '.vjs-meta-summary';

export class PauseOverlay extends Feature {
    static id = 'pause-overlay';
    settingKeys = ['pauseOverlay'];

    #overlay = null;
    #timer = null;

    onEnable() {
        setRootAttribute('data-adn-pause-overlay', 'true');
        this.onEachVideo((video, container, scope) => this.#attach(video, container, scope));
    }

    onDisable() {
        setRootAttribute('data-adn-pause-overlay', null);
    }

    #attach(video, container, scope) {
        const overlay = createElement('div', { class: 'adn-improver-pause-overlay', 'aria-hidden': 'true' }, [
            createElement('div', { class: 'adn-improver-pause-overlay-title' }),
        ]);
        this.#overlay = overlay;

        // Right after the media element so the native controls stay on top.
        const tech = container.querySelector(PLAYER_SELECTORS.TECH) ?? video;
        tech.after(overlay);
        scope.add(() => {
            clearTimeout(this.#timer);
            overlay.remove();
            if (this.#overlay === overlay) this.#overlay = null;
        });

        const show = () => {
            clearTimeout(this.#timer);
            this.#timer = setTimeout(() => this.#show(), SHOW_DELAY_MS);
        };
        const hide = () => {
            clearTimeout(this.#timer);
            this.#overlay?.classList.remove('is-visible');
        };

        scope.listen(video, 'pause', show);
        scope.listen(video, 'play', hide);
        scope.listen(video, 'playing', hide);
        scope.listen(video, 'seeking', hide);
        scope.listen(video, 'emptied', hide);

        if (video.paused && video.currentTime > 0) show();
    }

    #show() {
        const overlay = this.#overlay;
        const video = this.ctx.player.video;
        if (!overlay || !video || !video.paused) return;

        const { show, episode } = getEpisodeInfo();
        const summary = overlay.parentElement?.querySelector(NATIVE_SUMMARY_SELECTOR)?.textContent.trim() ?? '';
        const title = overlay.firstElementChild;
        title.replaceChildren(
            show ? createElement('div', { class: 'adn-improver-pause-overlay-show', text: show }) : null,
            episode ? createElement('div', { class: 'adn-improver-pause-overlay-episode', text: episode }) : null,
            summary ? createElement('p', { class: 'adn-improver-pause-overlay-summary', text: summary }) : null,
        );
        overlay.classList.add('is-visible');
    }
}
