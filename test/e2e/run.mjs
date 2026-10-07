/**
 * End-to-end smoke test.
 *
 * Loads the unpacked extension in Chromium (new headless mode), intercepts
 * animationdigitalnetwork.com to serve `mock-watch.html` (a page mimicking the
 * structure of an ADN watch page) and exercises every feature: theater
 * layout, header behaviour, control-bar buttons, gradient handling, shortcuts,
 * pause overlay, SPA navigation and the popup.
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
const SHOTS = path.join(HERE, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const SAMPLE = await ensureSampleVideo(path.join(HERE, 'sample.webm'));
const WATCH_URL = 'https://animationdigitalnetwork.com/video/1428-even-the-student-council-has-its-holes/32946-episode-1';
const results = [];
let failures = 0;

function check(name, condition, info = '') {
    results.push(`${condition ? 'PASS' : 'FAIL'} ${name}${info ? ` (${info})` : ''}`);
    if (!condition) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adn-improver-e2e-'));
const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1600, height: 900 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required'],
});

await context.route('https://animationdigitalnetwork.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sample.webm') {
        return fulfillMedia(route, fs.readFileSync(SAMPLE), 'video/webm');
    }
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(HERE, 'mock-watch.html'), 'utf8') });
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

await page.goto(WATCH_URL);
await page.waitForSelector('html[data-adn-page="watch"]', { timeout: 10000 }).catch(() => {});
await sleep(3200); // let the delayed relayouts run

const html = page.locator('html');
check('page classified as watch', (await html.getAttribute('data-adn-page')) === 'watch');
check('theater attribute set', (await html.getAttribute('data-adn-theater')) === 'fill');

const geometry = await page.evaluate(() => {
    const wrapper = document.querySelector('[data-adn-theater-wrapper]');
    const aside = document.querySelector('aside');
    const player = document.querySelector('.video-js');
    const header = document.querySelector('header');
    const r = (el) => el && el.getBoundingClientRect().toJSON();
    return {
        wrapperClass: wrapper?.className,
        wrapper: r(wrapper),
        player: r(player),
        aside: r(aside),
        header: r(header),
        asideMarked: aside?.hasAttribute('data-adn-theater-aside'),
        rowMarked: Boolean(document.querySelector('[data-adn-theater-row]')),
        innerCount: document.querySelectorAll('[data-adn-theater-inner]').length,
        scrollHeight: document.scrollingElement.scrollHeight,
        innerHeight: window.innerHeight,
        innerWidth: document.documentElement.clientWidth,
        headerVisible: document.documentElement.getAttribute('data-adn-header'),
        headerTransform: header && getComputedStyle(header).transform,
    };
});
check('wrapper is the player wrapper', geometry.wrapperClass?.includes('player-wrapper'), geometry.wrapperClass);
check('wrapper starts at x=0', Math.abs(geometry.wrapper?.left) < 1, `left=${geometry.wrapper?.left}`);
check('wrapper is viewport wide', Math.abs(geometry.wrapper?.width - geometry.innerWidth) < 1, `${geometry.wrapper?.width} vs ${geometry.innerWidth}`);
check('wrapper is viewport tall', Math.abs(geometry.wrapper?.height - geometry.innerHeight) < 1, `${geometry.wrapper?.height} vs ${geometry.innerHeight}`);
check('player fills wrapper', Math.abs(geometry.player?.height - geometry.innerHeight) < 1 && Math.abs(geometry.player?.width - geometry.innerWidth) < 1, JSON.stringify(geometry.player));
check('wrapper at top of page', Math.abs(geometry.wrapper?.top) < 1, `top=${geometry.wrapper?.top}`);
check('sidebar moved below the player', geometry.asideMarked && geometry.rowMarked && geometry.aside.top >= geometry.innerHeight - 1, `aside.top=${geometry.aside?.top}`);
check('page remains scrollable', geometry.scrollHeight > geometry.innerHeight + 400, `scrollHeight=${geometry.scrollHeight}`);
check('header hidden at top', geometry.headerVisible === 'hidden' && geometry.header.bottom <= 0, `${geometry.headerVisible} bottom=${geometry.header?.bottom}`);

// Header appears when the mouse reaches the top.
await page.mouse.move(800, 10);
await sleep(400);
check('header shown on hover near top', (await html.getAttribute('data-adn-header')) === 'visible');
await page.mouse.move(800, 400);
await sleep(400);
check('header hidden again', (await html.getAttribute('data-adn-header')) === 'hidden');

// Control bar additions.
const controls = await page.evaluate(() => ({
    theater: Boolean(document.querySelector('.vjs-control-bar .adn-improver-theater-button')),
    theaterActive: document.querySelector('.adn-improver-theater-button')?.classList.contains('is-active'),
    rate: document.querySelector('.vjs-control-bar .adn-improver-rate-button .adn-improver-control-text')?.textContent,
    rateItems: document.querySelectorAll('.adn-improver-menu-item').length,
    pip: Boolean(document.querySelector('.vjs-control-bar .adn-improver-pip-button')),
    pipEnabled: document.pictureInPictureEnabled,
    orderOk: (() => { const bar = document.querySelector('.vjs-control-bar'); const kids = [...bar.children]; return kids.indexOf(bar.querySelector('.vjs-fullscreen-control')) === kids.length - 1; })(),
}));
check('theater button injected and active', controls.theater && controls.theaterActive);
check('rate menu injected with 7 items', controls.rate === '1×' && controls.rateItems === 7, `${controls.rate} / ${controls.rateItems}`);
check('pip button injected when supported', controls.pip === controls.pipEnabled, `pipEnabled=${controls.pipEnabled}`);
check('buttons inserted before fullscreen', controls.orderOk);

// Gradient handling: tagged + hidden with controls.
await page.evaluate(() => document.getElementById('video').play());
await sleep(500);
const gradientBefore = await page.evaluate(() => ({
    mark: document.querySelector('.bottom-shade')?.getAttribute('data-adn-player-gradient'),
    opacity: getComputedStyle(document.querySelector('.bottom-shade')).opacity,
    controls: document.documentElement.getAttribute('data-adn-controls'),
    playing: document.documentElement.getAttribute('data-adn-playing'),
}));
check('gradient layer tagged', gradientBefore.mark === 'layer', gradientBefore.mark);
check('gradient visible while controls visible', gradientBefore.opacity === '1' && gradientBefore.controls === 'visible', JSON.stringify(gradientBefore));
check('playing attribute mirrors video', gradientBefore.playing === 'true');
await sleep(1800); // mock player goes user-inactive after 1.5 s
const gradientAfter = await page.evaluate(() => ({
    opacity: getComputedStyle(document.querySelector('.bottom-shade')).opacity,
    controls: document.documentElement.getAttribute('data-adn-controls'),
}));
check('gradient hidden once controls hide', gradientAfter.controls === 'hidden' && gradientAfter.opacity === '0', JSON.stringify(gradientAfter));

// Shortcuts.
const t0 = await page.evaluate(() => document.getElementById('video').currentTime);
await page.keyboard.press('ArrowRight');
await sleep(150);
const t1 = await page.evaluate(() => document.getElementById('video').currentTime);
check('ArrowRight seeks +5 s', t1 - t0 > 4.5 && t1 - t0 < 5.6, `${t0.toFixed(2)} -> ${t1.toFixed(2)}`);
await page.keyboard.press('j');
await sleep(150);
const t2 = await page.evaluate(() => document.getElementById('video').currentTime);
check('J seeks -10 s (clamped at 0)', t2 < t1 && t2 >= 0, `${t1.toFixed(2)} -> ${t2.toFixed(2)}`);
await page.keyboard.press('Shift+>');
await sleep(150);
check('> increases playback rate', (await page.evaluate(() => document.getElementById('video').playbackRate)) === 1.25);
check('rate label updated', (await page.locator('.adn-improver-rate-button .adn-improver-control-text').textContent()) === '1,25×');
check('OSD shown', await page.locator('.adn-improver-osd.is-visible').count() === 1);
await page.keyboard.press('m');
await sleep(100);
check('M unmutes (video started muted)', (await page.evaluate(() => document.getElementById('video').muted)) === false);
await page.keyboard.press('k');
await sleep(700);
const pausedState = await page.evaluate(() => ({
    paused: document.getElementById('video').paused,
    overlay: document.querySelector('.adn-improver-pause-overlay')?.classList.contains('is-visible'),
    show: document.querySelector('.adn-improver-pause-overlay-show')?.textContent,
    episode: document.querySelector('.adn-improver-pause-overlay-episode')?.textContent,
}));
check('K pauses and shows the overlay', pausedState.paused && pausedState.overlay, JSON.stringify(pausedState));
check('overlay title parsed from h1', pausedState.show === 'Even the Student Council Has Its Holes' && pausedState.episode === 'Épisode 1 - Le début', `${pausedState.show} | ${pausedState.episode}`);
await page.screenshot({ path: path.join(SHOTS, 'theater-paused.png') });
await page.keyboard.press('Space');
await sleep(300);
check('Space resumes and hides overlay', await page.evaluate(() => !document.getElementById('video').paused && !document.querySelector('.adn-improver-pause-overlay').classList.contains('is-visible')));

await page.keyboard.press('Shift+?');
await sleep(200);
check('? opens the help overlay', (await page.locator('.adn-improver-help').count()) === 1);
check('help lists every shortcut', (await page.locator('.adn-improver-help-row').count()) === 14);
await page.screenshot({ path: path.join(SHOTS, 'help.png') });
await page.keyboard.press('Escape');
check('Escape closes help', (await page.locator('.adn-improver-help').count()) === 0);

// Typing in an input must not trigger shortcuts.
await page.evaluate(() => { const i = document.createElement('input'); i.id = 'search'; document.body.prepend(i); i.focus({ preventScroll: true }); });
await page.keyboard.type('kk');
await sleep(100);
check('shortcuts ignored while typing', await page.evaluate(() => !document.getElementById('video').paused && document.getElementById('search').value === 'kk'));
await page.evaluate(() => { document.getElementById('search').remove(); window.scrollTo(0, 0); });

// T toggles theater mode (persisted) and restores the native layout.
await page.keyboard.press('t');
await sleep(500);
const off = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-adn-theater'),
    marks: document.querySelectorAll('[data-adn-theater-wrapper],[data-adn-theater-chain],[data-adn-theater-row],[data-adn-theater-inner],[data-adn-theater-aside]').length,
    wrapperWidth: document.querySelector('.player-wrapper').getBoundingClientRect().width,
    headerTop: document.querySelector('header').getBoundingClientRect().top,
    buttonActive: document.querySelector('.adn-improver-theater-button')?.classList.contains('is-active'),
    stored: null,
}));
check('T disables theater mode', off.attr === null && off.marks === 0 && off.wrapperWidth < 1300 && off.headerTop === 0, JSON.stringify(off));
check('theater button reflects state', off.buttonActive === false);
await page.keyboard.press('t');
await sleep(800);
check('T re-enables theater mode', await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater') === 'fill' && Math.abs(document.querySelector('[data-adn-theater-wrapper]').getBoundingClientRect().width - document.documentElement.clientWidth) < 1));

// Scroll to the bottom: header comes back, content reachable.
await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
await sleep(400);
const bottom = await page.evaluate(() => ({
    header: document.documentElement.getAttribute('data-adn-header'),
    footerVisible: document.querySelector('footer').getBoundingClientRect().bottom <= window.innerHeight + 1,
    commentsVisible: document.querySelector('.comments').getBoundingClientRect().top < window.innerHeight,
}));
check('scrolling reaches footer and comments', bottom.footerVisible && bottom.commentsVisible, JSON.stringify(bottom));
check('header visible once scrolled past player', bottom.header === 'visible');
await page.screenshot({ path: path.join(SHOTS, 'scrolled.png') });
await page.evaluate(() => window.scrollTo(0, 0));

// SPA navigation away and back.
await page.evaluate(() => history.pushState({}, '', '/video/genre/action'));
await sleep(900);
check('non-watch page disables everything', await page.evaluate(() => document.documentElement.getAttribute('data-adn-page') === 'other' && !document.documentElement.hasAttribute('data-adn-theater') && !document.querySelector('.adn-improver-control')));
await page.evaluate(() => history.pushState({}, '', '/video/1428-even-the-student-council-has-its-holes/32947-episode-2'));
await sleep(1200);
check('back on a watch page re-applies theater', await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater') === 'fill' && Boolean(document.querySelector('.adn-improver-theater-button'))));

// Next episode detection (Shift+N) uses the episode list; mock only has anchors.
const nextHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('[data-testid^="season-list-item-"] a')];
    return a[2]?.getAttribute('href');
});
await page.evaluate(() => history.replaceState({}, '', '/video/1428-even-the-student-council-has-its-holes/32947-episode-2'));
await page.evaluate(() => { for (const a of document.querySelectorAll('.episodes a')) a.addEventListener('click', (e) => { e.preventDefault(); window.__clicked = a.getAttribute('href'); }); });
await page.keyboard.press('Shift+N');
await sleep(200);
check('Shift+N targets the next episode link', (await page.evaluate(() => window.__clicked)) === nextHref, await page.evaluate(() => window.__clicked));

// Popup.
check('extension id discovered', Boolean(extensionId), extensionId);
if (extensionId) {
    const popup = await context.newPage();
    const popupErrors = [];
    popup.on('pageerror', (e) => popupErrors.push(e.message));
    popup.on('console', (m) => m.type() === 'error' && popupErrors.push(m.text()));
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await sleep(500);
    const popupState = await popup.evaluate(() => ({
        tabs: [...document.querySelectorAll('.tab')].map((t) => t.textContent),
        rows: document.querySelectorAll('.row').length,
        shortcuts: document.querySelectorAll('.shortcut-row').length,
        theaterChecked: document.getElementById('setting-theaterMode').checked,
        version: document.getElementById('version').textContent,
        seekLabel: [...document.querySelectorAll('.shortcut-label')][1]?.textContent,
    }));
    check('popup renders 4 non-empty tabs', popupState.tabs.length === 4 && popupState.tabs.every(Boolean), popupState.tabs.join('|'));
    check('popup renders every setting', popupState.rows === 15, String(popupState.rows));
    check('popup lists shortcuts with live values', popupState.shortcuts === 14 && /\b5 s\b/.test(popupState.seekLabel), popupState.seekLabel);
    check('popup shows version', popupState.version === 'v3.0.0', popupState.version);
    check('popup theater toggle reflects storage', popupState.theaterChecked === true);
    await popup.screenshot({ path: path.join(SHOTS, 'popup.png') });

    // Toggle theater off from the popup and check the watch tab reacts.
    await popup.click('[data-key="theaterMode"] .switch-track');
    await sleep(600);
    check('popup toggle propagates to the page', (await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater'))) === null);
    check('dependent rows greyed out', await popup.evaluate(() => document.querySelector('[data-key="theaterSize"]').classList.contains('is-disabled')));
    await popup.click('[data-key="theaterMode"] .switch-track');
    await sleep(600);
    check('popup toggle back re-enables', (await page.evaluate(() => document.documentElement.getAttribute('data-adn-theater'))) === 'fill');

    await popup.click('.tab[data-section="shortcuts"]');
    await popup.fill('#setting-seekStep', '8');
    await popup.dispatchEvent('#setting-seekStep', 'change');
    await sleep(400);
    check('number setting saved and reflected in shortcut list', await popup.evaluate(() => /\b8 s\b/.test([...document.querySelectorAll('.shortcut-label')][1].textContent)));
    const tA = await page.evaluate(() => { const v = document.getElementById('video'); v.currentTime = 1; return v.currentTime; });
    await page.bringToFront();
    await page.keyboard.press('ArrowRight');
    await sleep(150);
    const tB = await page.evaluate(() => document.getElementById('video').currentTime);
    check('page uses the new seek step', tB - tA > 7.5 && tB - tA < 8.6, `${tA} -> ${tB}`);

    await popup.click('.tab[data-section="manage"]');
    popup.on('dialog', (d) => d.accept());
    await popup.click('#reset');
    await sleep(500);
    check('reset restores defaults', await popup.evaluate(() => document.getElementById('setting-seekStep').value === '5'));
    check('popup has no errors', popupErrors.length === 0, popupErrors.join(' | '));
}

check('no console errors on the page', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

await context.close();
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
