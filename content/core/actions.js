/**
 * Player actions shared by keyboard shortcuts and control-bar buttons.
 * Every action gives visual feedback through the OSD.
 */

import { clamp, createSvgIcon, formatTime } from './dom.js';
import { ICONS } from '../../shared/icons.js';
import { t } from '../../shared/i18n.js';
import { logger } from './logger.js';
import { findNextEpisodeControl, findPreviousEpisodeControl } from './episode.js';

export const PLAYBACK_RATES = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
export const MIN_PLAYBACK_RATE = 0.25;
export const MAX_PLAYBACK_RATE = 3;

/** Duration in seconds, falling back to the seekable range when unknown. */
function getDuration(video) {
    if (Number.isFinite(video.duration)) return video.duration;
    const { seekable } = video;
    return seekable.length > 0 ? seekable.end(seekable.length - 1) : null;
}

export function formatRate(rate) {
    return `${Number(rate.toFixed(2)).toString().replace('.', ',')}×`;
}

export class PlayerActions {
    /** @param {import('../main.js').AppContext} ctx */
    constructor(ctx) {
        this.ctx = ctx;
    }

    get #video() {
        return this.ctx.player.video;
    }

    get #container() {
        return this.ctx.player.container;
    }

    #osd(text, iconPath) {
        this.ctx.osd.show(this.#container, text, iconPath ? createSvgIcon(iconPath) : null);
    }

    togglePlay() {
        const video = this.#video;
        if (!video) return;
        if (video.paused) {
            video.play().catch((error) => logger.debug('play() rejected', error));
            this.#osd(t('osdPlay'), ICONS.play);
        } else {
            video.pause();
            this.#osd(t('osdPause'), ICONS.pause);
        }
    }

    seekBy(seconds) {
        const video = this.#video;
        const duration = video && getDuration(video);
        if (!duration) return;
        video.currentTime = clamp(video.currentTime + seconds, 0, duration);
        const sign = seconds > 0 ? '+' : '−';
        this.#osd(`${sign}${Math.abs(seconds)} s`, seconds > 0 ? ICONS.forward : ICONS.rewind);
    }

    seekToPercent(percent) {
        const video = this.#video;
        const duration = video && getDuration(video);
        if (!duration) return;
        video.currentTime = (clamp(percent, 0, 100) / 100) * duration;
        this.#osd(formatTime(video.currentTime));
    }

    changeVolume(delta) {
        const video = this.#video;
        if (!video) return;
        const volume = clamp(Math.round((video.volume + delta) * 100) / 100, 0, 1);
        video.volume = volume;
        if (volume > 0 && video.muted) video.muted = false;
        this.#osd(`${Math.round(volume * 100)} %`, volume === 0 ? ICONS.volumeOff : ICONS.volumeUp);
    }

    toggleMute() {
        const video = this.#video;
        if (!video) return;
        video.muted = !video.muted;
        this.#osd(
            video.muted ? t('osdMuted') : `${Math.round(video.volume * 100)} %`,
            video.muted ? ICONS.volumeOff : ICONS.volumeUp,
        );
    }

    setPlaybackRate(rate) {
        const video = this.#video;
        if (!video) return;
        const clamped = clamp(rate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
        video.playbackRate = clamped;
        this.#osd(formatRate(clamped), ICONS.speed);
    }

    changePlaybackRate(delta) {
        const video = this.#video;
        if (!video) return;
        this.setPlaybackRate(Math.round((video.playbackRate + delta) * 100) / 100);
    }

    async toggleFullscreen() {
        const container = this.#container;
        if (!container) return;
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await container.requestFullscreen();
            }
        } catch (error) {
            logger.warn('Fullscreen toggle failed', error);
        }
    }

    async togglePictureInPicture() {
        const video = this.#video;
        if (!video) return;
        if (!document.pictureInPictureEnabled || video.disablePictureInPicture) {
            this.#osd(t('osdPipUnavailable'), ICONS.pip);
            return;
        }
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            logger.warn('Picture-in-Picture failed', error);
            this.#osd(t('osdPipUnavailable'), ICONS.pip);
        }
    }

    async toggleTheaterMode() {
        const enabled = await this.ctx.settings.toggle('theaterMode');
        this.#osd(
            enabled ? t('osdTheaterOn') : t('osdTheaterOff'),
            enabled ? ICONS.theaterActive : ICONS.theater,
        );
    }

    goToNextEpisode() {
        const control = findNextEpisodeControl();
        if (!control) {
            this.#osd(t('osdNoNextEpisode'), ICONS.skipNext);
            return;
        }
        this.#osd(t('osdNextEpisode'), ICONS.skipNext);
        control.click();
    }

    goToPreviousEpisode() {
        const control = findPreviousEpisodeControl();
        if (!control) {
            this.#osd(t('osdNoPreviousEpisode'), ICONS.skipPrevious);
            return;
        }
        this.#osd(t('osdPreviousEpisode'), ICONS.skipPrevious);
        control.click();
    }
}
