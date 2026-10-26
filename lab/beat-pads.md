# Beat pads

> Eight pads, four drums and a 16-step loop. No samples: every sound is built from oscillators and noise while you play.

Interactive version: https://thebenn.me/lab/beat-pads/

Before code, I made beats in FL Studio: cold keys, heavy low end, drill patterns. These pads are a pocket version of that, built entirely in the browser.

## Play it

Keys **A** to **K** play the eight synth pads. **Z**, **X**, **C** and **V** play kick, snare, hat and clap. The notes are the A minor pentatonic scale, so any combination sounds right. Program a loop on the grid, set the tempo and press **Play loop**.

## How the sounds are made

- **Synth pads.** A sawtooth and a slightly detuned square wave through a resonant low-pass filter that sweeps down from 5 kHz in a third of a second. That sweep is what makes it pluck. A feedback delay adds the echo.
- **Kick.** A sine wave that drops from 150 Hz to 44 Hz in a tenth of a second, pushed through a soft-clipping wave shaper for the 808 grit.
- **Snare.** Band-passed white noise around 1.9 kHz plus a short triangle-wave body.
- **Hat.** A 45-millisecond burst of noise above 8.4 kHz.
- **Clap.** Three noise bursts 12 milliseconds apart, the way real hands never quite hit at once.

## Keeping time

JavaScript timers drift, so the sequencer does not trust them to play notes. A timer wakes up every 25 milliseconds and schedules the next 120 milliseconds of hits on the audio clock, which is sample-accurate. That look-ahead pattern is why the loop stays tight even when the page is busy.

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
