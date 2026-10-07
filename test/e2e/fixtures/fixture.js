// Mimics the parts of video.js behaviour the extension relies on
// (state classes, inactivity, play/pause buttons, episode switching).
(() => {
    const player = document.querySelector('.video-js');
    const video = player.querySelector('video');
    let timer;

    const active = () => {
        player.classList.add('vjs-user-active');
        player.classList.remove('vjs-user-inactive');
        clearTimeout(timer);
        timer = setTimeout(() => {
            player.classList.remove('vjs-user-active');
            player.classList.add('vjs-user-inactive');
        }, 1500);
    };
    document.addEventListener('mousemove', active);

    video.addEventListener('play', () => {
        player.classList.add('vjs-playing', 'vjs-has-started', 'vjs-player-started');
        player.classList.remove('vjs-paused');
        active();
    });
    video.addEventListener('pause', () => {
        player.classList.remove('vjs-playing');
        player.classList.add('vjs-paused');
    });

    const toggle = () => (video.paused ? video.play() : video.pause());
    player.querySelector('.vjs-big-play-button')?.addEventListener('click', toggle);
    video.addEventListener('click', toggle);

    for (const [selector, direction] of [['.vjs-control-next-video button', 1], ['.vjs-control-previous-video button', -1]]) {
        document.querySelector(selector)?.addEventListener('click', () => {
            window.__switchVideo = direction;
        });
    }
})();
