/**
 * End-to-end smoke test.
 *
 * Loads the unpacked extension in Chromium (new headless mode), intercepts
 * animationdigitalnetwork.com to serve `fixtures/watch-page.html` (the real
 * DOM of an ADN watch page, see fixtures/README.md) and exercises every
 * feature: theater layout, header behaviour, control-bar buttons, gradient
 * handling, shortcuts, pause overlay, SPA navigation and the popup.
 *
 * Requirements: `npm install` then `npx playwright install chromium`.
 * Run with `npm run test:e2e`. Screenshots land in `test/e2e/screenshots/`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fulfillMedia } from './range.mjs';
import { ensureSampleVideo } from './sample-video.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '..', '..');
const FIXTURES = path.join(HERE, 'fixtures');
const SHOTS = path.join(HERE, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const SAMPLE = await ensureSampleVideo(path.join(HERE, 'sample.webm'));

const ORIGIN = 'https://animationdigitalnetwork.com';
const WATCH_PATH = '/video/1428-even-the-student-council-has-its-holes/32946-episode-1';
const SHOW_TITLE = 'Even the Student Council Has Its Holes!';
const EPISODE_TITLE = 'Épisode 1 : Il manque une case à ce gars…';
const EXTENSION_VERSION = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version;
const SETTINGS_COUNT = 4;
const ALWAYS_ON_COUNT = 5;
const SHORTCUTS_COUNT = 12;

const results = [];
let failures = 0;
function check(name, condition, info = '') {
    results.push(`${condition ? 'PASS' : 'FAIL'} ${name}${info ? ` (${info})` : ''}`);
    if (!condition) failures++;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
process.on('unhandledRejection', (error) => {
    console.log(results.join('\n'));
    console.error('\nAborted:', error);
    process.exit(1);
});

// ------------------------------------------------------------- Browser --

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adn-improver-e2e-'));
const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1600, height: 900 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required'],
});

const STATIC = {
    '/sample.webm': { file: SAMPLE, type: 'video/webm', media: true },
    '/fixture.css': { file: path.join(FIXTURES, 'fixture.css'), type: 'text/css' },
    '/adn.css': { file: path.join(FIXTURES, 'adn.css'), type: 'text/css' },
    '/fixture.js': { file: path.join(FIXTURES, 'fixture.js'), type: 'application/javascript' },
};
await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Only web requests are faked; the extension's own chrome-extension:// modules must load.
    if (!/^https?:$/.test(url.protocol)) return route.continue();
    if (url.origin !== ORIGIN) return route.abort();
    const asset = STATIC[url.pathname];
    if (asset?.media) return fulfillMedia(route, fs.readFileSync(asset.file), asset.type);
    if (asset) return route.fulfill({ status: 200, contentType: asset.type, body: fs.readFileSync(asset.file) });
    if (route.request().resourceType() === 'document') {
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(FIXTURES, 'watch-page.html'), 'utf8') });
    }
    return route.fulfill({ status: 204, body: '' });
});

const page = await context.newPage();
let extensionId = null;
const consoleErrors = [];
page.on('console', (msg) => {
    const url = msg.location()?.url ?? '';
    if (url.startsWith('chrome-extension://')) extensionId ??= new URL(url).host;
    if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

await page.goto(ORIGIN + WATCH_PATH);
await page.waitForSelector('html[data-adn-page="watch"]', { timeout: 10000 }).catch(() => {});
await sleep(3200); // let the delayed relayouts run

// -------------------------------------------------------- Theater layout --

const html = page.locator('html');
check('page classified as watch', (await html.getAttribute('data-adn-page')) === 'watch');
check('theater attribute set', (await html.getAttribute('data-adn-theater')) === 'on');

const geometry = await page.evaluate(() => {
    const wrapper = document.querySelector('[data-adn-theater-wrapper]');
    const sidebar = document.querySelector('[class*="w-[320px]"]');
    const player = document.querySelector('.video-js');
    const header = document.querySelector('header[data-testid="menuContent"]');
    const title = document.querySelector('h1');
    const rect = (element) => element && element.getBoundingClientRect().toJSON();
    return {
        wrapperClass: wrapper?.className,
        wrapper: rect(wrapper),
        player: rect(player),
        sidebar: rect(sidebar),
        header: rect(header),
        title: rect(title),
        sidebarMarked: sidebar?.hasAttribute('data-adn-theater-aside'),
        stageMarked: wrapper?.parentElement.hasAttribute('data-adn-theater-stage'),
        headerMarked: header?.hasAttribute('data-adn-theater-header'),
        scrollHeight: document.scrollingElement.scrollHeight,
        innerHeight: window.innerHeight,
        innerWidth: document.documentElement.clientWidth,
        headerVisible: document.documentElement.getAttribute('data-adn-header'),
    };
});
check('wrapper is .adn-vjs-v4', geometry.wrapperClass === 'adn-vjs-v4', geometry.wrapperClass);
check('wrapper starts at x=0', Math.abs(geometry.wrapper?.left) < 1, `left=${geometry.wrapper?.left}`);
check('wrapper is viewport wide', Math.abs(geometry.wrapper?.width - geometry.innerWidth) < 1, `${geometry.wrapper?.width} vs ${geometry.innerWidth}`);
check('wrapper is viewport tall', Math.abs(geometry.wrapper?.height - geometry.innerHeight) < 1, `${geometry.wrapper?.height} vs ${geometry.innerHeight}`);
check('player fills wrapper', Math.abs(geometry.player?.height - geometry.innerHeight) < 1 && Math.abs(geometry.player?.width - geometry.innerWidth) < 1, JSON.stringify(geometry.player));
check('player at the very top (title block moved below)', geometry.stageMarked && Math.abs(geometry.wrapper?.top) < 1 && geometry.title.top >= geometry.innerHeight - 1, `wrapper.top=${geometry.wrapper?.top} title.top=${geometry.title?.top}`);
check('sidebar keeps its column and starts under the player, level with the title', geometry.sidebarMarked && Math.abs(geometry.sidebar.top - geometry.title.top) < 40 && geometry.sidebar.top >= geometry.innerHeight - 1 && geometry.sidebar.left > geometry.innerWidth / 2 && Math.abs(geometry.sidebar.width - 320) < 1, `sidebar=${JSON.stringify(geometry.sidebar)} title.top=${geometry.title?.top}`);
check('page remains scrollable', geometry.scrollHeight > geometry.innerHeight + 400, `scrollHeight=${geometry.scrollHeight}`);
check('header marked and hidden at top', geometry.headerMarked && geometry.headerVisible === 'hidden' && geometry.header.bottom <= 0, `${geometry.headerVisible} bottom=${geometry.header?.bottom}`);

await page.evaluate(() => window.scrollTo(0, window.innerHeight));
await sleep(300);
await page.screenshot({ path: path.join(SHOTS, 'below-player.png') });
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(300);

await page.mouse.move(800, 10);
await sleep(400);
check('header shown on hover near top', (await html.getAttribute('data-adn-header')) === 'visible');
await page.mouse.move(800, 400);
await sleep(400);
check('header hidden again', (await html.getAttribute('data-adn-header')) === 'hidden');

// ------------------------------------------------------ Gradient handling --

await page.evaluate(() => document.querySelector('video').play());
await sleep(500);
// ---------------------------------------------------- Control-bar buttons --

const controls = await page.evaluate(() => {
    const bar = document.querySelector('.vjs-control-bar');
    const kids = [...bar.children];
    return {
        theater: Boolean(bar.querySelector('.adn-improver-theater-button')),
        theaterActive: bar.querySelector('.adn-improver-theater-button')?.classList.contains('is-active'),
        rate: bar.querySelector('.adn-improver-rate-button .adn-improver-control-text')?.textContent,
        rateItems: bar.querySelectorAll('.adn-improver-menu-item').length,
        pip: Boolean(bar.querySelector('.adn-improver-pip-button')),
        pipEnabled: document.pictureInPictureEnabled,
        fullscreenLast: kids.indexOf(bar.querySelector('.vjs-fullscreen-control')) === kids.length - 1,
        allVisible: ['.adn-improver-theater-button', '.adn-improver-rate-button', '.adn-improver-pip-button'].every((selector) => {
            const element = bar.querySelector(selector);
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }),
        inlineOrder: bar.querySelector('.adn-improver-pip-button')?.style.getPropertyValue('order'),
    };
});
check('theater button injected and active', controls.theater && controls.theaterActive);
check('rate menu injected with 7 items', controls.rate === '1×' && controls.rateItems === 7, `${controls.rate} / ${controls.rateItems}`);
check('pip button injected when supported', controls.pip === controls.pipEnabled, `pipEnabled=${controls.pipEnabled}`);
check('buttons inserted before fullscreen', controls.fullscreenLast);
check('injected controls are visible and share the fullscreen button flex order', controls.allVisible && controls.inlineOrder === '2', `order=${controls.inlineOrder}`);
const barGeometry = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
    return { fullscreen: rect('.vjs-fullscreen-control'), pip: rect('.adn-improver-pip-button'), rate: rect('.adn-improver-rate-button'), theater: rect('.adn-improver-theater-button') };
});
check('injected controls sit on the fullscreen row, right before it', Math.abs(barGeometry.pip.top - barGeometry.fullscreen.top) < 2 && barGeometry.pip.right <= barGeometry.fullscreen.left + 1 && barGeometry.theater.right <= barGeometry.rate.left + 1 && Math.abs(barGeometry.pip.height - barGeometry.fullscreen.height) < 2, JSON.stringify(barGeometry));

// The player may rebuild its control bar: injected controls must come back.
await page.evaluate(() => {
    for (const element of document.querySelectorAll('.vjs-control-bar > .adn-improver-control, .vjs-control-bar > .adn-improver-menu')) element.remove();
});
await sleep(200);
check('injected controls are re-inserted after the bar is rebuilt', await page.evaluate(() => {
    const bar = document.querySelector('.vjs-control-bar');
    const kids = [...bar.children];
    return ['.adn-improver-theater-button', '.adn-improver-rate-button', '.adn-improver-pip-button'].every((selector) => bar.querySelector(selector)) && kids.indexOf(bar.querySelector('.vjs-fullscreen-control')) === kids.length - 1;
}));


const gradientBefore = await page.evaluate(() => ({
    pseudoMark: document.querySelector('.adn-video-js').getAttribute('data-adn-player-gradient-pseudo'),
    afterOpacity: getComputedStyle(document.querySelector('.adn-video-js'), '::after').opacity,
    beforeOpacity: getComputedStyle(document.querySelector('.adn-video-js'), '::before').opacity,
    controls: document.documentElement.getAttribute('data-adn-controls'),
    playing: document.documentElement.getAttribute('data-adn-playing'),
}));
check('both gradient pseudo-elements tagged', gradientBefore.pseudoMark === 'before after', gradientBefore.pseudoMark);
check('gradients visible while controls visible', Number(gradientBefore.afterOpacity) > 0.5 && Number(gradientBefore.beforeOpacity) > 0.5 && gradientBefore.controls === 'visible', JSON.stringify(gradientBefore));
check('playing attribute mirrors video', gradientBefore.playing === 'true');
await sleep(1800); // fixture player goes user-inactive after 1.5 s
const gradientAfter = await page.evaluate(() => ({
    afterOpacity: getComputedStyle(document.querySelector('.adn-video-js'), '::after').opacity,
    beforeOpacity: getComputedStyle(document.querySelector('.adn-video-js'), '::before').opacity,
    controls: document.documentElement.getAttribute('data-adn-controls'),
}));
check('gradients hidden once controls hide', gradientAfter.controls === 'hidden' && Number(gradientAfter.afterOpacity) < 0.05 && Number(gradientAfter.beforeOpacity) < 0.05, JSON.stringify(gradientAfter));
await page.screenshot({ path: path.join(SHOTS, 'theater-playing.png') });

// -------------------------------------------------------------- Shortcuts --

const currentTime = () => page.evaluate(() => document.querySelector('video').currentTime);
const t0 = await currentTime();
await page.keyboard.press('ArrowRight');
await sleep(150);
const t1 = await currentTime();
check('ArrowRight seeks +5 s', t1 - t0 > 4.5 && t1 - t0 < 5.6, `${t0.toFixed(2)} -> ${t1.toFixed(2)}`);
await page.keyboard.press('j');
await sleep(150);
const t2 = await currentTime();
check('J seeks -10 s (clamped at 0)', t2 < t1 && t2 >= 0, `${t1.toFixed(2)} -> ${t2.toFixed(2)}`);
await page.keyboard.press('Shift+>');
await sleep(150);
check('> increases playback rate', (await page.evaluate(() => document.querySelector('video').playbackRate)) === 1.25);
check('rate label updated', (await page.locator('.adn-improver-rate-button .adn-improver-control-text').textContent()) === '1,25×');
check('OSD shown', (await page.locator('.adn-improver-osd.is-visible').count()) === 1);
await page.keyboard.press('m');
await sleep(100);
check('M unmutes (video started muted)', (await page.evaluate(() => document.querySelector('video').muted)) === false);

await page.keyboard.press('k');
await sleep(700);
const pausedState = await page.evaluate(() => ({
    paused: document.querySelector('video').paused,
    overlay: document.querySelector('.adn-improver-pause-overlay')?.classList.contains('is-visible'),
    show: document.querySelector('.adn-improver-pause-overlay-show')?.textContent,
    episode: document.querySelector('.adn-improver-pause-overlay-episode')?.textContent,
    summary: document.querySelector('.adn-improver-pause-overlay-summary')?.textContent,
    nativeMetaHidden: getComputedStyle(document.querySelector('.vjs-meta-display')).display === 'none',
}));
check('K pauses and shows the overlay', pausedState.paused && pausedState.overlay, JSON.stringify(pausedState));
check('overlay title parsed from h1', pausedState.show === SHOW_TITLE && pausedState.episode === EPISODE_TITLE, `${pausedState.show} | ${pausedState.episode}`);
check('overlay reuses the native synopsis and hides the native block', pausedState.summary?.startsWith('Ume Mizunoe') && pausedState.nativeMetaHidden, `${pausedState.summary?.slice(0, 30)} hidden=${pausedState.nativeMetaHidden}`);
await page.screenshot({ path: path.join(SHOTS, 'theater-paused.png') });
await page.keyboard.press('Space');
await sleep(300);
check('Space resumes and hides overlay', await page.evaluate(() => !document.querySelector('video').paused && !document.querySelector('.adn-improver-pause-overlay').classList.contains('is-visible')));

await page.keyboard.press('Shift+?');
await sleep(200);
check('? opens the help overlay', (await page.locator('.adn-improver-help').count()) === 1);
check('help lists every shortcut', (await page.locator('.adn-improver-help-row').count()) === SHORTCUTS_COUNT);
await page.screenshot({ path: path.join(SHOTS, 'help.png') });
await page.keyboard.press('Escape');
check('Escape closes help', (await page.locator('.adn-improver-help').count()) === 0);

await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'adn-test-input';
    document.body.prepend(input);
    input.focus({ preventScroll: true });
});
await page.keyboard.type('kk');
await sleep(100);
check('shortcuts ignored while typing', await page.evaluate(() => !document.querySelector('video').paused && document.getElementById('adn-test-input').value === 'kk'));
await page.evaluate(() => {
    document.getElementById('adn-test-input').remove();
    window.scrollTo(0, 0);
});

// Episode switching uses the player's native buttons (previous is hidden on episode 1).
await page.keyboard.press('Shift+N');
await sleep(200);
check('Shift+N clicks the native next-episode button', (await page.evaluate(() => window.__switchVideo)) === 1);
await page.keyboard.press('Shift+P');
await sleep(200);
check('Shift+P ignores the hidden previous-episode button', (await page.evaluate(() => window.__switchVideo)) === 1 && (await page.locator('.adn-improver-osd.is-visible').count()) === 1);

// ------------------------------------------------------- Theater toggling --

await page.keyboard.press('t');
await sleep(500);
const off = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-adn-theater'),
    marks: document.querySelectorAll('[data-adn-theater-wrapper],[data-adn-theater-chain],[data-adn-theater-inner],[data-adn-theater-aside],[data-adn-theater-stage]').length,
    wrapperWidth: document.querySelector('.adn-vjs-v4').getBoundingClientRect().width,
    headerTop: document.querySelector('header[data-testid="menuContent"]').getBoundingClientRect().top,
    titleAbovePlayer: document.querySelector('h1').getBoundingClientRect().bottom <= document.querySelector('.adn-vjs-v4').getBoundingClientRect().top + 1,
    buttonActive: document.querySelector('.adn-improver-theater-button')?.classList.contains('is-active'),
}));
check('T disables theater mode and restores the native layout', off.attr === null && off.marks === 0 && off.wrapperWidth < 1300 && off.headerTop === 0 && off.titleAbovePlayer, JSON.stringify(off));
check('theater button reflects state', off.buttonActive === false);
await page.keyboard.press('t');
await sleep(800);
check('T re-enables theater mode', await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater') === 'on' && Math.abs(document.querySelector('[data-adn-theater-wrapper]').getBoundingClientRect().width - document.documentElement.clientWidth) < 1));

await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
await sleep(400);
const bottom = await page.evaluate(() => ({
    header: document.documentElement.getAttribute('data-adn-header'),
    footerVisible: document.querySelector('footer').getBoundingClientRect().bottom <= window.innerHeight + 1,
    commentsSeen: document.querySelector('#comments-panel').getBoundingClientRect().top < window.innerHeight,
}));
check('scrolling reaches comments and footer', bottom.footerVisible && bottom.commentsSeen, JSON.stringify(bottom));
check('header visible once scrolled past player', bottom.header === 'visible');
await page.screenshot({ path: path.join(SHOTS, 'scrolled.png') });
await page.evaluate(() => window.scrollTo(0, 0));

// --------------------------------------------------------- SPA navigation --

await page.evaluate(() => history.pushState({}, '', '/video/genre/action'));
await sleep(900);
check('non-watch page disables everything', await page.evaluate(() => document.documentElement.getAttribute('data-adn-page') === 'other' && !document.documentElement.hasAttribute('data-adn-theater') && !document.querySelector('.adn-improver-control')));
await page.evaluate(() => history.pushState({}, '', '/video/1428-even-the-student-council-has-its-holes/32947-episode-2'));
await sleep(1200);
check('back on a watch page re-applies theater', await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater') === 'on' && Boolean(document.querySelector('.adn-improver-theater-button'))));

// ------------------------------------------------------------------ Popup --

check('extension id discovered', Boolean(extensionId), extensionId);
if (extensionId) {
    const popup = await context.newPage();
    const popupErrors = [];
    popup.on('pageerror', (error) => popupErrors.push(error.message));
    popup.on('console', (msg) => msg.type() === 'error' && popupErrors.push(msg.text()));
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await sleep(500);
    const popupState = await popup.evaluate(() => ({
        switches: document.querySelectorAll('.tile-switch').length,
        infoTiles: document.querySelectorAll('.tile-info').length,
        alwaysOn: document.querySelectorAll('.always-on li').length,
        shortcuts: document.querySelectorAll('.shortcut-row').length,
        labelsFilled: [...document.querySelectorAll('.tile-label, .always-on li, .shortcut-label')].every((element) => element.textContent.trim().length > 0),
        theaterChecked: document.querySelector('[data-key="theaterMode"]').getAttribute('aria-checked') === 'true',
        version: document.getElementById('version').textContent,
        noLinks: document.querySelectorAll('a[href]').length === 0,
    }));
    check('popup renders four switch tiles and two info tiles', popupState.switches === SETTINGS_COUNT && popupState.infoTiles === 2, `${popupState.switches} / ${popupState.infoTiles}`);
    check('popup lists always-on features and shortcuts, without external links', popupState.alwaysOn === ALWAYS_ON_COUNT && popupState.shortcuts === SHORTCUTS_COUNT && popupState.labelsFilled && popupState.noLinks, `${popupState.alwaysOn} / ${popupState.shortcuts}`);
    check('popup shows version', popupState.version === `v${EXTENSION_VERSION}`, `${popupState.version} vs manifest ${EXTENSION_VERSION}`);
    check('popup theater toggle reflects storage', popupState.theaterChecked === true);
    await popup.screenshot({ path: path.join(SHOTS, 'popup.png') });

    await popup.click('[data-key="theaterMode"]');
    await sleep(600);
    check('popup toggle propagates to the page', (await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater'))) === null);
    await popup.click('[data-key="theaterMode"]');
    await sleep(600);
    check('popup toggle back re-enables', (await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater'))) === 'on');

    await popup.click('[data-key="shortcuts"]');
    await sleep(400);
    await page.bringToFront();
    const tA = await currentTime();
    await page.keyboard.press('ArrowRight');
    await sleep(150);
    check('shortcuts switch disables the keyboard handling', Math.abs((await currentTime()) - tA) < 0.5);
    await popup.click('[data-key="shortcuts"]');
    await sleep(400);
    await popup.click('.tile-info');
    await sleep(200);
    check('shortcuts panel opens from its tile', await popup.evaluate(() => document.getElementById('view-shortcuts').classList.contains('is-active')));
    await popup.screenshot({ path: path.join(SHOTS, 'popup-shortcuts.png') });
    await popup.click('#view-shortcuts [data-back]');
    check('back button returns home', await popup.evaluate(() => document.getElementById('view-home').classList.contains('is-active')));
    check('popup has no errors', popupErrors.length === 0, popupErrors.join(' | '));
}

check('no console errors on the page', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

await context.close();
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
