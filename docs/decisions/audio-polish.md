# Audio polish (Wave 2 row 2h)

Branch `feat/audio-polish`, Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed.

## Scope

- `unlockAudio` runs inside the tap on Watch live (`MatchList`) and on Go to the match (`PreMatch` in
  `MatchdayFlow`). Both open an autostarted `MatchPlayer`, so before this a player with sound on
  heard nothing until they pressed Pause and Resume.
- Synthesized crowd bed in `src/components/wheel/sound.ts`: two seconds of seeded white noise
  (`createRng("crowd-bed")`, no `Math.random`, no assets) looped through a 700 Hz band-pass. One gain
  follows the staged ball's x, a second gain carries goal roars. `startCrowdBed`, `setCrowdLevel`,
  `crowdRoar`, `stopCrowdBed`; `setSoundEnabled(false)` also stops the bed.
- Pure rules in `src/ui/matchday/crowd.ts`: `crowdGain(ballX)`, `roarFor(goal, speed)`,
  `kickPassDue(index, phase, lastKick)`.
- `MatchPlayer` runs the bed only while `soundOn && view === "live" && moving`, so Quick, a pause, a
  manager stop, full time, the sound toggle and unmount (leaving the matchday or closing Watch live)
  all stop it through one effect cleanup. `Broadcast` gains an optional `onBall(x)` prop, called
  from an effect with the staged ball's x, and only passed while the bed runs.
- Roars play when the goal lands (the existing horn gate) and only in Live. Durations divide by the
  2x speed setting; the level follows the staged ball, which already respects speed.

## Values

| Rule | Value |
|---|---|
| Bed gain at x = 0 / 50 / 100 | 0.06 / 0.03 / 0.09, piecewise linear, clamped |
| Normal goal roar | 150 ms up, 900 ms held, 1200 ms down (2250 ms) |
| Equaliser at 80' or later | 150 ms up, 2400 ms held, 2400 ms down (4950 ms) |
| Roar peak | 0.32 user goal, 0.16 opponent goal |
| Kick thud | a pass phase with no callout, and at least 3 phases after the last thud |

The kick rule is gap based rather than `index % 3 === 0`: it keeps more thuds (a pass at phase 5
still thuds) while never sounding twice in any three phases.

## RED (commit `da0bcc8`, output verbatim)

```
   × Watch live unlocks audio before the autostarted broadcast opens (catches a silent Watch live) 61ms
   × Go to the match unlocks audio inside the tap (catches an autostarted match that never unlocks sound) 77ms
     × over phases 0 to 16 the thud sounds 5 times: 0, 5, 8, 12, 16, never twice within three phases 907ms
     × Live with sound on starts one crowd bed and moves its level with the ball 726ms
     × stops on pause and starts again on resume 216ms
     × stops at full time 159ms
     × stops when the player unmounts 157ms
     × roars once for the 30' goal, a normal 2250 ms roar 1221ms
 FAIL  src/ui/matchday/__tests__/crowd.test.ts [ src/ui/matchday/__tests__/crowd.test.ts ]
Error: Cannot find module '../crowd' imported from /Users/paulo/Projects/pokedraft-audio-polish/src/ui/matchday/__tests__/crowd.test.ts
AssertionError: expected 6 to be 5 // Object.is equality
AssertionError: expected [ 'watch:1' ] to deeply equal [ 'unlock', 'watch:1' ]
 Test Files  4 failed (4)
      Tests  8 failed | 2 passed (10)
```

`src/components/wheel/__tests__/sound.test.ts` at the same commit:

```
   × the crowd bed stays silent while sound is off (catches a crowd that plays with the toggle off) 2ms
   × turning sound off stops a running crowd bed (catches a crowd that outlives the toggle) 1ms
   × a roar ramps up, holds and releases on its own envelope, in seconds 1ms
TypeError: sound.startCrowdBed is not a function
      Tests  3 failed | 1 passed (4)
```

The two Quick and sound-off bed tests passed at RED because nothing started a bed yet; they pin the
silence after the fix.

## Measurements

- Kick thuds over phases 0 to 16 of the pinned match (seed `audio-26`, real movesets): 6 before
  (phases 0, 5, 6, 8, 12, 16), 5 after (0, 5, 8, 12, 16).
- Browser (Playwright chromium, 390x844, touch): before the tap no AudioContext exists; after tapping
  Watch live one context reads `state === "running"` and one crowd source starts; Sound off stops
  it; Pause stops it. Screenshot `docs/reports/audio-polish/watch-live-390.png`.

## Brief vs code

- The brief implies a kick thud on every phase. At this head callouts cover most phases (2g thins
  them), so the pinned quick-test fixture thuds only 3 times in 16 phases today. The cap matters once
  2g lands; the guard uses a seed with a back-to-back pair.

## Product decisions applied

- Decision 1: Quick stays still with beat SFX only. No crowd bed, no roar, no per-phase thud in Quick.
- Sound off is silence, bed included.

## NOT RUN

- iOS Safari audio on a real device (owner action).
- Playwright RED of the browser scene against the pre-fix build (reasoned from the code: before the
  fix no handler on the Watch live path called `unlockAudio`).
- Full local Playwright suite (hosted CI runs it).
- GLM review (coordinator).
