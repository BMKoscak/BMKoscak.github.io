# XY scope

> Two sine waves, one in each ear, drawn as a picture. The trace at the top of every page on this site is this instrument.

Interactive version: https://thebenn.me/lab/xy-scope/

An oscilloscope in XY mode does not draw a wave over time. It feeds the left channel to the horizontal axis and the right channel to the vertical axis, so two signals become one picture. Feed it two sine waves and you get a Lissajous figure, named after the French physicist who studied them in the 1850s.

## What the controls do

- **Ratio.** The two frequencies as whole numbers. 1:1 is a circle or a line, 1:2 is a figure eight, 3:2 is the knot in this site's header. Every ratio of small whole numbers closes into a stable shape.
- **Phase.** How far the left wave is shifted. At 1:1, a quarter turn (90°) makes a circle and zero makes a diagonal line.
- **Drift.** A tiny phase change every frame, which makes the figure look like it is rotating in 3D. Real scopes do the same when two oscillators are almost but not quite in tune.

## Listening to it

Press **Listen to it** and the page plays the two waves, left and right, at 110 Hz times each side of the ratio. The trace then switches from maths to the real signal: it reads both stereo channels back with the Web Audio API's analyser and draws them. What you see is literally what you hear. Musicians call this oscilloscope music.

Use headphones and keep the volume low. Pure sine waves are quiet but piercing.

## How it is drawn

The trace is a single WebGL2 canvas shared by the whole site. Each frame it computes 1,400 short line segments, draws them twice with additive blending (a wide faint glow, then a thin bright core) and fades their brightness along the beam. That fade reads as phosphor persistence without needing a feedback buffer, so it stays cheap enough to run behind every page.

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
