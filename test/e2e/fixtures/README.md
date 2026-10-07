# End-to-end fixtures

`watch-page.html` is the live DOM of a real ADN watch page
(`/video/1428-even-the-student-council-has-its-holes/32946-episode-1`,
copied from DevTools in October 2026) with:

- every `<script>` removed (including Next.js `__NEXT_DATA__`),
- external stylesheets, preloads and iframes removed,
- image / poster sources stripped (no network during tests),
- the video source replaced by the test clip `../sample.webm`,
- `fixture.css` (minimal Tailwind + video.js stand-in) and `fixture.js`
  (video.js state classes, play/pause, episode buttons) injected.

The inline styled-components `<style>` blocks of the page are kept as is.
When ADN's markup changes, replace this file with a fresh dump and re-run
`npm run test:e2e`.
