# ADN Improver

Browser extension that improves the [ADN (Animation Digital Network)](https://animationdigitalnetwork.com) streaming experience, in the spirit of *Improve Crunchyroll* but tailored to ADN's video.js player.

[Description en français](docs/description.fr.md) · [English description](docs/description.en.md)

## Features

Four switches in the popup, everything else is always on.

| Switch | Details |
| --- | --- |
| **Theater mode** (default on) | The player fills the window. The page keeps its two-column layout below the player: title, episodes and comments on the left, ADN's sidebar on the right. The header hides and slides back when the mouse reaches the top or once you scroll past the player. `T` toggles it. |
| **Pause overlay** (default on) | Dims the picture and shows the show, the episode title and the synopsis while paused, replacing ADN's own in-player title block. |
| **Keyboard shortcuts** (default on) | YouTube-like controls, `?` opens an in-player cheat sheet. |
| **Hide scrollbar** (default off) | Cleaner watch pages. |

Always on: theater button, playback speed menu (0.5× to 2×, last speed remembered), Picture-in-Picture button, bottom gradient hidden together with the controls, on-screen feedback for every action.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Space`, `K` | Play / pause |
| `←` / `→` | Seek ±5 s |
| `J` / `L`, `Shift + ←` / `→` | Seek ±10 s |
| `↑` / `↓` | Volume ±5 % |
| `M` | Mute |
| `F` | Fullscreen |
| `T` | Theater mode |
| `P` | Picture-in-Picture |
| `<` / `>` | Playback speed −/+ 0.25× |
| `0` … `9`, `Home`, `End` | Jump to a position |
| `Shift + N` / `Shift + P` | Next / previous episode (the player's own buttons) |
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
popup/                   settings UI (4 switches) rendered from the schema
scripts/                 build, version bump, static checks
test/e2e/                Playwright smoke test + real ADN watch page fixture
```

### How it works

- `content/content.js` is a classic content script that dynamically imports the ES module `content/main.js` (MV3 content scripts cannot be modules directly).
- `Router` polls the URL (Next.js navigation cannot be hooked from an isolated world) and classifies pages: a watch page matches `/video/<show>/<episode-id>`.
- `PlayerWatcher` finds the `<video>` / `.video-js` / `.vjs-control-bar` elements and notifies features whenever the player is replaced.
- Features read settings through `SettingsStore` and expose their state as `data-adn-*` attributes on `<html>`; the CSS does the rest. ADN's hashed class names (`sc-xxxx`) are never used: the theater layout is discovered at runtime from the DOM geometry.
- Controls injected into the control bar copy the computed geometry of ADN's fullscreen button and pin the properties a stylesheet could use to hide them (inline `!important`), so the skin cannot swallow them.

### Adding a feature

1. Create `content/features/my-feature.js` extending `Feature` (implement `onEnable` / `onDisable`, declare `settingKeys`).
2. Register it in `FEATURES` in `content/main.js`.
3. If it needs a switch, add it to `shared/settings-schema.js` and the labels to both locale files; otherwise leave `settingKeys` empty and it is always on.
4. Add styles in `content/styles/`.
5. Run `npm test`.

## Release

The *Create Release* GitHub Action bumps the version, builds the zip, tags and publishes a release.

## License

[MIT](LICENSE)
