# Live-token pins

Tier Green. Branch `test/live-token-pins` off `eceb581`. Wave 6 row 6t. Only e2e specs, the
generated `e2e/pins.ts`, the generator `scripts/e2e/render-pins.ts` and its test changed. No file
under `src/` changed, and `src/engine/__tests__/goldens.test.ts` is byte-identical to `origin/main`.

## Goal

Before this row, about 40 e2e specs built a "live" token as `"pd6." + GOLDEN_CUP8_V5.slice(4)`, held
literal `pd6.` tokens, or asserted engine 6 outcomes (rounds, minutes, slots, species, scores) as
literals. After the 6b9 flip, `pd6` routes to a frozen bundle, so those specs would keep passing
while testing the retained engine 6 bundle instead of the live engine. Now every such spec reads
its token and its engine-output literals from `e2e/pins.ts`, which `pnpm e2e:pins` regenerates
from the live engine. An engine bump changes `pins.ts` (or throws in the generator), never a spec.

## Guard

`scripts/e2e/render-pins.test.ts` scans every `.ts`/`.tsx` file under `e2e/` except `pins.ts`
line by line and fails on:

- `pd${RUN_TOKEN_VERSION}` followed by optional backslashes and `.` or `?` (a token, a regex
  source such as `pd6\\.`, or a share link `/r/pd6?t=`),
- `pd${` (a token built by template),
- `ENGINE_VERSION`'s value (`pokedraft-engine-6`, mocked `engineVersion` rows).

This is broader than the brief's literal `pd6.`. It brings the mocked board rows into scope, which
hand-off 4.2 lists under 6t. The prefix and engine are read from `@/engine/types`, so the scan
follows the bump. `pnpm e2e:pins --check` (and the first test in the same file) fails when
`pins.ts` is stale.

RED: `37d9ee1`, 1 of 2 tests failed with 45 offender lines across 37 files.

## Pins

Rendered values for today are identical to the literals the specs asserted before.

| pin | how it is found | today |
| --- | --- | --- |
| `LIVE_PREFIX`, `LIVE_GOLDEN_CUP8`, `LIVE_GOLDEN_KANTO151` | `pd${RUN_TOKEN_VERSION}.` plus the v5 golden bodies | `pd6.` |
| `HAPTICS` | fixed G3, scores before and at the conceded goal | `2-1`, 2 goals before, 6 total |
| `INJURY_STAGING` | first user injury with an injury sub, golden cup8 | QF 42', slot 1, Roselia for Kommo-o |
| `RED_CARD` | first user red, golden cup8 | QF 6', slot 2 |
| `CONTINUOUS_BALL` | fixed G1, save at 59' checked | G1, 59 |
| `FULLSCREEN_SCORE_BUG` | fixed G1, opponent club and short name | Goldenrod United, Goldenrod |
| `TEAM_READABILITY` | fixed G1, `kitsFor` colours | `rgb(166, 62, 170)`, `rgb(99, 144, 240)` |
| `SET_PIECES` | first user goal of each kind | solo G1 49', header R32 9', penalty R32 84', free kick R32 17' |
| `MATCHDAY_CARRYOVERS` | first key-duel play callout | "Remoraid used Hyper Beam!" |
| `HONEST_MOMENTUM` | `Math.round(50 + lean * 28)` at kickoff and second half | `50%50%`, `36%64%` |
| `GIANT_KILLER` | search `achievements-<n>` from 0 | `achievements-19` |
| `CHAMPION` | search `e2e-reveal-<n>` from 0 for an 8-0-0 champion | `e2e-reveal-59`, 868, Dragapult |
| `SHOOTOUT` | search `shootout-<n>` from 0, engine-v4 fixture squad, opens user goal then opponent miss, more than 10 kicks | `shootout-1`, F |
| `INJURY_STOP` | search `e2e-a11y-<n>` from 47, stop 0 injury, stop 1 half time | `e2e-a11y-47` |
| `FATIGUE` | fixed squad and seed, first extra-time minute with exactly one spent and one tired slot | R16 116', slots 2 and 10 |

Searches are capped at 200 seeds and throw when none matches, so a bump that loses a property fails
`pnpm e2e:pins` loudly instead of pinning a wrong seed.

## Decisions

- Searches start at 0 and find today's seeds, except `INJURY_STOP`. From 0 the first hit is
  `e2e-a11y-1` (injury at 33'), so the search starts at 47 to reproduce today's seed, as the brief
  allows. The achievements and shootout families keep their existing names (`achievements-<n>`,
  `shootout-<n>`) instead of an `e2e-` prefix, so today's tokens stay byte-identical.
- Rounds that always exist (G1, G2, G3) stay literal in specs whose assertion only needs the token.
  Where a spec relies on an event in a fixed round, the generator checks the event and throws on a
  bump that removes it.
- Probe minutes that are not engine facts stay literal: the crowded 38' probe in
  `smooth-movement.spec.ts`. The 59' save is checked by the generator.
- The momentum constant 28 is duplicated from `MatchPlayer.tsx`. A change there fails the browser
  assertion, not silently.
- The solo goal has two pressers; the pin takes the one the scorer runs past (ahead at 260 ms,
  behind at 910 ms).
- `e2e-coach*` specs assert no engine literals and are unchanged.

## Brief vs code

- The test-chores hazard text is at lines 246 to 261 of `docs/decisions/test-chores.md`.
- `set-pieces.spec.ts` has two call sites (cup8 and kanto151 bodies). Both now use pins.
- `head-to-head.spec.ts:103` is only a regex; it now escapes `LIVE_PREFIX`.
- `fatigue.spec.ts` already encoded its token for the live engine; it now reads the token and the
  round, minute and slots from `FATIGUE`.
- Extra fake `pd6.e2e-*` tokens on mocked rows (`wave5-carryovers`, `seed-board`, `board-ux`,
  `achievements` history) now use `LIVE_PREFIX`.

## Carryovers

- Unit tests under `src/` still build `pd6.` tokens. Out of scope (no `src/` change in this row).
