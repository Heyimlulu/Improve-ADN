/**
 * Dims the picture and shows the show / episode title while the video is
 * paused (Netflix style). The overlay never captures pointer events so the
 * player keeps reacting to clicks.
 */

import { Feature } from '../core/feature.js';
import { createElement } from '../core/dom.js';
import { getEpisodeInfo } from '../core/episode.js';
import { PLAYER_SELECTORS } from '../core/player.js';

const SHOW_DELAY_MS = 400;

export class PauseOverlay extends Feature {
    static id = 'pause-overlay';
    settingKeys = ['pauseOverlay'];

    #overlay = null;
    #timer = null;

    onEnable() {
        this.onEachVideo((video, container, scope) => this.#attach(video, container, scope));
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
        const title = overlay.firstElementChild;
        title.replaceChildren(
            show ? createElement('div', { class: 'adn-improver-pause-overlay-show', text: show }) : null,
            episode ? createElement('div', { class: 'adn-improver-pause-overlay-episode', text: episode }) : null,
        );
        overlay.classList.add('is-visible');
    }
}
