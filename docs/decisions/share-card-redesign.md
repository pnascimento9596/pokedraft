# Share card redesign

Display-only change to the 1200x630 card behind Download image, `/card` and the `/r/[token]` OG preview. Engine, run token, URL contract, status codes and cache headers are unchanged.

## Why sprites looked tiny

The default pixel pack ships 96x96 canvases whose visible sprite is 40 to 90 px. The card drew the whole canvas at 52 px, so creatures were 20 to 35 px. `card-images.ts` now trims the transparent padding, enlarges, and stands the sprite on the bottom of a square 120 px canvas. Pixel art scales by a whole number with the nearest-neighbour kernel when that lands within 80% of the 116 px target; otherwise it is enlarged one whole step past the target and fitted down (clean, slightly softer). Artwork packs are trimmed and fitted to 116 px. `PlayerPicture` is untouched.

## Geometry (card pixels)

- Pitch block 864x602 at (14,14), 12 px frame, field 840x578 at (26,26). Result panel 294x602 at (892,14).
- Token box 164x138: 120 px picture, 32 px name pill (Inter 600, 22 px) overlapping the picture by 14 px. 164 px is the widest real name ("Walking Wake", 152 px at 22 px) plus padding.
- Tokens are laid out in columns, not at the engine's x/y: slots are grouped by depth (gap over 10 stays a new column, a group over 4 tokens splits at its widest depth gap), columns are spread evenly across the width, and tokens in a column are spaced by least squares with at least 4 px between them. At most 5 columns occur, which is why 164 px fits. `card-layout.test.ts` asserts in-bounds and no overlap for all 8 formations.

## Rendering notes

Satori paints a radial-gradient as its last stop everywhere and an ellipsis glyph is missing from the Inter subset, so the vignette is four linear edge fades, ground shadows are stacked ellipses, and names are never truncated. `url(` is banned by `check:image-seam`, so gradients live in CSS and only lines and nets are inline SVG.

## Measured (FLAWLESS token, GET handler, 1 warm-up then 5 timed, median)

| | PNG bytes | render ms |
| --- | --- | --- |
| before | 97,283 | 49.2 |
| after | 292,593 | 146.8 |

Cold start (sprite trimming) was not measured. Responses stay CDN cached for a year.

## Known gaps

- Pixel sprites differ in size by species (whole-number scaling); crisp and softened ones sit side by side.
- Finish labels for non-champions render at 20 px to stay on one line.
- Worst-case pills (longest names in adjacent columns) are 2 px apart.
