# Chains of Hera

> A six-chapter, N64-style action-adventure about Heracles that runs in a browser tab. Every texture, model and note of music is generated in code.

- Type: Browser game
- Status: Playable demo
- Year: 2026
- Role: Game design, art direction, level design, testing. Code written with Claude as my coding partner.
- Built with: Three.js r128, Web Audio API, Canvas 2D textures, Gamepad API, ElevenLabs voice-over
- Canonical page: https://thebenn.me/work/chains-of-hera/
- Play it in your browser: https://thebenn.me/Chains-of-Hera/
- Source on GitHub: https://github.com/BMKoscak/Chains-of-Hera

## Facts

- Chapters: 6
- Hero model: ~880 triangles
- Textures: 64×64, painted at load
- Render size: 640×480 or 854×480
- Game logic: 60 Hz fixed step
- Sound effects: ~35, positional
- Placement bugs caught by lint: 40
- Install size: 1 HTML file

Chains of Hera is a third-person action game about Heracles freeing Zeus from Hera's chains. It runs in a browser tab with nothing to install: one HTML file, one script from a CDN, and the voice-over files. You can [play it right now](https://thebenn.me/Chains-of-Hera/).

I grew up on rented N64 cartridges, and I wanted that exact feeling back. Chunky polygons, blurry textures, fog that hides the edge of the world, and a hero who can actually fight.

## The brief I set myself

- A real game with a story, not a tech demo: six chapters from burning Thebes to the top of Olympus.
- Late-90s console 3D, not pixel art. Low triangle counts, tiny textures, vertex colours and fog.
- No borrowed assets. Every model, texture, song and sound effect is generated in code at runtime.
- Keyboard, mouse or a gamepad, on an ordinary laptop.

## Getting good performance

A browser tab is a small budget, so the rules came from the N64 itself.

- **Render small, scale up.** The game draws at 640×480 (or 854×480 in widescreen) and the browser scales it to the window. That is a quarter of the pixels of a 1080p frame, and it is also exactly the look I wanted.
- **Triangle budgets.** Heracles is about 880 triangles. Enemies and villagers stay in the same range.
- **Merge the world.** Static scenery is batched into a few large meshes, so each chapter is a handful of draw calls instead of thousands.
- **Tiny textures.** Every texture is a 64×64 tile painted with Canvas 2D when the game loads. Nothing is downloaded.
- **Fixed-step logic.** The game updates at a steady 60 Hz and the renderer interpolates between steps. Physics behaves the same on a fast desktop and a slow laptop.

## Getting the style right

The first version of Heracles was built from boxes. It played fine and looked like a crate with legs. The second pass replaced every character with sculpted torsos, tapered limbs, painted faces and hair, still inside N64-sized triangle budgets.

The world got the same treatment: a gradient sky dome with a sun and drifting clouds, hazy mountains, repainted textures, dry and lush ground patches, and soft shadows near walls. Olive and cypress trees, grass tufts and flowers are batched into the same few meshes as the buildings.

The HUD was the last style problem. Small text at 640×480 turns to mush when it is scaled up, so the final HUD uses large outlined lettering, framed panels and key-chip prompts that read from across a room.

## Finding ideas

I started from the myth, not from the old game. That gave me six places with their own rules:

1. **Thebes** under siege, with a sword on a temple altar and secrets on the rooftops.
2. **The Forest of Nemea**, where a golden lion hunts.
3. **The Swamp of Lerna**, where you light three beacons to open the Hydra's lair.
4. **The Labyrinth of Crete**, generated so the corridors always connect, with Ariadne's thread to follow.
5. **The Underworld**, with a ferry toll for Charon and the Stair of Souls.
6. **Mount Olympus**, where stepping off the gold road drops you into the void.

Each chapter adds one new mechanic, so the game keeps teaching you something instead of repeating a checklist.

## Sound

The score is synthesized with the Web Audio API in a Greek-sounding mode: lyre, flute, a string pad and drums. When enemies start chasing you, brass, timpani and faster drums fade in. At low health a heartbeat layer comes in, and the melody ducks when someone is talking. On top of that sit about 35 sound effects, panned left and right by where they happen. The narrator and characters are AI voice-over made with ElevenLabs.

## Testing a game nobody is watching

Placing hundreds of props by hand produces floating amphorae and trees inside walls. I wrote a layout lint plus a reachability check that walks every chapter like a player would. It found 40 objects that were floating, buried or impossible to reach, and they were fixed before release. Quests were also played start to finish with simulated input, without a renderer, to catch logic bugs.

## How it was made

I designed the game, the chapters and the look, played every build and decided what changed. The code was written with Claude as my coding partner, and the voice-over is generated speech. The repository says the same thing on its front page.

## Where it stands

It is a playable demo. Bugs are expected and reviews are welcome on the [GitHub issues page](https://github.com/BMKoscak/Chains-of-Hera/issues). If you want something like this for a brand, a launch or a museum, [get in touch](/contact/).

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
