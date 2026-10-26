# Porsche night commercial

> A 30-second night commercial: a Porsche 911 GT3 on a wet street lined with warm and cool light, cut across five cameras, graded and scored.

- Type: 3D film
- Status: Built, final render pending
- Year: 2026
- Role: Direction, shot design, grade and sound. Scene built by directing Claude through the Blender MCP connector.
- Built with: Blender 5.2, Cycles, Compositor node groups, Sketchfab and Poly Haven assets, ElevenLabs sound and music, SheepIt render farm
- Canonical page: https://thebenn.me/work/porsche-night-commercial/

## Facts

- Length: 30 s, 720 frames at 24 fps
- Frame: 1920×1080, 2.39:1 letterbox
- Cameras: 5
- Light pillars on the street: 26
- Sound: 8 effects and a score
- Audio cost: ≈2,150 credits, about $0.39
- Preview render on my laptop: 97–240 s per frame at 33%
- Full render on that laptop: about 2 months

A 30-second car commercial at night. A Porsche 911 GT3 rolls out onto a rain-soaked street lined with alternating orange and cyan light pillars, filmed across five cameras and finished with a teal-orange grade, a 2.39:1 letterbox and a sound mix synced to the edit.

## The idea

Night and rain do half the work in car films. Wet asphalt turns every light into a long reflection, and a dark frame lets the car's paint carry the shot. So the whole scene is built around reflections: 26 light pillars alternate warm and cool down both sides of the road, and the road is a procedural wet-asphalt material that catches every one of them.

## Getting the style right

- **Colour.** Filmic AgX with high contrast, then a teal-orange grade in the compositor: cool shadows, warm highlights, and the orange body popping off the blue street.
- **Lens character.** Glow on the highlights, anamorphic streaks through the passing lights, a vignette and film grain.
- **Frame.** 2.39:1 letterbox, so it reads as cinema, not a render.
- **Weather.** Rain particles in the air, a rain-and-city ambience bed under everything.

## The edit and the sound

Five cameras cut on timeline markers. The wheels are driven by the distance the car travels, so they never slip, and the car follows a proper acceleration and braking arc. The score and eight sound effects were generated with ElevenLabs and placed on the timeline against the cuts. The timeline below is the actual structure of the music cue.

## Getting good performance

This is where the project hit a wall. My laptop's GPU, a Radeon R5 M330, cannot run Cycles, so everything renders on the CPU. Preview frames at a third of the resolution and 24 samples took between 97 and 240 seconds each. At full settings the 720 frames would have taken around two months.

So the fix was to stop rendering locally. I prepared a render-farm version of the file for SheepIt, the free community render farm: audio stripped, textures packed into the file, and output set to a PNG image sequence so a failed frame never ruins the rest. A second copy is set up for GPU rendering on a stronger PC. When the frames come back, they go onto the existing timeline with the sound that is already synced.

## Assets and credits

The car is a free CC BY model from Sketchfab and the night lighting comes from a Poly Haven HDRI. Both get credited in the finished film. Total spend on outside services was the audio, roughly $0.39.

## How it was made

I designed the shots, the grade and the sound, and checked every preview frame. The Blender scene itself was built by directing Claude through the Blender MCP connector, which runs Python inside a live Blender session. If you want a product film or a 3D spot made this way, [get in touch](/contact/).

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
