# thebenn.me

Personal site of Ben — developer from Slovenia, formerly filmmaker, photographer and music producer.

- Static site, no build step. GitHub Pages serves `index.html` straight from `main`.
- `assets/js/scene.js` — Three.js particle stage that morphs through the story (orb → lens → sound ridges → LED wall → `</>` → warp field), with bloom, RGB-shift and glitch post-processing.
- `assets/js/audio.js` — every sound on the site is synthesized with the Web Audio API (drone, UI ticks, shutter, pads, 808).
- `assets/js/main.js` — scroll choreography, film-leader intro, timecode HUD, interactive chapters, credits roll, Formspree contact form.
- Three.js r170 and the fonts (Big Shoulders Display, Instrument Sans) are vendored in `assets/` so the site has no runtime CDN dependencies.

Preview locally with any static server (ES modules don't load from `file://`):

```
python3 -m http.server 8000
```
