# End-to-end fixtures

`watch-page.html` is the live DOM of a real ADN watch page
(`/video/1428-even-the-student-council-has-its-holes/32946-episode-1`,
copied from DevTools in October 2026) with:

- every `<script>` removed (including Next.js `__NEXT_DATA__`),
- external stylesheets, preloads and iframes removed,
- image / poster sources stripped (no network during tests),
- the video source replaced by the test clip `../sample.webm`,
- `fixture.css` (basics), `adn.css` and `fixture.js` injected.

`adn.css` is a subset of ADN's real stylesheet (`/_next/static/css/00f59a2a6f72fad6.css`):
the whole video.js skin (`.adn-vjs-v4 …`) plus every rule whose classes exist
in `watch-page.html`, with `@media` blocks preserved and external URLs
(fonts, images) dropped. It is what makes the control bar, the gradients and
the layout behave like production. `fixture.js` emulates the video.js state
classes (play / pause, inactivity) and the episode buttons.

The inline styled-components `<style>` blocks of the page are kept as is.
When ADN's markup changes, replace this file with a fresh dump and re-run
`npm run test:e2e`.
