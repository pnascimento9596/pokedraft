# Callouts and type effects

Wave 2 row 2g, Yellow, size M. Branch `feat/callouts-type-effects` off `fe6d183`.

## Scope

- `src/ui/matchday/timeline.ts`: each open-play phase gets a `moment` (`through`, `cross`,
  `key-duel`, `build-up` or null), set exactly when it carries a callout. Candidates are through
  balls and crosses received in the final third (formation slot `y >= 70`), duels in a phase that
  holds a goal or a save, and 15% of passes and dribbles. A callout needs 5 minutes since the last
  one; key duels skip that gap. The build-up roll is the same `playRng` draw the old 45% rule made,
  so the choreography is unchanged (the 1a pinned phases still match). The callout stream now draws
  once every phase, so a phase's call never depends on which other phases fire, and still never on
  the movesets.
- `src/ui/matchday/moves.ts`: `Effect` is any of the 18 types plus `impact`, `shield` and `dive`.
  `effectFor` returns the move's own type. The partial `TYPE_EFFECT` table is gone, since every
  type is now its own effect.
- `src/components/wheel/sound.ts`: `playAbilitySound` maps 21 effects onto ten synth families
  (flame, tide, spark, bloom, frost, mind, quake, strike, guard, dive). The nine existing tones
  are unchanged; `quake` is new for Ground and Rock.
- `src/ui/matchday/cutin.ts` (new): `cutInAt` returns a card only for a goal (from 25% of its
  staging, the old move-callout timing), a save, or a key-duel phase.
- `Broadcast.tsx` and its CSS: a lower-third card with `PlayerImage`, the move line and a
  `TypeIcon` badge. The twelve types without a tuned effect draw in their `TYPE_PALETTE` colour,
  passed as `--type-*` variables. The card keeps the `move-callout` and `save-callout` test ids.
  Below a 300px broadcast the type name is visually hidden and the icon stays.
- `MatchPlayer.tsx`: `cutIns={view === "live"}`. Quick keeps its plain goal and save lines.

## RED

Commit `e6401fe`. `pnpm vitest run` on the five touched test files: 9 failed, 53 passed of 62.

```
× gives every one of the 18 types its own effect family (catches Dragon and Ghost moves drawn as a plain impact)
  AssertionError: expected [ 'impact', 'fire', 'water', …(15) ] to deeply equal [ 'normal', 'fire', 'water', …(15) ]
× plays a synth family for every type and generic effect, ten families in all (catches a Dragon move that throws instead of sounding)
  TypeError: Cannot read properties of undefined (reading 'type')
× a pinned seed yields between 10 and 18 open-play callouts (60 before the budget)
  AssertionError: expected 60 to be less than or equal to 18
× calls a move only on final-third through balls, crosses, key duels and build-up
  AssertionError: expected 55 to be less than or equal to 18
× shows the scorer's sprite, move and type on a goal
× shows the keeper's move on a save, a shot on target
× shows the duel winner on the key duel that sets up the 40' goal
× still shows the goal card, unanimated, with reduced motion in a live match
  TypeError: Cannot read properties of null (reading 'getAttribute')
× Quick shows no cut-in through the 30' goal, while Live shows the goal card
  AssertionError: expected 0 to be greater than 0
```

The three negative cut-in checks (ordinary callout, card, Quick) passed at RED, as constraints
should.

## Measurements

Real cups: `cup8`, formations 4-2-3-1, 4-3-3 and 4-4-2, seeds `a1` to `f6`, every pick the first
offer, movesets loaded. 84 matches of 90 minutes.

| Open-play callouts per match | mean  | min | p10 | median | p90 | max |
| ---------------------------- | ----- | --- | --- | ------ | --- | --- |
| Before (`fe6d183`)           | 54.83 | 47  | 50  | 55     | 60  | 61  |
| After                        | 13.81 | 8   | 11  | 14     | 16  | 18  |

Pinned seed (`a1`, 4-2-3-1, match 1): 60 before, 12 after (3 key duels, 4 through balls, 1 cross,
4 build-up). The gap came from a scratch model over the same cups (86 matches, extra time
included, a fixed hash standing in for the build-up roll): no gap gave a mean of 25.49, 2 phases
19.80, 3 phases 16.36, 4 phases (5 minutes) 14.12, 5 phases 12.92. Matches with extra time run
longer and reach about 20.

## Product decisions applied

- Decision 12: about 12 to 15 callouts per match, every type with a visual and an audio family,
  big cards only on shots on target, goals, saves and key duels.
- Decision 1: Quick renders no card and no per-phase sound. Reduced motion shows the card without
  animation (`animation-name: none`, checked in Chromium).

## Brief versus code

- Shots on target: the engine records goals and saves only, and the HUD's SoT counts exactly
  those. So "shots on target, goals, saves" is goals plus saves.
- "Extend `TYPE_EFFECT`": the table became redundant once `Effect` includes every type, so it was
  removed rather than filled with 18 identity rows.
- Palettes: the six tuned effects (fire, water, electric, grass, ice, psychic) keep their existing
  `--fx-*` tokens. The other twelve take `TYPE_PALETTE`.

## Gates

At `f755466` (after merging `origin/main` at `e7f2012`): lint, typecheck and build exit 0, 1,421
unit tests pass in 161 files, and the Playwright set in `STATE.md` passes 383 with 54 skipped.

`e2e/one-shared-timeline.spec.ts` waited 60 s for a badge of one of the six old effects. With about
14 callouts a match, a run at `0543f18` failed that wait twice. It now accepts any of the 18 types
and fingerprints the new quake family, and passed in 32 s.

## Carryovers

- Reduced motion stages no open play (pre-existing `stagePitch` still branch), so key-duel cards
  and pitch badges never show there. Goal and save cards do.
- A pitch badge on a player near the touchline can clip at the pitch edge (seen in
  `390-callout-badge.png`). Pre-existing badge placement, not changed here.

## NOT RUN

- Typecheck at the RED commit (the tests use the new `cutIns` prop and `moment` field, so it is
  expected to fail there).
- Full local Playwright suite (hosted CI runs it). Physical phone check, iOS Safari audio included.
- Independent review and GLM: the coordinator runs them.
