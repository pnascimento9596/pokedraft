# Matchday simulation, SVG soccer ball and broadcast UX overhaul

No file under `src/engine` changed. Every run token and match replay stays byte-for-byte identical.

## Root cause of the static wiggle

Two things kept the earlier broadcast from looking like a soccer match.

1. `Broadcast.tsx` placed each player at their static formation slot plus a small sinusoidal wobble (`driftPoint`, amplitude 1.5 to 3.5 percent of the pitch), and `ambientBall` moved the ball on an independent sine curve that never visited a player's feet.
2. `Broadcast.module.css` put `transition: left 0.25s linear, top 0.25s linear` on `.player` while `MatchPlayer.tsx` ticked `requestAnimationFrame` every 16 ms. Each frame reset the CSS transition target before the 250 ms transition had moved 7 percent of the way, damping player motion on screen to a tiny in-place quiver.
3. `MatchPlayer.tsx` only mounted `Broadcast` when `view === "live"`. A player who switched on Manager mode while `matchView` stayed at its `quick` default never saw the pitch at all.

## First-principles 2D match choreography (`src/ui/matchday/timeline.ts`)

`buildTimeline` now builds `plays`, a deterministic chain of 1.25-minute open-play phases (`72` in regulation, `96` with extra time) seeded from `broadcast:<seed>:<matchIndex>:plays` when `match.windows` is present.

- Each `PlayPhase` records the side in possession, the phase kind (`pass`, `dribble`, `through`, `cross`, `duel`), `fromSlot`, `toSlot`, two off-ball supporting `runners`, the defending `presserSlot`, the `actor` `PitchRef`, and an optional canon move `callout` (`playCallout` in `src/ui/matchday/moves.ts`).
- Phases in the same window as a recorded goal or save hand possession to the attacking side and route the final pass or dribble to the recorded scorer or shooter slot.
- `stagePitch(timeline, input)` computes the full `PitchStage` at any clock minute.
  - Between phase boundaries, each outfield player interpolates smoothly (`smoothstep`) between waypoints that shift with possession, tactical line height, off-ball supporting runs, and defensive pressing.
  - Goalkeepers track the ball laterally inside their six-yard box and dive (`pose: "dive"`) on goals and saves.
  - During open play, the ball sits at the carrier's feet on dribbles or flies from `fromSlot` to `toSlot` with parabolic `loft` and continuous `spin`, accompanied by a `BallTrail` (`kind: "pass" | "dribble" | "shot" | "save"`).
  - On a save beat, `saveBall` drives the shot from the attacker to the keeper at the goal mouth and deflects it clear toward the wing.
  - During a penalty shootout (`clock >= timeline.finalMinute`), `stagePitch` lines both teams up along the halfway line, places the active kick taker at the penalty spot, and stages the defending keeper on the goal line.
  - With `motion: false` (reduced motion), `stagePitch` returns still formation slots, zero ball loft or spin, `pose: "idle"`, and `trail: null`.

## Paneled SVG soccer ball, pitch markings and trails (`src/components/matchday/Broadcast.tsx`)

- The 10px white circle is replaced by `[data-testid="soccer-ball-svg"]` inside `[data-testid="broadcast-ball"]`. It draws a Telstar-style paneled soccer ball with a shaded sphere, specular highlight, central pentagon, five outer pentagon rim patches, and five hexagonal seams. A ground shadow scales and fades with `stage.ball.loft` while the SVG lifts and rotates by `stage.ball.spin`. No SVG `url(...)` references are used, keeping `pnpm check:image-seam` clean.
- The pitch SVG now includes 18-yard boxes, 6-yard goal areas, penalty spots, penalty arcs, corner arcs, and the center spot.
- `[data-testid="pitch-trails"]` renders the curved pass, shot, dribble, or save wake behind the ball in the active move's elemental color.
- Each staged `.player` renders its sprite inside `.playerSprite` with directional facing (`data-facing`) and keyframe stride poses (`run`, `sprint`, `dribble`, `cast`, `press`, `celebrate`, `dive`, `down`) while keeping the `[data-testid="ball-carrier"]` nameplate pill and `[data-testid="pitch-card-<side>-<slot>"]` yellow-card pips unflipped.
- When a player triggers a canon move in open play (`stage.playCallout`), the pitch renders a localized elemental burst and floating `[data-testid="pitch-ability"]` callout above the caster.

## Match HUD, Touchline UX and Web Audio match SFX

- `MatchPlayer.tsx` now mounts `Broadcast` in both `quick` and `live` views so Manager mode always displays the animated pitch.
- `[data-testid="match-hud"]` sits above the pitch and displays the user tactic pill, shots on target (`goals + opponent saves`), a live momentum bar derived from the window pressure lean, and the opponent tactic pill.
- `[data-testid="sound-toggle"]` in the match control bar toggles `pokedraft:sound` (`aria-pressed`) with a 44px minimum tap target.
- `src/components/wheel/sound.ts` synthesizes Web Audio sounds for referee whistles (`playWhistle` for kickoff, halftime, fulltime, and fouls), passes (`playKickPass`), elemental moves (`playAbilitySound` per effect), keeper saves (`playSaveSound`), bookings (`playCardSound`), substitutions (`playSubSound`), and opponent goals (`playOppGoal`) alongside `playGoalHorn`.
- In `Touchline.tsx`, each row in the on-pitch energy list (`[data-testid="energy-slot-<slot>"]`) now renders the player's `PlayerImage` sprite, highlights tired legs below 65 energy (`data-tired`), and selects that player in the `Take off` dropdown when clicked.

## Verbatim RED evidence

### Unit 1 RED (`0a675ac`)

Command: `pnpm vitest run src/ui/matchday/__tests__/moves.test.ts src/ui/matchday/__tests__/timeline.test.ts`

```text
 FAIL  src/ui/matchday/__tests__/moves.test.ts > moves and effects (catches a scorer calling a status move or a wrong type effect) > builds an open-play ability callout from a species moveset or falls back to a role action
TypeError: playCallout is not a function
 ❯ src/ui/matchday/__tests__/moves.test.ts:74:19

 FAIL  src/ui/matchday/__tests__/timeline.test.ts > pitch geometry (catches a side placed in the wrong half or drifting with reduced motion) > moves a saved shot from the attacker to the goal line and parries it clear
TypeError: saveBall is not a function
 ❯ src/ui/matchday/__tests__/timeline.test.ts:448:19

 FAIL  src/ui/matchday/__tests__/timeline.test.ts > pitch geometry (catches a side placed in the wrong half or drifting with reduced motion) > generates deterministic open-play phases with passes, dribbles, runners and ability callouts
AssertionError: expected undefined to be defined
 ❯ src/ui/matchday/__tests__/timeline.test.ts:461:21

 FAIL  src/ui/matchday/__tests__/timeline.test.ts > pitch geometry (catches a side placed in the wrong half or drifting with reduced motion) > stages realistic player movement, ball carrier possession, shot trails and keeper save dives, and freezes under reduced motion
TypeError: stagePitch is not a function
 ❯ src/ui/matchday/__tests__/timeline.test.ts:478:19

 Test Files  2 failed (2)
      Tests  4 failed | 20 passed (24)
```

### Unit 2 RED (`d3e94ae`)

Command: `pnpm vitest run src/components/matchday/__tests__/Broadcast.test.tsx`

```text
 FAIL  src/components/matchday/__tests__/Broadcast.test.tsx > Broadcast (catches a pitch that renders a plain circle instead of a paneled soccer ball SVG, or hides the ball carrier and shot trail) > renders a paneled SVG soccer ball, the active ball carrier badge and yellow-card pips on the pitch
TestingLibraryElementError: Unable to find an element by: [data-testid="soccer-ball-svg"]
 ❯ src/components/matchday/__tests__/Broadcast.test.tsx:84:24

 FAIL  src/components/matchday/__tests__/Broadcast.test.tsx > Broadcast (catches a pitch that renders a plain circle instead of a paneled soccer ball SVG, or hides the ball carrier and shot trail) > draws the active shot trajectory trail during a goal beat
TestingLibraryElementError: Unable to find an element by: [data-testid="pitch-trails"]
 ❯ src/components/matchday/__tests__/Broadcast.test.tsx:105:27

 FAIL  src/components/matchday/__tests__/MatchPlayer and Touchline UX (catches a match screen with no sound toggle, no tactical HUD, or no click-to-sub on energy rows) > renders the live tactical HUD and toggles match sound from the control bar
TestingLibraryElementError: Unable to find an element by: [data-testid="match-hud"]
 ❯ src/components/matchday/__tests__/Broadcast.test.tsx:122:24

 FAIL  src/components/matchday/__tests__/MatchPlayer and Touchline UX (catches a match screen with no sound toggle, no tactical HUD, or no click-to-sub on energy rows) > selects a player for substitution when their row in the energy list is clicked
TestingLibraryElementError: Unable to find an element by: [data-testid="energy-slot-4"]
 ❯ src/components/matchday/__tests__/Broadcast.test.tsx:153:28

 Test Files  1 failed (1)
      Tests  4 failed (4)
```

## Principles

- `principle-model-the-domain`. Model open-play soccer possession phases (carrier, receiver, pressing defender, off-ball runners, keeper dive, ball loft and spin) as pure deterministic data in `src/ui/matchday/timeline.ts` so the component is a direct projection of the stage.
- `principle-redesign-from-first-principles`. Replace the damped CSS transition wiggle and independent sine-wave ball with continuous phase waypoint interpolation and a paneled SVG soccer ball.
- `principle-experience-first`. Show the animated pitch in both match views, surface live tactics and momentum above the pitch, add Web Audio match sound effects with an inline sound toggle, and let managers click any tired player row to substitute them.
- `principle-test-behavior-not-implementation` and `tdd`. Every new capability was pinned by a failing behavioral test before implementation.
- `principle-prove-it-works`. Verified in a real Chromium and WebKit browser through `e2e/manager-mode.spec.ts` and `e2e/watch-live.spec.ts`, with updated screenshots in `docs/reports/manager-mode/`.
