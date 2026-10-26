# Vision mixer

> The basic controls of a live TV switcher: pick the next shot on preview, then cut, mix or wipe it to air.

Interactive version: https://thebenn.me/lab/vision-mixer/

I help cover live soccer for SNL and NZS broadcasts, and the vision mixer is the heart of every one of those control rooms. This is its simplest possible form, with my own camera position at a stadium as one of the sources.

## How a switcher thinks

A vision mixer has two rows of buttons. **Program** is what is on air right now. **Preview** is the shot you have lined up next. You never change program directly: you set up preview, check it, then transition.

- **CUT** swaps preview and program instantly. Most of a live match is cuts.
- **AUTO** runs the transition for a set number of frames. Here it is 25, one second at the 25 frames per second used in Europe.
- **The T-bar** is the lever. Push it by hand to control the transition yourself, fast or slow.
- **MIX** dissolves one picture into the other. **WIPE** pushes a hard edge across.
- **Tally** is the red light on a camera that tells the operator they are on air. During a transition both sources are live, so both tallies light up.

## The bars

Colour bars are the test signal every broadcast chain starts and ends with. They let engineers check that colours and levels arrive the way they left. If you see bars on a real program feed, something upstream is not ready yet.

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
