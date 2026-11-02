# ART.md: the art style rule (read before ANY design, sprite or visual change)

**Rule A0: everything we draw is 16-bit HD pixel art.** Think Super Nintendo / Mega Drive art, but drawn
sharper (more pixels) for a 1920 x 1080 screen. The person asked for this; it is not optional.
If a request does not fit this style, say so and suggest the 16-bit HD way.

## What "16-bit HD" means here

| ID | Rule |
| --- | --- |
| A1 | **Hard square pixels.** No blur, no smooth vector edges on game art. Draw small, then enlarge with `imageSmoothingEnabled = false` (`enlarge()` in `src/pixelart.js`). |
| A2 | **Pixel size.** Actors in the game (Santa, sleigh, bag, presents): 1 art pixel = 2 x 2 screen pixels (`ART_K = 0.24`, scale 4). Title screen and zoom: same art, just enlarged more. Icons: a 36 x 36 grid, enlarged 3x (`src/wheelicons.js`). Keep new art on the same pixel size as what is next to it. |
| A3 | **Dark outline.** 1 art pixel of `INK` (`#1a0a14`) around every object (`pixelate()` adds it). No black lines inside soft things (beard, fur, clouds): use a darker shade of the same colour there. |
| A4 | **Few colours, real shading.** About 3-5 shades per material, snapped to colour bands (`pixelate()`). Light comes from the **top-left**: light shade top-left, dark shade bottom-right, one or two white highlight pixels. |
| A5 | **Texture, not flat fills.** Cloth, fur, wood, burlap, brick get a pixel texture (`texture()` in pixelart.js, dithering or stitches). Large flat areas look unfinished. |
| A6 | **Cartoon and cute.** Round, friendly shapes. Faces: small solid dark eyes (no white around them, no blue anime eyes), pink blush, round red nose, no low angry brows. Santa = classic jolly cartoon Santa with a puffy cloud beard made of round shaded puffs. |
| A7 | **Christmas palette.** Reds `#d61f35`, golds `#ffd23f`, greens `#1f9e55`, snow whites `#f4f7ff`, night blues `#07051c`. Gold is for prizes and the jackpot. |
| A8 | **Small things are hand-placed.** Faces, logos and icons smaller than about 30 pixels are pixel maps or hand-placed pixels (`src/santaface.js`, `TUS_LOGO` in santa.js), not shrunk vector drawings. |
| A9 | **Text in the game** uses the pixel fonts already loaded (`Press Start 2P`, `VT323`) with the dark outline (`outlined()` in game.js). |
| A10 | **Effects** (sparkles, coins, stars, confetti) are square pixel particles (`src/fx.js`). Flashing stays at 3 per second or less. |
| A11 | **Far background = silhouette.** The town behind the game (`src/limerick.js`) is far away: dark night-blue silhouettes with only a little detail and no ink outline (like SNES parallax layers). Only warm lights keep colour (windows, the TUS logos, stars, tree lights). Trees are real-looking pines built branch by branch, not cartoon triangles. The front (Santa, chimneys, presents) must always stand out from it. |

## How to make new art (the pipeline)

1. Draw the object with simple shapes on a small canvas (`canvasFor()` in `src/drawkit.js`, or a 36 x 36 canvas).
2. `pixelate()`: snaps colours to bands and adds the 1-pixel outline.
3. `texture()` with a material mask, if it is cloth, fur or wood.
4. Stamp the hand-made pixel details (faces, logos) on top.
5. `enlarge()` by a whole number. Cache the result.

## Check before you commit (every visual change)

- Take a Playwright screenshot, crop it, and zoom in with nearest-neighbour. Look at it; do not guess.
- Compare it next to the existing art at the same size: same pixel size, same outline, same light direction?
- Check it at real game size too (small), not only zoomed in.
- Send the screenshot to the person.
