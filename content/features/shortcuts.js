/**
 * Keyboard shortcuts (YouTube-like) plus a help overlay opened with `?`.
 *
 * Keys are matched on `event.key` (the printed character) so they follow the
 * user's keyboard layout (AZERTY / QWERTY). Handled events are stopped in the
 * capture phase so the site's own handlers do not fire a second time.
 */

import { Feature } from '../core/feature.js';
import { createElement, createSvgIcon, isTypingTarget } from '../core/dom.js';
import { ICONS } from '../../shared/icons.js';
import { PLAYBACK_RATE_STEP, SEEK_STEP, SEEK_STEP_LARGE, SHORTCUTS, VOLUME_STEP } from '../../shared/shortcuts.js';
import { t } from '../../shared/i18n.js';

/** Keys that toggle something: ignore auto-repeat for them. */
const NON_REPEATABLE_KEYS = new Set([' ', 'k', 'm', 'f', 't', 'p', 'n', '?', 'Escape']);

export class Shortcuts extends Feature {
    static id = 'shortcuts';
    settingKeys = ['shortcuts'];

    #help = null;

    #onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (isTypingTarget(event.target)) return;
        if (!this.ctx.player.video) return;

        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (event.repeat && NON_REPEATABLE_KEYS.has(key)) return;

        if (this.#handle(key, event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };

    onEnable() {
        this.listen(window, 'keydown', this.#onKeyDown, { capture: true });
        this.listen(this.ctx.player, 'videoremoved', () => this.#closeHelp());
    }

    onDisable() {
        this.#closeHelp();
    }

    /** @returns {boolean} true when the key was handled */
    #handle(key, event) {
        const { actions } = this.ctx;
        const shift = event.shiftKey;
        const seekStep = SEEK_STEP;
        const seekStepLarge = SEEK_STEP_LARGE;
        const volumeStep = VOLUME_STEP;

        switch (key) {
            case ' ':
                // Let a focused button keep its native Space activation.
                if (event.target instanceof HTMLButtonElement) return false;
                actions.togglePlay();
                return true;
            case 'k':
                actions.togglePlay();
                return true;
            case 'ArrowLeft':
                actions.seekBy(-(shift ? seekStepLarge : seekStep));
                return true;
            case 'ArrowRight':
                actions.seekBy(shift ? seekStepLarge : seekStep);
                return true;
            case 'j':
                actions.seekBy(-seekStepLarge);
                return true;
            case 'l':
                actions.seekBy(seekStepLarge);
                return true;
            case 'ArrowUp':
                actions.changeVolume(volumeStep);
                return true;
            case 'ArrowDown':
                actions.changeVolume(-volumeStep);
                return true;
            case 'm':
                actions.toggleMute();
                return true;
            case 'f':
                actions.toggleFullscreen();
                return true;
            case 't':
                actions.toggleTheaterMode();
                return true;
            case 'p':
                if (shift) actions.goToPreviousEpisode();
                else actions.togglePictureInPicture();
                return true;
            case 'n':
                if (!shift) return false;
                actions.goToNextEpisode();
                return true;
            case '<':
                actions.changePlaybackRate(-PLAYBACK_RATE_STEP);
                return true;
            case '>':
                actions.changePlaybackRate(PLAYBACK_RATE_STEP);
                return true;
            case 'Home':
                actions.seekToPercent(0);
                return true;
            case 'End':
                actions.seekToPercent(100);
                return true;
            case '?':
                this.#toggleHelp();
                return true;
            case 'Escape':
                if (!this.#help) return false;
                this.#closeHelp();
                return true;
            default:
                if (/^[0-9]$/.test(key)) {
                    actions.seekToPercent(Number(key) * 10);
                    return true;
                }
                return false;
        }
    }

    // ------------------------------------------------------ Help overlay --

    #toggleHelp() {
        if (this.#help) this.#closeHelp();
        else this.#openHelp();
    }

    #openHelp() {
        const container = this.ctx.player.container;
        if (!container) return;

        const rows = SHORTCUTS.map((shortcut) => {
            const keys = shortcut.keys.map((key) =>
                createElement('kbd', { text: key === 'Space' ? t('keySpace') : key }),
            );
            return createElement('div', { class: 'adn-improver-help-row' }, [
                createElement('div', { class: 'adn-improver-help-keys' }, keys),
                createElement('div', { class: 'adn-improver-help-label', text: t(shortcut.label) }),
            ]);
        });

        const closeButton = createElement('button', {
            class: 'adn-improver-help-close',
            type: 'button',
            'aria-label': t('helpClose'),
            text: '✕',
        });
        closeButton.addEventListener('click', () => this.#closeHelp());

        this.#help = createElement('div', { class: 'adn-improver-help', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('helpTitle') }, [
            createElement('div', { class: 'adn-improver-help-panel' }, [
                createElement('div', { class: 'adn-improver-help-header' }, [
                    createSvgIcon(ICONS.keyboard, { className: 'adn-improver-icon' }),
                    createElement('h2', { text: t('helpTitle') }),
                    closeButton,
                ]),
                createElement('div', { class: 'adn-improver-help-body' }, rows),
            ]),
        ]);
        this.#help.addEventListener('click', (event) => {
            if (event.target === this.#help) this.#closeHelp();
        });
        container.append(this.#help);
        closeButton.focus({ preventScroll: true });
    }

    #closeHelp() {
        this.#help?.remove();
        this.#help = null;
    }
}
