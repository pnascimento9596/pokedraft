# Fatigue on the pitch (Wave 2, row 2f)

Tier Yellow. Branch `feat/fatigue` off `origin/feat/smooth-movement` at `0588297` (row 2c, PR #94,
not merged at the time of writing), with `origin/feat/smooth-movement` merged in again at `5744f20`
(which carries `origin/main` with PR #93, set pieces). No file under `src/engine`, `src/data` or
`src/scouting` changed, so the engine goldens are untouched.

## Scope

Re-verified at `0588297`:

- The engine records energy in `MatchResult.windows[]` (`WindowSnapshot` in
  `src/engine/types.ts`): one snapshot at each window's last minute (5, 10, ... 90, then 95 ...
  120), `energy[slot]` 0 to 100 for the user's eleven formation slots and `onPitch[slot]` for who
  played there. The opponent has no energy. `src/engine/match.ts` takes the snapshot after the
  window's last minute and before decisions taken on it, so the 60' window still lists the player
  a 60' substitution takes off.
- Nothing on the pitch read energy.

The change:

- `src/ui/matchday/fatigue.ts` (new) holds the thresholds (`TIRED = 65`, `SPENT = 55`,
  `TIRED_REACH = 0.85`) and `energyAt(windows, slot, species, minute)`: the latest window at or
  before the minute, and only if that window recorded the same species in the slot. Otherwise
  null.
- `StageInput.windows` and `FrameView.windows` carry the match's snapshots; `Broadcast.tsx` passes
  `match.windows`. `StagedPlayer.energy` is the user's energy at the clock, null for the opponent,
  walkers, the shootout and anyone with no window.
- Slowdown. Open play is row 2c's Catmull-Rom spline through phase waypoints, so there is no lerp
  to scale. A tired player (energy below 65 at the phase's start) instead gets a waypoint 0.85 of
  the way from where they start the phase to the rested waypoint. Where they start is itself the
  previous tired waypoint, so the shortfall carries; the recursion is cut at 4 phases (the rest is
  under 0.15^4 of a move). Each waypoint is a fixed function of its phase index, so the spline
  stays continuous and C1 through it. Tangents, the ball's carry and the turnover start all read
  the same waypoints, so the ball, which rides its carrier, stays continuous too.
- Below 65: a sweat pip on the sprite (drips with motion on), `data-tired` on the player, and the
  run, sprint and dribble strides take 1.18 times as long (`--stride`). Below 55: a stamina arc
  under the sprite, lit to the energy share. Both render in the 10 Hz React render as children of
  the player element the frame loop already moves. No second per-frame writer.

## RED output (verbatim excerpt)

RED commit `1c38ae4` (7 of 9 failed; the ball bound and the no-energy pip guard passed, as guards
that must stay green do):

```
     × moves a slot at energy 60 0.85 of the way a slot at energy 90 goes over the same phase (catches no slowdown below 65) 7ms
     × stages a slot with no recorded energy at full pace and with no energy (catches made-up energy) 2ms
     × reads slot 7's energy from the player standing in it after the 60' substitution (catches Togepi's energy pinned on Kommo-o) 1ms
     × keeps Quick and reduced motion still: a tired slot stands on its formation spot (catches the slowdown moving a still pitch) 1ms
     × shows the sweat pip below 65 and not at 65 (catches an off-by-one threshold) 35ms
     × shows the stamina arc below 55 and not at 55 (catches an off-by-one threshold) 10ms
     × slows the stride of a player below 65 only (catches a fresh stride on a tired player) 9ms
AssertionError: expected [] to deeply equal [ 'pitch-sweat-user-2', …(2) ]
AssertionError: expected [] to deeply equal [ 'pitch-stamina-user-4' ]
AssertionError: expected [] to deeply equal [ 'user-2', 'user-3', 'user-4' ]
AssertionError: expected { x: 36.48, y: 65.4 } to deeply equal { x: 35.35, y: 64.32 }
AssertionError: expected [ undefined, undefined, …(9) ] to deeply equal [ null, null, null, null, null, …(6) ]
AssertionError: expected undefined to be 81 // Object.is equality
AssertionError: expected undefined to be 50 // Object.is equality
      Tests  7 failed | 2 passed (9)
```

## Measurements

Largest one-frame move at 1x, live pace, kickoff to full time, golden cup8 under `pd6.`, percent of
the pitch length. "Real" uses each match's own windows (none below 65, so no slowdown); "tired"
replaces every recorded energy with 50.

| Match         | 0    | 1    | 2    | 3    | 4    | 5    |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| Ball, real    | 3.88 | 3.66 | 3.70 | 3.22 | 3.12 | 3.36 |
| Ball, tired   | 3.73 | 3.34 | 3.65 | 3.20 | 3.12 | 3.37 |
| Player, real  | 4.94 | 3.33 | 3.01 | 3.48 | 3.53 | 3.32 |
| Player, tired | 5.19 | 3.33 | 2.85 | 3.06 | 3.49 | 3.32 |

- The 5.19 is row 2c's 300 ms save settle (match 0, 59.27', user slot 3). It is 4.94 fresh; the
  tired shape is further from the save's last frame. The guard bounds players at 5.5 and the ball
  at 4.
- The golden cup never falls below 65 energy (lowest 66 at 120'). With press set from kickoff in
  every match of every golden fixture, the lowest is 57. Below 55 needs low stamina, press and
  extra time.
- Browser at 390x844, chromium with touch, 3x scale: in the pinned R16 at 116', user slot 2
  (Magikarp, 42) shows the pip and the arc and slot 10 (64) the pip only; exactly one arc on the
  pitch, no opponent pip, no horizontal overflow.

## Decisions

- The window is the latest at or before the clock, as the touchline reads it
  (`src/ui/manager/touchline.ts`). The touchline shows a substitute as fresh until their first
  window; the pitch shows them with no energy (no pip, no slowdown). A fresh player shows neither
  anyway, and the pitch never puts a number on a player the engine did not record.
- The slowdown reads energy at each phase's start, not at the clock. Phase boundaries fall on
  window minutes (1.25 into 5), so the two agree within a phase, and the path does not jump when a
  window closes.
- `StageInput` takes the snapshots, not one window's energy. One window's energy would re-shape the
  whole past path each time a window closes, a jump at every boundary.
- Quick and reduced motion: positions stay on the formation spots (decision 1). The pip and the
  arc still render, still, like the yellow-card pip; the drip animation is off there.
- The browser proof uses a pinned builder run (`fatigue-1`, Magikarp in slot 2, press in every
  match), replayed by the live engine, because no golden run reaches 55.
- 0.85 applies to the move, not the clock. The tired player still reaches each new phase on time,
  short of the waypoint.

## NOT RUN

- GLM review (the coordinator runs it).
- The full Playwright suite (hosted CI runs it in eight shards).
- A physical phone check.
- 360 and 320 proof. No layout changed; the marks sit inside the player box.
- A per-frame guard at 2x.
