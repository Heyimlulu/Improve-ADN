# ADN Improver

Browser extension that improves the [ADN (Animation Digital Network)](https://animationdigitalnetwork.com) streaming experience, in the spirit of *Improve Crunchyroll* but tailored to ADN's video.js player.

[Description en français](docs/description.fr.md) · [English description](docs/description.en.md)

## Features

Every feature can be switched on or off from the popup. Changes apply instantly on open tabs.

| Feature | Details |
| --- | --- |
| **Theater mode** | The player fills the window (or fits the width in 16:9). The rest of the page (episodes, summary, comments) stays reachable by scrolling. The header hides and slides back when the mouse reaches the top or once you scroll past the player. |
| **Theater button** | Toggle button in the player bar, next to fullscreen. |
| **Dark gradient control** | Hide the bottom black fade together with the controls, or always. Fixes the gradient that stayed over the picture in the previous theater mode. |
| **Pause overlay** | Dims the picture and shows show + episode title while paused. |
| **Playback speed** | Speed menu in the player bar (0.5× to 2×), `<` / `>` shortcuts, optional memory of the last speed. |
| **Picture-in-Picture** | Button in the player bar and `P` shortcut (subtitles are not rendered in the PiP window). |
| **Keyboard shortcuts** | YouTube-like controls, configurable seek and volume steps, `?` opens an in-player cheat sheet. |
| **Visual feedback** | Small on-screen badge confirming every action. |
| **Hide scrollbar** | Cleaner watch pages. |

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Space`, `K` | Play / pause |
| `←` / `→` | Seek ±5 s (configurable) |
| `J` / `L`, `Shift + ←` / `→` | Seek ±10 s (configurable) |
| `↑` / `↓` | Volume ±5 % (configurable) |
| `M` | Mute |
| `F` | Fullscreen |
| `T` | Theater mode |
| `P` | Picture-in-Picture |
| `<` / `>` | Playback speed −/+ 0.25× |
| `0` … `9`, `Home`, `End` | Jump to a position |
| `Shift + N` / `Shift + P` | Next / previous episode (best effort, uses the page's own links) |
| `?` | Show the shortcuts help |

Shortcuts follow your keyboard layout (AZERTY or QWERTY) and are ignored while typing in a field.

## Installation

### From source (Chrome, Edge, Brave…)

1. Clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder.

### From source (Firefox 115+)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

Store releases: coming soon. Zipped builds are attached to [GitHub releases](https://github.com/Heyimlulu/Improve-ADN/releases).

## Development

```bash
npm install
npm test            # eslint + static checks (manifest, i18n keys, syntax)
npm run build       # dist/adn-improver-v<version>.zip

npx playwright install chromium
npm run test:e2e    # loads the extension in headless Chromium against a mock watch page
```

The end-to-end test (`test/e2e/`) intercepts `animationdigitalnetwork.com` and serves `fixtures/watch-page.html`, the real DOM of an ADN watch page stripped of scripts and external assets (see `test/e2e/fixtures/README.md`). It checks the theater geometry, header behaviour, injected controls, gradient handling, shortcuts, pause overlay, SPA navigation and the popup. Screenshots are written to `test/e2e/screenshots/`.

Set `localStorage.adnImproverDebug = '1'` in the ADN tab's console to get verbose logs prefixed with `[ADN Improver]`.

### Project layout

```
manifest.json            MV3 manifest (fr default locale, en available)
_locales/                UI strings
shared/
  settings-schema.js     single source of truth for settings (popup + content)
  storage.js             SettingsStore over chrome.storage.sync
  shortcuts.js           shortcut reference (help overlay + popup)
  i18n.js                chrome.i18n wrapper
content/
  content.js             loader (dynamic import of main.js)
  main.js                bootstrap: services + features
  core/                  router (SPA), player watcher, actions, OSD, DOM helpers…
  features/              one file per feature, all extend core/feature.js
  styles/                base.css, player.css, theater.css
popup/                   settings UI rendered from the schema
scripts/                 build, version bump, static checks
test/e2e/                Playwright smoke test + real ADN watch page fixture
```

### How it works

- `content/content.js` is a classic content script that dynamically imports the ES module `content/main.js` (MV3 content scripts cannot be modules directly).
- `Router` polls the URL (Next.js navigation cannot be hooked from an isolated world) and classifies pages: a watch page matches `/video/<show>/<episode-id>`.
- `PlayerWatcher` finds the `<video>` / `.video-js` / `.vjs-control-bar` elements and notifies features whenever the player is replaced.
- Features read settings through `SettingsStore` and expose their state as `data-adn-*` attributes on `<html>`; the CSS does the rest. ADN's hashed class names (`sc-xxxx`) are never used: the theater layout is discovered at runtime from the DOM geometry.

### Adding a feature

1. Create `content/features/my-feature.js` extending `Feature` (implement `onEnable` / `onDisable`, declare `settingKeys`).
2. Register it in `FEATURES` in `content/main.js`.
3. Add its settings to `shared/settings-schema.js` and the labels to both locale files.
4. Add styles in `content/styles/`.
5. Run `npm test`.

## Release

The *Create Release* GitHub Action bumps the version, builds the zip, tags and publishes a release.

## License

[MIT](LICENSE)
