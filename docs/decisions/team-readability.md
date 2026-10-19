# Team readability (Wave 3, row 3d)

Tier Yellow. Branch `feat/team-readability` off `origin/main` at `c33fa17`. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the engine goldens are untouched. The row
stays in the pitch layer: `Broadcast.tsx`, its CSS module, two new pure modules in
`src/ui/matchday`, and `src/design`. `MatchPlayer.tsx`, `Touchline.tsx` and `player.ts` (row 3a)
are untouched.

## Scope

Re-verified at `c33fa17`:

- Each player already stood on a ring, `.body::before` in `Broadcast.module.css`, inside the
  scaled `.body` inside the `.player` element the frame loop moves. The ring was `--bc-user`
  (gold) or `--bc-opp` (blue) for every match.
- `--sprite` was 0.48 below a 520px pitch, so the 80px art drew at 38.4px on every phone width.
- The play badge (`pitch-ability`) was placed at the actor's point with `translate(-50%, -225%)`
  and nothing kept it on the pitch.
- `Opponent.theme` (`src/engine/types.ts:243`) is set for engine 4 and later
  (`src/engine/opponents.ts:121`): the one type all eleven share. Retained shirt-number runs have
  none.

The change:

- `src/ui/matchday/kit.ts` (new): `kitsFor(starters, theme)`. The user's kit is the
  `TYPE_PALETTE` colour of the type the most starters carry. The opponent's is its theme's
  colour, or `PITCH_KIT.opp` (the old `--bc-opp`) with no theme. If the two kits are less than 10
  apart, the opponent wears `PITCH_KIT.clash`, white.
- `src/design/color-distance.ts` (new): the CVD audit's metric (`simulate`, `distance`), moved out
  of `scripts/audit/theme-cvd.mts`, which now imports and re-exports it. `kitDistance(a, b)` is
  the smallest of the three visions the audit checks.
- `Broadcast.tsx` sets `--kit-user` and `--kit-opp` on the broadcast root, once per match. Each
  player reads `--kit` for its side: the ring, the carrier nameplate's border and the hot ring's
  glow. The unused `--bc-user-glow` and `--bc-opp-glow` tokens are gone.
- Sprite floor: `--sprite` is 0.55 below a 520px pitch, so the art draws at 44px.
- `src/ui/matchday/badge.ts` (new): `badgeCorner(point, badge, pitch)` returns the badge's top
  left corner in pitch percent, centred over the player with its bottom 1.25 badge heights above
  them, then moved the least distance that keeps the whole box on the pitch. The frame loop writes
  that corner; the badge's CSS keeps only its float-in animation.

## RED output (verbatim excerpt)

RED commit `33a3e60`. Unit, `pnpm vitest run` on the three new test files (3 of 3 files failed:
the 2 collected tests, plus `kit.test.ts` with 7 tests and `badge.test.ts` with 4 tests, which
could not import their missing modules):

```
     × sets the poison and water kits on the broadcast with motion on 59ms
     × sets the poison and water kits on the broadcast with motion off 39ms
 FAIL  src/ui/matchday/__tests__/badge.test.ts [ src/ui/matchday/__tests__/badge.test.ts ]
Error: Cannot find module '../badge' imported from /Users/paulo/Projects/pokedraft-team-readability/src/ui/matchday/__tests__/badge.test.ts
 FAIL  src/ui/matchday/__tests__/kit.test.ts [ src/ui/matchday/__tests__/kit.test.ts ]
Error: Cannot find package '@/design/color-distance' imported from /Users/paulo/Projects/pokedraft-team-readability/src/ui/matchday/__tests__/kit.test.ts
AssertionError: expected '' to be '#A33EA1' // Object.is equality
 Test Files  3 failed (3)
      Tests  2 failed (2)
```

Playwright `e2e/team-readability.spec.ts` as committed in `33a3e60`, on a build of `c33fa17`'s
app code (`CI=1`, chromium, no retries), 7 of 7 failed. The build ran in a scratch worktree at
`33a3e60` with the three new unit test files removed, because `next build` type-checks them and
they import modules that do not exist at RED.

```
390px: narrowest sprite 38.4px, rings rgb(251, 191, 36) 0px 0px 0px 2px | rgb(96, 165, 250) 0px 0px 0px 2px
360px: narrowest sprite 38.4px, rings rgb(251, 191, 36) 0px 0px 0px 2px | rgb(96, 165, 250) 0px 0px 0px 2px
320px: narrowest sprite 38.4px, rings rgb(251, 191, 36) 0px 0px 0px 2px | rgb(96, 165, 250) 0px 0px 0px 2px
390px: 13 badges, closest margin -62.3px, clipped ["Wishiwashi used Double-Edge! by 49.7px","Barboach used Future Sight! by 62.3px","Feebas used Double-Edge! by 38px","Croagunk used Sludge Bomb! by 52.3px","Feebas used Surf! by 26.8px"]
360px: 13 badges, closest margin -63.1px, clipped ["Wishiwashi used Double-Edge! by 52.8px","Skiploom used Mega Drain! by 6.3px","Barboach used Future Sight! by 63.1px","Feebas used Double-Edge! by 41.6px","Croagunk used Sludge Bomb! by 54.3px","Feebas used Surf! by 29.3px"]
320px: 13 badges, closest margin -65.1px, clipped ["Remoraid used Hyper Beam! by 5.2px","Wishiwashi used Double-Edge! by 55.1px","Skiploom used Mega Drain! by 15px","Barboach used Future Sight! by 65.1px","Feebas used Double-Edge! by 45.5px","Croagunk used Sludge Bomb! by 57px","Feebas used Surf! by 32.1px"]
    Expected: >= 44
    Received:    38.4
    Expected: true
    Received: false
  7 failed
```

The badge figures move by about a pixel between runs: the page clock drives the match, but the
badge's CSS float-in runs on real time. An earlier draft of the spec, which read the sprite width
from the `img`, failed the same 7 on the same build; the committed spec reads the scaled `.body`
frame instead, because each pose animation turns or squashes the `img` (at 390 a running sprite's
`img` box read 40.1px while its frame was 38.4px).

After RED one change to the spec: a player in the play (`data-hot`) wears a white ring with a glow
in the kit, so the kit colour check reads the other players and asks for at least 9 per side. The
first fix run failed only that check, on the hot user player.

## Measurements

`e2e/team-readability.spec.ts` at `1303a58`, golden cup8 G1 (Goldenrod United) watched live:

| Width | Narrowest sprite, before | After | Badges | Clipped before   | Clipped after | Closest margin after |
| ----- | ------------------------ | ----- | ------ | ---------------- | ------------- | -------------------- |
| 390   | 38.4px                   | 44px  | 13     | 5, up to 62.3px  | 0             | 0px                  |
| 360   | 38.4px                   | 44px  | 13     | 6, up to 63.1px  | 0             | 0px                  |
| 320   | 38.4px                   | 44px  | 13     | 7, up to 65.1px  | 0             | 1.6px                |

The pitch is 324px wide at 390 and 254px at 320.

The badge spec steps the page clock 50 ms at a time from kickoff to 90' and reads each badge's
on-screen box against the pitch box. A margin below zero is clipped. The five badges that clipped at
390 all rest at `left: 0.00%` after the fix (a debug run that printed each badge's style): their
players stood near the left goal line, and a badge centred on such a player hung up to half its
width past the end of the pitch. Badges that rest on an edge read 0 to 2px while their 0.45 s float-in (scale 0.9)
still runs; every frame of the float-in sits inside the rest box.

Kit distance, the CVD audit's Oklab distance times 100 under normal, protanopia and deuteranopia
(the smallest counts):

- Closest type pairs: fire and rock 1.5, water and flying 2.2, grass and ground 2.7, fire and bug
  2.8. Fire and rock are 11.5 apart to a normal eye and 1.54 under deuteranopia.
- White (`#F8FAFC`) against the 18 types: ice 12.0 is the closest, then steel 19.9, ground 19.9.
- The old opponent blue (`#60A5FA`) against flying is 1.6 and against water 5.1, so a flying or
  water user kit sends a themeless opponent to white.
- The golden G1 kits: poison against water is 13.54 at its closest (deuteranopia).

2f carryover, measured at `c33fa17` in the `fatigue.spec.ts` scene (pinned `fatigue-1` builder
run, R16 at 116', user slot 2), with a scratch spec that was not committed:

```
MEASURE 390: {"pitchW":324,"player":[38.39,38.39],"img":[40.10821533203125,40.10821533203125],"pip":[6,8],"arc":[24,8],"card":[9,13],"pipParent":"2"}
MEASURE 320: {"pitchW":254,"player":[38.39,38.39],"img":[40.35707092285156,40.357086181640625],"pip":[6,8],"arc":[24,8],"card":[9,13],"pipParent":"2"}
```

## Product decisions applied

- Decision 1: Quick and reduced motion show the rings. They are static identity in CSS, set once
  per match, and do not depend on motion (unit guard with motion off; browser guard with reduced
  motion).
- Decision 3: nothing numeric is added.

## Implementation decisions

- A dual-type starter counts once toward each of its types. "The squad's dominant type" reads as
  the type the squad shows most, and the opponent's theme is itself a type every member carries
  whether it is their first or second. A tie goes to the type seen first reading the slots in
  order, each starter's types in their own order. The golden G1 squad exercises both rules:
  poison (all four from dual types) and grass tie on 4, and Toxtricity in slot 0 brings poison
  first.
- The kit reads the starting eleven at kickoff and holds for the match. A substitute does not
  change the kit, because a kit is the side's identity, not a census.
- Too close means below 10 in the audit's metric. The audit asks 4 of type chips that also carry
  a label; a ring carries none and is about 20px wide on a phone. 10 sends 26 of the 153 type
  pairs to the fallback.
- One fallback, white, because it is at least 12 from every type in every vision, so it never
  clashes with a user kit. A unit guard checks all 18 user types against all 18 themes and no
  theme.
- The ring was already inside the element the frame loop moves, so the kit adds no element and no
  per-frame write: two custom properties on the broadcast root, set in the React render, memoised
  per match. The ring's spread goes from 2px to 3px (1.65px on a phone) so the colour reads.
- The metric moved to `src/design/color-distance.ts` instead of being copied, so the kit and the
  audit cannot drift. `scripts/audit/theme-cvd.test.ts` still passes against the re-export.
- The badge is measured in the commit's layout effect, once per React render (about 10 Hz) and only
  while a badge shows: the badge's `offsetWidth` and `offsetHeight` and the pitch's client size.
  Frames between renders reuse those numbers and read no layout. The badge's text, and so its
  size, changes only with a render.
- The clamp moves the badge, not the effect burst. The burst stays on the player; clipping it at
  the edge was not reported and reads as the move hitting the touchline.
- `badgeCorner` returns the player's point unchanged when the pitch is unmeasured (jsdom).

## Brief vs code

- "Compute `--sprite` with `max()`": `--sprite` is a unitless scale chosen by container tiers
  (0.48, 0.7, 0.9). A `max()` against the 44px floor would compare 0.48 with 44 / 80 = 0.55 and
  always pick 0.55, so the floor is the base tier itself. The 0.7 and 0.9 tiers already draw at 56
  and 72px.
- The 2f carryover ("size the sweat pip and stamina arc in px in the unscaled wrapper, like the
  carrier badge") does not reproduce. Both are already children of `.player`, the unscaled box,
  with px sizes: the pip 6 by 8 and the arc 24 by 8 at both 390 and 320 (output above). No guard
  was written, because none could be RED. Closed here with that evidence. Whether 6 by 8 is big
  enough on a real phone is left to the owner's phone check.
- "Opponent from its theme": the theme is `Opponent.theme`, set by the engine since engine 4.
  `BossRoster` derives its "<type> theme" chips from the roster instead; for engine 4 and later
  both give the same type.
- The hand-off's `TYPE_PALETTE` is in `src/design/stadium.ts:4`, as cited.

## Gates

At `1303a58`: lint, typecheck and build exited 0; all seven `check:*` scripts exited 0; 1,530
unit tests passed in 178 files; Prettier passed on the 12 touched code and test files.

Playwright (`CI=1`, fresh build at `1303a58`): chromium `team-readability` 7,
`pitch-card-containment` 12, `mobile-pitch-fixes` 4, `broadcast-frame-loop` 3, `fatigue` 1,
`callouts-type-effects` 4, `continuous-ball` 2 and `one-shared-timeline` 1 passed (34); the phone
projects ran `mobile-targets` and `mobile-acceptance`: 360 passed, 54 skipped by their own project
gates, none failed.

## NOT RUN

- A physical phone check (owner action).
- A frame-loop perf trace (p50 and p95 frame interval, long tasks, mutations per second). The
  ring adds no element and no per-frame write; the badge adds one layout read per render while a
  badge shows. `broadcast-frame-loop` and the frame-loop unit tests pass. Row 3b's perf rerun
  covers the pitch next.
- WebKit for the new spec (chromium only, like the other pitch specs).
- Hosted CI, the GLM review and the full e2e suite at the time of writing.

## Carryovers

- The ring sits on a dark disc over the turf. Dark (`#705746`) and fighting (`#C22E28`) are 4.3
  and 5.2 from the turf colour in the same metric, so a dark or fighting ring stands out less than
  the others. The disc keeps it visible; a bib or a lighter disc would be Wave 4 design work.
- Flash, kick dots and the HUD still use the fixed `--bc-user` and `--bc-opp`. Moving them to the
  kit would touch `MatchPlayer.tsx`, which row 3a rewrites.
