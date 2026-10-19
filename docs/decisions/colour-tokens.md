# Colour tokens and CVD (Wave 4, row 4h1)

Branch `refactor/colour-tokens` off `origin/main` at `3d59cee` (after every Wave 4 row except
4g). Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are
untouched.

## Scope

- `scripts/audit/theme-color-lint.mjs` (`pnpm check:theme-colors`) also matches `rgb(`, `rgba(`,
  `hsl(` and `hsla(`, with the same skips (`design`, `__tests__`, `data`, `engine`, `scouting`
  and `*.test.*`). It now exports `lintSource` and `lintColors`, and has a unit test,
  `scripts/audit/theme-color-lint.test.ts`.
- Every one of the 129 lines it found outside `src/design` now reads a named token:
  - 71 tokens in the second `:root` block of `src/design/tokens.css`, each set to the old literal
    exactly as written (`--highlights-*`, `--road-*`, `--side-*`, `--pitch-*-shadow`,
    `--drawer-*`, `--star-badge-*`, `--type-chip-shadow`, `--brand-shadow`, `--type-icon-shade`
    and `--ball-fill`, `--ball-ink`, `--ball-shine` for `SoccerBall.tsx`);
  - `BLANK_PICTURE` in `src/design/card-tokens.ts` for the blank creature picture, because
    Satori draws it on the share card and Satori has no CSS variables;
  - two dead fallbacks removed (below).
- `scripts/audit/theme-cvd.mts` (`pnpm check:theme-cvd`) also audits `TYPE_PALETTE`, read from
  `src/design/stadium.ts`, and fails any pair under 4.01 (the audit's 4 plus a 0.01 margin) in
  normal, protanopia or deuteranopia vision, for the chip tokens and for `TYPE_PALETTE`.
- `TYPE_PALETTE`: five colours move (fire, flying, grass, poison, psychic). Dark chip tokens:
  `--type-fire` and `--type-grass` move one step of blue.
- New tools: `scripts/audit/colour-shots.mts` (the screenshot set), `scripts/audit/pixel-diff.mts`
  (pixel compare, optional magenta masks) and `scripts/audit/cvd-nudge.mts` (the palette search).

Files: `scripts/audit/theme-color-lint.mjs`, `scripts/audit/theme-cvd.mts`, their tests, the three
new tools, `src/app/globals.css`, `src/components/PlayerPicture.tsx`, `src/components/TypeIcon.tsx`,
`src/components/home/SidePanel.module.css`, `src/components/pitch/Pitch.module.css`,
`src/components/results/MatchHighlights.module.css`, `src/components/results/MatchList.module.css`,
`src/components/results/SoccerBall.tsx`, `src/components/run/DraftBoard.module.css`,
`src/components/run/RoadStrip.module.css`, `src/design/card-tokens.ts`, `src/design/stadium.ts`,
`src/design/tokens.css`, and the literal updates in `src/ui/matchday/__tests__/kit.test.ts`,
`src/components/matchday/__tests__/Broadcast.kit.test.tsx`,
`src/components/pitch/__tests__/silph-stadium.test.tsx` and `e2e/team-readability.spec.ts`.

## RED commit and output (verbatim excerpt)

RED `77e1b82` holds the extended lint, the extended CVD audit and both test files. Tools
`15a5d70` (screenshots, pixel diff) and `1a8b357` (palette search). GREEN `b4ffd13` (tokens) and
`958219b` (palette). `c53609c` adds the mask output to the pixel diff.

`pnpm vitest run scripts/audit/theme-cvd.test.ts scripts/audit/theme-color-lint.test.ts` at
`77e1b82`, 3 of 11 failed in 2 files:

```
     × finds no colour literal in the repository's src today 13ms
     × checks all eighteen chip tokens in both themes and both red-green deficiency simulations, each pair at least 4.01 apart (catches dark ground against grass at 4.0005 for protanopia) 6ms
     × checks TYPE_PALETTE, the pitch, icon and kit colours, each pair at least 4.01 apart in every vision (catches fire against rock at 1.54 for deuteranopia) 1ms
 Test Files  2 failed (2)
      Tests  3 failed | 8 passed (11)
```

The two CVD failures, as printed:

```
- []
+ [
+   "dark protanopia --type-ground --type-grass",
+   "dark deuteranopia --type-rock --type-fire",
+ ]

- []
+ [
+   "protanopia water flying",
+   "protanopia grass ground",
+   "protanopia poison ghost",
+   "protanopia grass bug",
+   "deuteranopia fire rock",
+   "deuteranopia fire bug",
+   "deuteranopia grass bug",
+   "deuteranopia poison ghost",
+   "deuteranopia normal psychic",
+   "deuteranopia fire grass",
+ ]
```

`pnpm check:theme-colors` at `77e1b82` exited 1:

```
app/globals.css:217: color belongs in src/design tokens
app/globals.css:309: color belongs in src/design tokens
...
components/run/RoadStrip.module.css:120: color belongs in src/design tokens
129 lines spell a colour outside src/design.
```

`pnpm check:theme-cvd` at `77e1b82` exited 1 (minimum 1.54, fire against rock, deuteranopia).

## Measurements

Literal count. The lint counts lines. 129 lines in 10 files outside `src/design`:
`MatchHighlights.module.css` 75, `SoccerBall.tsx` 15, `RoadStrip.module.css` 14,
`Pitch.module.css` 8, `SidePanel.module.css` 6, `DraftBoard.module.css` 3,
`MatchList.module.css` 3, `PlayerPicture.tsx` 2, `globals.css` 2, `TypeIcon.tsx` 1. No `hsl(` or
`hsla(` anywhere. The brief said about 111 and the hand-off about 135 occurrences; some lines
hold two literals, and the hand-off counted occurrences.

CVD minimum per row (Oklab distance x 100, the audit's metric), before at `77e1b82` and after at
`958219b`:

| Palette | Vision | Before | After |
| --- | --- | --- | --- |
| `TYPE_PALETTE` | normal | 5.6302 (grass, bug) | 5.1494 (grass, bug) |
| `TYPE_PALETTE` | protanopia | 2.1986 (water, flying) | 4.0242 (water, flying) |
| `TYPE_PALETTE` | deuteranopia | 1.5400 (fire, rock) | 4.0112 (fire, rock) |
| chip tokens, dark | protanopia | 4.0005 (ground, grass) | 4.0931 (ground, grass) |
| chip tokens, dark | deuteranopia | 4.0014 (rock, fire) | 4.0682 (fighting, fairy) |
| chip tokens, dark | normal | 4.1170 (rock, fire) | 4.1949 (rock, fire) |

The three light chip rows are unchanged (4.7158, 4.2112, 4.0846). Pairs under 4.01: 10 in
`TYPE_PALETTE` and 2 in the chip tokens before, 0 after.

Colour changes (old to new; change in Oklab x 100, normal vision):

| Colour | Old | New | Change |
| --- | --- | --- | --- |
| `TYPE_PALETTE.fire` | `#EE8130` | `#DD730F` | 4.740 |
| `TYPE_PALETTE.flying` | `#A98FF3` | `#AA96F6` | 1.726 |
| `TYPE_PALETTE.grass` | `#7AC74C` | `#89BC5F` | 4.384 |
| `TYPE_PALETTE.poison` | `#A33EA1` | `#A63EAA` | 1.493 |
| `TYPE_PALETTE.psychic` | `#F95587` | `#F65589` | 0.648 |
| `--type-fire`, dark | `#D9D792` | `#D9D791` | 0.119 |
| `--type-grass`, dark | `#5BC355` | `#5BC354` | 0.099 |

The full search output, with every candidate set, is `docs/reports/colour-tokens/cvd-nudge.txt`.

Pixels. `scripts/audit/colour-shots.mts` takes 7 scenes (home, road, draft six picks in, the pitch
with the picker hidden, results full page, the highlights panel, matchday frozen at 48') at
390x844, device scale 2, in light and dark: 14 shots. Headless Chromium, reduced motion,
animations off, a fixed clock.

- Base `3d59cee` against itself, two runs: 0 changed pixels in 14 of 14 shots
  (`diff-base-repeat.jsonl`).
- Base against the tokens commit `b4ffd13`: 0 changed pixels in 14 of 14 shots
  (`diff-tokens.jsonl`). The tokenising is pixel neutral on these scenes.
- Base against the palette commit `958219b` (`diff-palette.jsonl`): home, road and highlights 0
  in both themes. Changed pixels, the same count in both themes: draft 15,340 (max channel
  difference 30), pitch 25,775 (33), results 36,943 (33), matchday 2,473 (9). The masks show every
  changed pixel on a type colour of a moved type: the frames and glow of Nidorino and Koffing
  (poison) and Ninetales (fire) on the draft pitch; the cards of Talonflame (fire, flying),
  Skiploom (grass, flying), Lurantis (grass), Dragalge (poison), Roselia (grass, poison) and
  Croagunk (poison) on the results pitch; and on the matchday pitch the user's poison kit rings
  and Toxtricity's poison glow. No other pixel moved.

Scenes the shots do not reach, with how they are covered instead: hover states, the drag preview,
the goal overlay, the bottom-sheet backdrop and the blank picture. Every token value is the old
literal byte for byte, and a scripted check over the diff found every new `var(--name)` defined
in `src/design/tokens.css` or `src/design/stadium.css`, except `--star-color`, which
`MatchHighlights.tsx` sets inline and which keeps its fallback.

## Product decisions applied

- Hand-off 4.3 4h1 decides the lint, the dead code check, role-named tokens, the pixel check and
  the CVD audit; applied as written except where the code broke a premise (below).
- Blind challenges (decision 3): no new number reaches the player. Nothing to hide.
- No copy changes, so the dash lint and the fit labels are untouched.

## Re-decided, because the code broke the premise

- **Dead code.** `MatchHighlights.tsx` is live: `ResultsView.tsx:167` renders it on every results
  page, and `LiveRun.tsx` and `SharedRun.tsx` render `ResultsView`. So it is tokenised, not
  deleted.
- **"Two margins under 0.01."** The hand-off puts them in `TYPE_PALETTE`. They are in the dark chip
  tokens (`docs/reports/audits-2026-10-17/pokedraft-deep-audit-2026-10-17.md:285`: ground against
  grass at 4.0005, rock against fire at 4.0014). `TYPE_PALETTE` is far worse: 10 pairs under
  4.01, the lowest 1.54. Same principle, applied to both: change the fewest colours by the
  smallest amount that clears 4 by at least 0.01.
  - Fewest colours. The failing pairs form a graph, and the colours to move must touch every
    pair. The smallest such set has 5 colours: fire and grass (fire meets grass, bug and rock;
    grass meets ground and bug), then one of water or flying, one of poison or ghost, one of
    normal or psychic. That is 8 sets. For the dark tokens it is 2 colours, 4 sets.
  - Smallest change. `cvd-nudge.mts` searches every 8-bit colour within 40 per channel of each
    moving colour, nearest first in Oklab, the moving colours taking turns until none moves, and
    keeps white at least 12 from the moved colours (the kit fallback). The set with the least
    total change ships. It is a greedy search, not a proven optimum.
  - Poison moves, not ghost: the poison set totals 12.992 and the ghost set 13.024. The poison
    literals in the kit tests change with it.
- **Margin in the gate.** The check fails under 4.01, not 4, so the 0.01 margin is enforced, not
  only reached once.

## Implementation decisions

- **Token value equals the old literal.** Each token holds the literal exactly as the component
  spelled it, so the computed colour cannot change. The pixel diff confirms it on 14 shots.
- **One value per token, in `:root`.** Every moved literal was the same in both themes, so each
  token has one value, in the second `:root` block. Giving the dark studio gradients a light
  value is 4h2's job. The duplicated dark blocks in `tokens.css` are left for 4h2; the two chip
  edits change both copies of each line.
- **Role names.** Tokens are named for where they paint (`--road-final-glow`,
  `--highlights-win-edge`), not their colour. Where one value paints two roles in one file, the
  token takes the wider name (`--side-panel-shadow` for the card and the button).
- **SoccerBall.** The SVG fills move to `style` props reading `--ball-*`, because a `style` value
  is CSS and resolves `var()`; nothing else styles the ball's shapes, so precedence is unchanged.
- **Dead fallbacks.** `var(--text-muted, rgb(148, 163, 184))` became `var(--text-muted)`, because
  `--text-muted` is set in every theme. `var(--accent-light, rgb(56, 189, 248))` became
  `var(--highlights-star)`, because nothing defines `--accent-light`, so the fallback is what
  always painted. `var(--stadium-card, rgb(15, 23, 42))` became `var(--stadium-card)`, set in
  `stadium.css`.
- **The codemod is not committed.** The literal to token table ran once; the diff shows every
  mapping, and the committed screenshot and diff tools rerun the proof.
- **The search tool reruns on the pre-fix tree.** At this branch's head `cvd-nudge.mts` prints
  "failing pairs: none". To rerun the search, run it in a checkout of `b4ffd13`.

Principles. Build the Lever: the screenshot, pixel diff and palette search are committed tools,
not hand steps. Prove It Works: the pixel claim rests on 14 real shots against the base build,
with a measured noise floor of 0. Laziness Protocol: tokens copy literals instead of redesigning
colours, and the palette moves only the colours the failing pairs force. Encode Lessons in
Structure: the 0.01 margin lives in the check, not in a note.

## Tests changed by design

- `src/ui/matchday/__tests__/kit.test.ts`: fire `#EE8130` to `#DD730F` and poison `#A33EA1` to
  `#A63EAA` on six lines. Fire against rock still falls back to white.
- `src/components/matchday/__tests__/Broadcast.kit.test.tsx`: poison kit `#A63EAA`.
- `src/components/pitch/__tests__/silph-stadium.test.tsx`: the palette literal takes the five new
  values, and the name drops "authentic", since five colours now sit off the usual ones.
- `e2e/team-readability.spec.ts`: the poison ring is `rgb(166, 62, 170)`.

## Gates

At `958219b` (the commits after it change only `scripts/audit/pixel-diff.mts`, docs and proof):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,767 passed in 207 files.
- All eight `check:*` scripts exited 0: mirrors, image-seam, image-packs, client-bundle,
  theme-contrast, theme-colors, dashes, theme-cvd.
- Prettier passed on every changed file Prettier formats (`src/design/tokens.css` is in
  `.prettierignore`).

Playwright (`CI=1`, headless, every project at the config's 4 workers, a `next start` build of
`958219b`'s code, run with HEAD at `c53609c`, which changes only a script): 955 passed, 67
skipped, 0 failed, no retries, 18.4 minutes. That includes `team-readability` with the new poison
ring, `silph-stadium`, `contrast` and the `theme-*` specs. The screenshots the suite rewrote under
`docs/reports` were reverted.

## Brief vs code

- The hand-off says the lint's "unit test gains rgb and hsl fixtures". There was no unit test; this
  row adds `theme-color-lint.test.ts`.
- Literal counts: brief about 111, hand-off about 135 outside `src/design` (occurrences);
  measured 129 lines. Per file, the hand-off's `MatchHighlights.module.css` 79 and
  `RoadStrip.module.css` 16 are occurrences; the lint sees 75 and 14 lines.
- `MatchHighlights.tsx` is live, not dead (above).
- The "two margins under 0.01" are in the dark chip tokens, not `TYPE_PALETTE` (above).
- `PITCH_KIT`'s comment says white sits at least 12 from every type colour. Measured with
  `kitDistance`, ice `#96D9D6` sits at 11.998, at the base and after this row (ice did not move).
  The kit test's own bound is 10 and passes. Left as found.

## NOT RUN

- Review and hosted CI.
- A physical phone check and a real screen reader pass (owner actions).
- Shots at 360 and 320: the layout did not change.
- Pixel checks of hover, drag, the goal overlay and the blank picture (covered by the literal
  equality and the defined-token check above, not by screenshots).
- WebKit and Firefox shots: the pixel tool runs Chromium only.

## Carryovers

- 4h2: theme the dark studio colours now named `--highlights-*` (and the other single-value
  tokens) for light mode, and define the dark palette once.
- The ice-to-white comment in `stadium.ts` (11.998 against "at least 12").

Proof: `docs/reports/colour-tokens/` (pitch and matchday before, after and mask crops in both
themes, the results pitch mask, the three diff files and the palette search output).
