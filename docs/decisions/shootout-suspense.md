# Shootout with suspense (Wave 2 row 2e)

Branch `feat/shootout-suspense`, Yellow. No file under `src/engine`, `src/data` or `src/scouting`
changed. Shootout outcomes still come from the engine untouched; the goldens pass.

## Scope

- `src/ui/matchday/shootout.ts` (new) holds the pure shootout rules: `kickProgress` (the brief's
  `clamp01((now - kickAt) / (pace.kick / speed))`, 0 before the shootout and 1 once it is over),
  `kicksShown`, `suddenDeath`, `kickCues`, `stageKick` and `waitingPoint`.
- `stagePitch` takes an optional `kickProgress` and stages the kick in progress (index `kicks`)
  instead of jump-cutting to the last kick's result. Once every kick is taken it holds the last
  kick's reaction. The pens block now calls `stageKick` and `waitingPoint`; open-play staging is
  untouched, so the row 2b merge stays small.
- `MatchPlayer` computes `kickProgress` from `now`, `kickAt`, the pace and the speed, passes it to
  `Broadcast`, and plays each kick's cues once. `Broadcast` forwards it to `stagePitch`, shows the
  kick dots from `kicksShown`, and shows a "Sudden death" banner.
- `src/ui/matchday/crowd.ts` gains `penRoar(side, speed)`.
- `PACE` is unchanged: a live kick is still 1,200 ms, a Quick kick 300 ms.

## Kick timeline

| Progress | Taker | Ball | Keeper |
|---|---|---|---|
| 0 to 0.35 | runs from 7 back and 9 wide of the spot (`run`, name badge) | on the spot (89 / 11) | set on the line (97 / 3) |
| 0.35 to 0.60 | on the spot (`cast`) | flies spot to target with loft and a trail | on-time dive starts at 0.40 |
| 0.60 to 1.0 | `celebrate` on a goal, `idle` on a save | in the net (99 / 1), or parried 22 wide | reaction held |

- Aim by kick index: `[1, -1, -1, 1, -1, 1, 1, -1]`, cycling, 5 off centre.
- A save dives the ball's side and reaches it at 0.60. A goal on an even kick index beats a keeper
  diving the wrong way; on an odd index the keeper guesses right but starts at 0.60, too late.
- The engine records only `scored`, so every non-scored kick is staged as a save. The ticker copy
  still says "misses" (`kickLine`, unchanged).
- Waiting players stand on a two-row arc either side of halfway, slots 1 to 10, each slot keeping
  its place across kicks. The closest pair is at least 5 pitch units apart (x, y times 0.64).
- With motion, the kick dot, the pens score and the ticker line land at 0.60, when the reaction
  starts. Without motion they land when the kick ends, as before.

## Sounds (decision 1)

| Mode | Per kick |
|---|---|
| Live with motion | whistle (`foul`) at 0, the strike thud at 0.35, then a crowd roar on a goal (150 ms up, 500 held, 700 down, halved at 2x) or the glove (`playSaveSound`) at 0.60 |
| Quick, or Live with reduced motion | the outcome beat only, when the kick resolves: the goal horn (or the opponent goal sound) or the glove |

The still pitch uses the goal horn rather than the roar because Quick has no crowd bed and a
reduced-motion final kick resolves at full time, after the bed stops. Skip to full time resolves
every remaining kick at once and plays no burst: a batch of cues spanning more than one kick is
marked heard without sound.

## Sudden death

The engine (`shootoutOf` in `src/engine/match.ts`) takes `ENGINE_COEFFICIENTS.shootout.kicks` = 5
regulation kicks a side, user first, then level pairs. So index 10 (kick 11) is the first
sudden-death kick. `suddenDeath(index)` reads that coefficient. The banner shows while kick 11 or
later is in progress, with or without motion, and goes at full time.

## RED (commit `b6005f1`, output verbatim)

```
     × at kickProgress 0.2 the taker is mid run-up and the ball still sits on the spot 4ms
     × at kickProgress 0.5 the ball is in the air between the spot and the goal, trailing from the spot 0ms
     × on a saved kick the keeper dives to the side the ball goes and meets it 1ms
     × on a scored kick the keeper goes the wrong way 1ms
     × or guesses right but goes too late, still on the line when the ball is in 1ms
     × holds the last kick's reaction once the shootout is over 0ms
     × spreads the waiting players along an arc, at least 5 pitch units apart 0ms
     × shows from kick 11, with or without motion 16ms
     × Live: whistle, strike, then the crowd roar on a goal and the glove on a save, per kick 4120ms
     × Quick: the outcome beat only, the goal horn or the glove, per kick 290ms
     × Live with reduced motion: the outcome beat only, like Quick 2667ms
 FAIL  src/ui/matchday/__tests__/shootout.test.ts [ src/ui/matchday/__tests__/shootout.test.ts ]
Error: Cannot find module '../shootout' imported from /Users/paulo/Projects/pokedraft-shootout/src/ui/matchday/__tests__/shootout.test.ts
TestingLibraryElementError: Unable to find an element by: [data-testid="sudden-death"]
AssertionError: expected [] to deeply equal [ 'whistle:foul', 'kick', …(4) ]
AssertionError: expected [] to deeply equal [ 'horn', 'save' ]
AssertionError: expected [] to deeply equal [ 'horn', 'save' ]
AssertionError: expected 'idle' to be 'run' // Object.is equality
AssertionError: expected 89 to be close to 95, received difference is 6, but expected 0.0000049999999999999996
AssertionError: expected 'idle' to be 'dive' // Object.is equality
AssertionError: expected { x: 97, y: 50 } to deeply equal { x: 97, y: 43 }
AssertionError: expected { x: 98, y: 46 } to deeply equal { x: 1, y: 55 }
AssertionError: expected { x: 2, y: 46 } to deeply equal { x: 1, y: 55 }
AssertionError: expected 3.967999999999993 to be greater than or equal to 5
 Test Files  3 failed (3)
      Tests  11 failed | 3 passed (14)
```

The three that passed at RED are regression guards that hold before and after: no banner on kick
10, none at full time, and a still pitch (ball on the centre spot, no trail, all idle) without
motion.

## Browser proof

`e2e/shootout-suspense.spec.ts` (chromium project, 390x844, touch) installs Playwright's clock,
opens Watch live on the final of builder seed `shootout-1` (12 kicks, sudden death at kicks 11 and
12; found with a scratch search over `builderToken` seeds), steps the clock to the shootout and
asserts the run-up pose, the flight trail, the keeper dive on a goal and on a save, the pens score
at the reaction, the sudden-death banner on kick 11 and no horizontal overflow. Screenshots in
`docs/reports/shootout-suspense/`.

## NOT RUN

- Hosted CI and the coordinator's review (GLM): not run by this dispatch.
- A physical phone, and listening to the sounds on a device.
- 360 and 320 widths: no layout changed outside the pitch's own stage points.

## Carryovers

- Pausing mid-kick: the broadcast keeps its frame loop for 3 s after a pause, so the kick in
  progress plays on to its reaction (and its cues sound), and on resume the next kick starts at
  once because `kickAt` does not shift on pause. The second half predates this row.
- A 1,200 ms live kick leaves 420 ms of run-up and 480 ms of reaction. A longer `PACE.live.kick`
  would give the suspense more room; not changed here.
- The ticker says "misses" for a kick the pitch stages as a save.
