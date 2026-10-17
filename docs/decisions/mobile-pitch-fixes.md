# Mobile pitch fixes (Wave 1, row 1g, bundle)

Tier Yellow. Branch `fix/mobile-pitch-fixes`, built on row 1f (`fix/quick-not-broadcast`, head
`c72ecc2`). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine goldens
are untouched.

## Scope

Each item re-verified at `c72ecc2`:

- HUD. One three-column grid at every width (`MatchPlayer.module.css` `.hud`). At 390px the momentum
  figure ran into the shot count ("50%" touching "0 SoT"). Below 420px the HUD now puts the two
  sides on the first row and the momentum bar on its own second row.
- Sprites. The pitch `PlayerImage`s were lazy, and the pre-match lists (your XI and the closed Boss XI
  `<details>`) were lazy too, so on a slow network opponents were empty rings at the kickoff stop.
  The pitch and the pre-match lists now pass `eager`; `BossRoster` takes an `eager` prop that only
  the pre-match card sets. `PlayerImage` stays the only image seam.
- Sprite scale. `.player` carried `scale(var(--sprite))`, so the carrier nameplate and the card pip
  shrank with the sprite (`--sprite` is 0.48, 0.7 and 0.9 by container width; the audit's 0.62 and
  0.78 are stale). The scale moves to an inner `.body` that holds the team ring, the cast aura and the
  sprite. `.player` is now `80px * --sprite` square, and the pip and plate offsets scale with
  `--sprite` so they sit where they did.
- Trails. The trail SVG used a `0 0 100 100` viewBox stretched onto the 100:64 pitch, so the origin
  ring was an oval. It now uses `0 0 100 64` with `y * 0.64`, the default aspect ratio, and
  `vector-effect: non-scaling-stroke` with stroke widths and dashes in `cqi` (1cqi is one pitch unit),
  so the strokes keep their old width.
- Shootout spot. The taker stood at `x: 86 / 14`; the pitch draws the spot at `cx 89 / 11`. The spot
  is now `89 / 11`.
- Nameplates. `nameplate(name)` in `src/ui/matchday/copy.ts`: names over 10 characters keep their
  first 9 and an ellipsis (33 of 1,025 species, such as "Crabomina…").

## RED output (commit `925bdb5`, verbatim excerpts)

Unit:

```
     × stages active ball carriers, supporting runs, save trajectories and shootout spots on the pitch 5ms
     × shows Crabominable's plate as Crabomina… 11ms
     × draws the trails in the pitch's own 100 by 64 box, so a trail origin stays round 9ms
AssertionError: expected 'Crabominable' to be 'Crabomina…' // Object.is equality
AssertionError: expected '0 0 100 100' to be '0 0 100 64' // Object.is equality
AssertionError: expected { x: 86, y: 50 } to deeply equal { x: 89, y: 50 }
      Tests  3 failed | 24 passed (27)
```

Playwright `e2e/mobile-pitch-fixes.spec.ts` on a build of `c72ecc2`:

```
390px: overlaps ["50% / 0 SoT","50% / 1 SoT"], carrier {"font":"11px","scale":0.48,"text":"Lurantis"}, pip {"x":154.5,"y":373,"w":4.3,"h":6.2}, trail origin {"x":171.6,"y":339.8,"w":7.1,"h":4.6}
360px: overlaps ["bar / 0 SoT","50% / 0 SoT","bar / 1 SoT","50% / 1 SoT"], carrier {"font":"11px","scale":0.48,"text":"Lurantis"}, pip {"x":144.1,"y":358.8,"w":4.3,"h":6.2}, trail origin {"x":158.8,"y":331.6,"w":6.5,"h":4.1}
320px: overlaps ["50% / 0 SoT","bar / 0 SoT","bar / Press","50% / Press","50% / 1 SoT","bar / 1 SoT"], carrier {"font":"11px","scale":0.48,"text":"Lurantis"}, pip {"x":130.2,"y":339.9,"w":4.3,"h":6.2}, trail origin {"x":141.7,"y":320.7,"w":5.6,"h":3.6}
sprites drawn at the kickoff stop: [true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,false,false,false,false]
    Expected: 22
    Received: 17
  4 failed
```

The computed font size of the plate was already 11px; the scale is what shrank it, so the spec
checks both. After RED one change to the spec: the plate scale rounds to one decimal, because
`offsetHeight` is a whole pixel (20) and the rendered height is 20.2, which read as 1.01.

## Measurements

Fix build (`677f01a`), golden cup8 G1 replay, live:

| Width | HUD overlaps | Plate scale | Card pip | Trail origin |
| ----- | ------------ | ----------- | -------- | ------------ |
| 390   | none         | 1           | 9 x 13   | 7.1 x 7.1    |
| 360   | none         | 1           | 9 x 13   | 6.5 x 6.5    |
| 320   | none         | 1           | 9 x 13   | 5.6 x 5.6    |

Kickoff stop of a managed match at 390px, with 400 ms of added latency on every request and 2 s on
the pre-match card: 22 of 22 sprites drawn (17 of 22 before).

An overlap counts when two HUD pieces share any height and sit less than 2px apart.

Screenshots: `docs/reports/mobile-pitch-fixes/390-live-pitch.png`, `360-live-pitch.png`,
`320-live-pitch.png`, `390-kickoff-stop.png`, and `390-live-pitch-before.png` (the RED build).

## Product decisions applied

None of section 2 applies. The row is display only.

## NOT RUN

- A physical phone check and a real slow network. The latency is Chrome's network emulation.
- Hosted CI and the GLM review.
- A browser run of a shootout. The spot move is covered by the unit guard.

## Carryover

- At 320px the scoreboard breaks "Goldenrod United" mid-word ("Goldenro / d United"). It predates
  this row and is not in its scope.
- A missed penalty's ball ends at `x: 91 / 9`, now 2 units from the spot, so a miss draws a short
  trail. Not changed here.
- Other rows' committed 390px screenshots predate the two-row HUD. They were left as committed.
