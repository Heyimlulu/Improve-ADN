let allSettings = {};
let video = null;
let playerControls = null;

const defaultSettings = {
    theaterMode: false,
    playbackSpeedControl: true,
    hideThumbnails: false,
    hideScrollbar: false,
    hidePlayerDim: false,
    hideSubtitles: false,
    pipButton: true,
    maximizeOnDoubleClick: true
};

// --- FEATURE HANDLERS ---

function toggleTheaterMode(enabled) {
    document.body.classList.toggle('adn-improver-theater-mode', enabled);
    if (enabled) {
        document.addEventListener('mousemove', handleMouseMove);
    } else {
        document.removeEventListener('mousemove', handleMouseMove);
        document.querySelector('header')?.classList.remove('adn-improver-header-visible');
    }
}

const handleMouseMove = (e) => {
    const header = document.querySelector('header');
    if (!header) return;
    if (e.clientY < 60) header.classList.add('adn-improver-header-visible');
    else if (!header.matches(':hover')) header.classList.remove('adn-improver-header-visible');
};

function togglePlaybackSpeedControl(enabled) {
    let speedControl = playerControls?.querySelector('.adn-improver-speed-control');
    if (enabled) {
        if (speedControl) return; // Already exists
        speedControl = document.createElement('select');
        speedControl.className = 'adn-improver-speed-control';
        [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].forEach(speed => {
            const option = document.createElement('option');
            option.value = speed;
            option.innerText = `${speed}x`;
            if (speed === 1) option.selected = true;
            speedControl.appendChild(option);
        });
        speedControl.addEventListener('change', (e) => { video.playbackRate = parseFloat(e.target.value); });
        playerControls?.prepend(speedControl);
    } else {
        speedControl?.remove();
    }
}

function togglePipButton(enabled) {
    let pipButton = playerControls?.querySelector('.adn-improver-pip-button');
    if (enabled) {
        if (pipButton) return;
        pipButton = document.createElement('button');
        pipButton.innerText = 'PiP';
        pipButton.className = 'adn-improver-pip-button';
        pipButton.addEventListener('click', async () => {
            if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else await video.requestPictureInPicture();
        });
        playerControls?.appendChild(pipButton);
    } else {
        pipButton?.remove();
    }
}

const dblClickHandler = () => {
    const playerContainer = video.closest('.video-js');
    if (!document.fullscreenElement) (playerContainer || video).requestFullscreen();
    else document.exitFullscreen();
};

function toggleMaximizeOnDoubleClick(enabled) {
    if (enabled) {
        video?.addEventListener('dblclick', dblClickHandler);
    } else {
        video?.removeEventListener('dblclick', dblClickHandler);
    }
}

function applyUiTweaks(settings) {
    document.body.classList.toggle('adn-improver-hide-thumbnails', settings.hideThumbnails);
    document.documentElement.classList.toggle('adn-improver-hide-scrollbar', settings.hideScrollbar); // Apply to HTML tag
    document.body.classList.toggle('adn-improver-hide-scrollbar', settings.hideScrollbar); // Also apply to body for good measure
    document.body.classList.toggle('adn-improver-hide-player-dim', settings.hidePlayerDim);
    document.body.classList.toggle('adn-improver-hide-subtitles', settings.hideSubtitles);
}

// --- WATCHED EPISODES LOGIC ---

let watchedEpisodes = new Set();
const saveWatchedEpisodes = () => chrome.storage.local.set({ watchedEpisodes: Array.from(watchedEpisodes) });

function toggleWatched(e) {
    const thumbnailArea = e.target.closest('.sc-2ae2f61a-4');
    if (!thumbnailArea) return;
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest('[data-testid^="season-list-item-"], li[itemtype="homePage"]');
    const episodeUrl = card?.querySelector('a')?.href;
    if (!episodeUrl) return;

    if (watchedEpisodes.has(episodeUrl)) watchedEpisodes.delete(episodeUrl);
    else watchedEpisodes.add(episodeUrl);
    
    card.classList.toggle('is-watched');
    saveWatchedEpisodes();
}

function initMarkAsWatched() {
    document.querySelectorAll('[data-testid^="season-list-item-"], li[itemtype="homePage"]').forEach(card => {
        card.classList.toggle('is-watched', watchedEpisodes.has(card.querySelector('a')?.href));
        // Ensure listener is only added once
        if (!card.adnImproverListener) {
            card.addEventListener('click', toggleWatched);
            card.adnImproverListener = true;
        }
    });
}

// --- INITIALIZATION ---

function applyAllSettings(settings) {
    allSettings = settings;
    toggleTheaterMode(settings.theaterMode);
    togglePlaybackSpeedControl(settings.playbackSpeedControl);
    togglePipButton(settings.pipButton);
    toggleMaximizeOnDoubleClick(settings.maximizeOnDoubleClick);
    applyUiTweaks(settings);
}

async function init() {
    // Find video element and controls
    const videoElement = await new Promise(resolve => {
        const find = () => {
            const v = document.querySelector('video');
            if (v) resolve(v);
            else setTimeout(find, 500);
        };
        find();
    });
    video = videoElement;
    playerControls = video.closest('.video-js')?.querySelector('.vjs-control-bar');

    // Load watched episodes
    const localData = await chrome.storage.local.get(['watchedEpisodes']);
    if (localData.watchedEpisodes) {
        watchedEpisodes = new Set(localData.watchedEpisodes);
    }

    // Setup Mark as Watched observer
    const observer = new MutationObserver(initMarkAsWatched);
    observer.observe(document.body, { childList: true, subtree: true });
    initMarkAsWatched();

    // Load settings and apply them
    const syncData = await chrome.storage.sync.get(defaultSettings);
    applyAllSettings(syncData);

    // Listen for future changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            // This is the key change: only update what's necessary
            for (let [key, { newValue }] of Object.entries(changes)) {
                allSettings[key] = newValue;
                switch (key) {
                    case 'theaterMode': toggleTheaterMode(newValue); break;
                    case 'playbackSpeedControl': togglePlaybackSpeedControl(newValue); break;
                    case 'pipButton': togglePipButton(newValue); break;
                    case 'maximizeOnDoubleClick': toggleMaximizeOnDoubleClick(newValue); break;
                    case 'hideThumbnails':
                    case 'hideScrollbar':
                    case 'hidePlayerDim':
                    case 'hideSubtitles':
                        applyUiTweaks(allSettings); // Easiest to just re-apply all UI tweaks
                        break;
                }
            }
        }
    });
}

init();
