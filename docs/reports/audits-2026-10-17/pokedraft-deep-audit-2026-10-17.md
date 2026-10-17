# Pokedraft deep platform, UI/UX, mobile, and live matchday audit

**Audited repository:** `/Users/paulo/projects/pokedraft`  
**Audited commit:** `40f3c92eca856902c4a5205f71509a52c165bcc7` (`main`, Engine 6)  
**Mode:** Read-only investigation (`pokedraft-mode` / `poteto-mode`)  
**Date:** 2026-10-17

---

## 1. Executive summary

Pokedraft has a deterministic core, a transparent 3-layer scouting model, a fast 2D broadcast stage, and a clean Neon Postgres leaderboard backend. At the same time, several recent feature layers (Engine 6 Manager Mode, the 2D `Broadcast` stage, the 3D `Pitch` stage, and retained engine bundles `v1` through `v5`) have created concrete bugs, mobile layout traps, hidden mechanics, and missed gameplay opportunities.

### Top 10 highest-impact findings (measured in source)

1. **Elemental move audio never plays, and `MatchPlayer` vs `Broadcast` timelines desynchronize (`[measured]`).** `MatchPlayer.tsx:80-83` builds its audio/HUD timeline without passing `movesOf`, while `Broadcast.tsx:116-120` dynamically loads `movesets` and calls `buildTimeline` a second time with `movesOf`. Because `MatchPlayer.tsx:154, 181-185` reads `callout.effect` from the `movesOf: null` timeline, `shotCallout` (`src/ui/matchday/moves.ts:47-49`) and `playCallout` (`src/ui/matchday/moves.ts:72-81`) always return `"impact"`. All six elemental Web Audio synth profiles (`fire`, `water`, `electric`, `grass`, `ice`, `psychic`) and `"shield"` in `src/components/wheel/sound.ts:230-260` are dead code during matches. Worse, `playCallout` only calls `playRng.pick(pool)` when `moveset !== null` (`src/ui/matchday/moves.ts:78`), so `playRng` advances differently between `MatchPlayer` and `Broadcast`, desynchronizing audio cues from visual phases and causing sprites to jump when `movesets` resolves.
2. **Mobile broadcast shrinks ball-carrier nameplates to `5.28px` and yellow card pips to `4.3px` (`[measured]`).** `.player` (`src/components/matchday/Broadcast.module.css:143-145`) scales the entire `80px` sprite container by `scale(var(--sprite))`, where `--sprite: 0.48` below `520px` container width (`Broadcast.module.css:16`). Because `.carrierBadge` (`11px`, `Broadcast.module.css:354-367`) and `.cardPip` (`9px x 13px`, `Broadcast.module.css:343-352`) are children of `.player` (`Broadcast.tsx:166-177`), they scale down by `0.48x` on phones.
3. **Pitch ball trails distort vertically by `0.64x` (`[measured]`).** `.pitch` has `aspect-ratio: 100 / 64` (`Broadcast.module.css:15`) and `.lines` (`Broadcast.tsx:201`) uses `viewBox="0 0 100 64"` with `vector-effect: non-scaling-stroke`. `.trails` (`Broadcast.tsx:235`) uses `viewBox="0 0 100 100" preserveAspectRatio="none"` without `vector-effect: non-scaling-stroke`, squashing vertical passes/shots and turning `<circle r={1.1} />` (`Broadcast.tsx:243`) into a flat oval.
4. **Penalty shootouts have zero ball-flight animation, mismatched spot coordinates, overlapping sprites, and total silence (`[measured]`).** `stagePitch` (`src/ui/matchday/timeline.ts:824-904`) receives only an integer `kicks` count (`0, 1, 2...`), not sub-kick progress. On each kick tick, the ball teleports in `0ms` to the net or miss spot, penalty spots sit at `x: 86 / 14` (`timeline.ts:830`) instead of the pitch SVG's `cx={89} / cx={11}` (`Broadcast.tsx:220-221`), 9 outfielders stack into a colliding vertical column (`y: 18 + slot * 6.2` at `timeline.ts:852-854`), and `MatchPlayer.tsx:136-186` plays zero audio for `timeline.kicks`.
5. **The kickoff tactic prompt disables assistant-coach fatigue subs without any second-half stop (`[measured]`).** At minute `0'`, `stop-kickoff` (`MatchPlayer.tsx:354-375`) asks the user to `"Pick a tactic, then kick off."` Selecting any non-Balanced tactic sets `managed = true` (`src/engine/match.ts:561, 609`), which disables automatic assistant-coach fatigue substitutions at `60'` and `75'` (`match.ts:615-628`). Yet `stopsFor` (`src/ui/matchday/clock.ts:51-68`) only pauses at `0'`, `45'`, `90'`, and injuries. At `45'`, starters still have `75` to `83` energy, so the clock runs nonstop from `45'` to `90'` with zero substitutions unless the user manually pauses mid-half.
6. **Touchline substitutions are blind (`[measured]`).** Both the `"Bring on"` `<select>` (`src/components/matchday/Touchline.tsx:116-120`) and `<InjuryPrompt>` (`MatchPlayer.tsx:479-492`) show only the bench Pokémon's species name. They hide role suitability (`Best` / `OK` / `Poor`) for the outgoing slot, stamina (`STA`), energy, yellow-card status, and Team Score delta. Meanwhile, opening the Touchline while the clock is running does not auto-pause (`MatchPlayer.tsx:103, 399-407`).
7. **Position-first drafting blocks `ScoutingDossier` inspection, and mobile 3D Pitch cards trap vertical page scrolling (`[measured]`).** In `positionFirst` mode (`src/components/run/DraftBoard.tsx:270-274, 624-667, 747-796`), candidate cards omit the `Scout` button and commit immediately on tap. On the 3D `Pitch` (`src/components/pitch/Pitch.module.css:107`), all 16 `.token` cards set `touch-action: none` unconditionally (even on read-only `ResultsView`), blocking vertical page scrolling whenever a thumb gesture starts on a player card.
8. **Mobile Home screen pushes the Squad Builder `1,300px+` below the fold and renders two conflicting toggle buttons (`[measured]`).** `SidePanel.tsx:99` initializes `open = true` on mobile, and `SidePanel.module.css:5-7` unwraps `.panel` with `display: contents !important`, stacking `.hub`, `"Play"`, and the expanded `"Settings and records"` card above `Builder` (`grid-row: 4`). Two buttons (`"Challenge Hub"` at `SidePanel.tsx:125-133` and `"Hide settings and records"` at `SidePanel.tsx:170-178`) control the same `moreId` region.
9. **Server build regression adds `2.89 MB` of duplicate retained JSON to `.next/server/chunks` (`[measured]`).** `next.config.ts:41` hardcodes `v[1234]` (missing `v5`), and `scripts/build/retained-json-loader.cjs:10` only compares retained JSON against live `src/data/` instead of earlier retained versions `v1..v4`. After Engine 6 updated 4 species in `src/data/scouting.json`, `.next/server/chunks` emits 8 JSON copies (`5,784,409` bytes) instead of 4 (`2,887,688` bytes), failing `node scripts/build/measure-retained-json.mjs .next/server/chunks`.
10. **Manager Mode and Live Match Broadcast default to off, are buried on Home, are blocked in Builder friendlies, and are absent from `/how-to-play` (`[measured]`).** `DEFAULT_PANEL` (`src/ui/settings.ts:45-46`) sets `managerMode: false, matchView: "quick"`. Builder friendlies (`PlayScreen.tsx:209`, `LiveRun.tsx:117`, `Builder.tsx:205-210`) bypass `MatchdayFlow` entirely even though `src/engine/replay.ts:27` and `src/engine/token.ts:25` support `mode: "builder"` with `manager` actions.

---

## 2. Deep dive: Manager mode and Live Match filter (animations, audio, gameplay, and UX)

The user prompt specifically highlighted **improvements to the animations and gameplay of Manager Mode with the Live Match filter**. This section traces every layer of the matchday pipeline (`src/engine/match.ts`, `src/ui/matchday/timeline.ts`, `src/ui/matchday/player.ts`, `src/ui/matchday/clock.ts`, `src/ui/matchday/moves.ts`, `src/ui/manager/touchline.ts`, `src/components/matchday/Broadcast.tsx`, `src/components/matchday/MatchPlayer.tsx`, `src/components/matchday/Touchline.tsx`, and `src/components/matchday/MatchdayFlow.tsx`).

### 2.1 Live match animation, choreography, and audio defects

#### 1. Dual `buildTimeline` calls break elemental audio and desynchronize `playRng` (`[measured]`)
- **Where:** `src/components/matchday/MatchPlayer.tsx:80-83, 136-186`, `src/components/matchday/Broadcast.tsx:38-57, 116-120`, `src/ui/matchday/timeline.ts:384-488`, and `src/ui/matchday/moves.ts:39-82`.
- **Mechanism:**
  - `MatchPlayer.tsx:80-83` computes `const timeline = useMemo(() => buildTimeline(match, { matchIndex, seed, lineup }), [match, matchIndex, seed, lineup])` without `movesOf`.
  - `Broadcast.tsx:116-120` loads `movesets` asynchronously via `useMovesets()` (`Broadcast.tsx:38-57`) and calls `buildTimeline(match, { matchIndex, seed, lineup, movesOf })` a second time.
  - In `MatchPlayer.tsx:154` (on goal/save beats) and `MatchPlayer.tsx:181-185` (on open-play phases), sound playback reads `b.callout.effect` and `phase.callout.effect` from `MatchPlayer`'s own `timeline`. Because `movesOf` is omitted in `MatchPlayer`, `moveset` is always `null`, so `shotCallout` (`moves.ts:47-49`) and `playCallout` (`moves.ts:72-81`) always return `effect: "impact"`. The elemental synthesizers in `src/components/wheel/sound.ts:230-260` (`fire`, `water`, `electric`, `grass`, `ice`, `psychic`, `shield`) never fire during a match.
  - Furthermore, inside `buildTimeline` (`timeline.ts:468-472`), `playCallout(actor.name, moveset, role, playRng)` only consumes a random draw from `playRng` (`rng.pick(pool)` at `moves.ts:78`) when `moveset` is non-null. Because `playRng` is shared across all 72 open-play phases (`timeline.ts:385`), skipping `rng.pick(pool)` when `movesOf` is `null` shifts every subsequent `playRng.next()` and `playRng.range()` call in `buildTimeline` (`timeline.ts:397, 405, 419, 444, 446, 468, 476`). As a result:
    1. `MatchPlayer`'s `timeline.plays` has different `kind`, `from`, `to`, and `callout` values than `Broadcast`'s `timeline.plays`.
    2. When `Broadcast` first mounts before `import("@/data/movesets")` resolves, `movesOf` transitions from `null` to a function, causing all 72 phases to recompute with shifted RNG draws and visibly jumping player positions on the pitch.
- **Fix:**
  1. Lift `useMovesets()` into `MatchPlayer.tsx` (or pass the single computed `Timeline` down from `MatchPlayer` and `MatchReplay` into `<Broadcast timeline={timeline} ... />`) so `buildTimeline` runs once per match segment.
  2. In `playCallout` (`src/ui/matchday/moves.ts:72-81`) and `shotCallout` (`moves.ts:39-57`), always consume a deterministic draw from `rng` (or give callout picking its own substream `createRng(\`broadcast:${seed}:${matchIndex}:callouts\`)`) so loading `movesets` never alters tactical phase geometry (`from`, `to`, `kind`, `ballStart`, `ballEnd`).

#### 2. Ability callout and SFX saturation in Live (`1x`/`2x`) and Quick views (`[measured]`)
- **Where:** `src/ui/matchday/timeline.ts:167, 468-472`, `src/ui/matchday/clock.ts:21-36`, and `src/components/matchday/MatchPlayer.tsx:174-186, 293`.
- **Mechanism:**
  - `PHASE_LEN` is `1.25` match minutes (`72` open-play phases in 90 minutes).
  - `timeline.ts:468-469` sets `useAbility = kind === "through" || kind === "cross" || kind === "duel" || playRng.next() < 0.45`. Because every possession change is a `"duel"` (`timeline.ts:443`) and ~40% of retention phases are `"through"` or `"cross"`, `phase.callout` is populated on roughly **70% of all phases (~50 times per match)**.
  - In `live` view (`25,000ms` per half = `694ms` per phase at `1x`, or `347ms` at `2x`), `[data-testid="pitch-ability"]` (`Broadcast.tsx:266-283`) flashes a move badge almost every half-second. When everything is a special move, nothing feels special.
  - In `quick` view (`2,200ms` per half = `61ms` per phase at `1x`, or `30.5ms` at `2x`), `MatchPlayer.tsx:293` now renders `<Broadcast>` and runs the phase audio effect (`MatchPlayer.tsx:174-186`), firing `playKickPass()` or `playAbilitySound()` ~16 times per second.
- **Fix:**
  1. Reserve open-play `phase.callout` badges for high-leverage phases: final-third `through` balls, `cross` deliveries into the box, key `duel` tackles/interceptions, and ~15% of buildup phases (~12 to 15 ability callouts per match instead of ~50).
  2. In `MatchPlayer.tsx:174-186`, throttle open-play phase SFX in `quick` view (or suppress open-play kick SFX when `pace.half <= 5_000`, keeping only beat SFX for goals, saves, cards, injuries, and whistles).

#### 3. Mobile sprite scaling crushes `.carrierBadge` (`5.28px`) and `.cardPip` (`4.3px`) (`[measured]`)
- **Where:** `src/components/matchday/Broadcast.tsx:147-178` and `src/components/matchday/Broadcast.module.css:16-28, 137-147, 343-367`.
- **Mechanism:**
  - `.pitch` sets `--sprite: 0.48` by default, `0.62` at `@container pitch (min-width: 520px)`, and `0.78` at `@container pitch (min-width: 760px)` (`Broadcast.module.css:16-28`).
  - `.player` (`Broadcast.module.css:137-147`) has fixed `width: 80px; height: 80px` and `transform: translate(-50%, -70%) scale(var(--sprite))`.
  - Because `.carrierBadge` (`font-size: 11px`) and `.cardPip` (`width: 9px; height: 13px`) are inside `.player` (`Broadcast.tsx:166-177`), they inherit `scale(0.48)` on mobile viewports, rendering the ball carrier's name at **`5.28px`** and yellow card pips at **`4.32px x 6.24px`**.
- **Fix:**
  - Move `scale(var(--sprite))` off `.player` onto an inner `.spriteWrap` (wrapping `.shadow`, `.aura`, and `.sprite`), or apply counter-scaling `transform: translateX(-50%) scale(calc(1 / var(--sprite)))` on `.carrierBadge` and `.cardPip` so text remains a crisp `11px` across all container widths.

#### 4. SVG aspect-ratio distortion on `.trails` (`[measured]`)
- **Where:** `src/components/matchday/Broadcast.tsx:201` vs `235` and `src/components/matchday/Broadcast.module.css:15, 49-50, 108-135`.
- **Mechanism:**
  - `.pitch` has `aspect-ratio: 100 / 64` (`Broadcast.module.css:15`).
  - `.trails` (`Broadcast.tsx:235`) uses `viewBox="0 0 100 100" preserveAspectRatio="none"` without `vector-effect: non-scaling-stroke`.
  - Because `100` SVG user units in `Y` are compressed into `64` aspect-ratio units, `<circle cx={trail.from.x} cy={trail.from.y} r={1.1} />` (`Broadcast.tsx:243`) renders as a squashed horizontal ellipse, and vertical pass/shot lines render 36% thinner than horizontal lines.
- **Fix:**
  - Add `vector-effect: non-scaling-stroke` to `.trailLine` and `.trailGlow` in `Broadcast.module.css:116-127`, and either render `.trailOrigin` with `rx={1.1} ry={1.1 / 0.64}` (`ry={1.72}`) or map `.trails` coordinates into `viewBox="0 0 100 64"` (`y * 0.64`).

#### 5. Only 6 of 18 Pokémon types have visual and audio effects (`[measured]`)
- **Where:** `src/ui/matchday/moves.ts:19-30`, `src/components/matchday/Broadcast.module.css:187-243, 297-312`, and `src/components/wheel/sound.ts:222-261`.
- **Mechanism:**
  - `TYPE_EFFECT` (`moves.ts:19-26`) maps only `fire`, `water`, `electric`, `grass`, `ice`, and `psychic`.
  - The other 12 Pokémon types (`dragon`, `ghost`, `dark`, `fairy`, `fighting`, `steel`, `rock`, `ground`, `flying`, `poison`, `bug`, `normal`) fall back to `"impact"` (`moves.ts:29`). Dragon-type signature shots like Dragon Pulse, Ghost-type Shadow Ball, Fighting-type Close Combat, or Steel-type Flash Cannon get the dull white default impact instead of elemental auras, colored ball trails, and distinct synth profiles.
- **Fix:**
  - Expand `MoveEffect` (`moves.ts:5-13`) with 6 additional elemental families or map all 18 types into themed visual/audio palettes (for example, `dragon` violet-gold roar, `ghost`/`dark` shadow-indigo phase, `fairy` rose chime, `fighting`/`rock`/`ground` seismic amber удар, `steel` metallic ring, `flying` cyan gust, `poison` toxic magenta).

#### 6. Ball and player snap-teleports between open-play phases and goal/save beats (`[measured]`)
- **Where:** `src/ui/matchday/timeline.ts:391-440, 579-583, 942-1040`.
- **Mechanism:**
  - When an open-play phase overlaps a goal beat (`goalIn` at `timeline.ts:391-394`), `buildTimeline` routes the phase toward `goalIn.scorer.slot` (`toSpot` near `x: 90`). Then at `b.minute`, `activeBeat` switches `stagePitch` from open play to the `"goal"` beat at `progress = 0` (`timeline.ts:942-975`).
  - `goalBall(fromSpot, scorerSpot, mouth, 0)` (`timeline.ts:579-583`) places the ball at `fromSpot` (the assister, or `{ x: 50, y: 50 }` midfield for unassisted goals at `timeline.ts:956`). The ball therefore **teleports backward** from the penalty box to midfield at the start of the goal beat, replays the assist pass in `0..0.38`, and fires into the net.
  - Then, when `SHOW.goal` (`2,600ms`) ends, `active` becomes `null` (`timeline.ts:940`) and the ball, scorer, assister, and goalkeeper instantaneously snap from the goal mouth/corner celebration back to whatever open-play waypoint `phase` is currently on, with no center-circle kickoff reset (`{ x: 50, y: 50 }`).
- **Fix:**
  1. For the phase immediately preceding `b.minute` of a `goal` or `save` beat, route the open-play ball to the assister (`b.assist?.slot`) or build-up origin (`fromSpot`) so the transition into `goalBall(..., progress = 0)` is spatially continuous (`C0` continuity).
  2. For the phase immediately following a `goal` beat, start possession at `{ x: 50, y: 50 }` with the conceding team kicking off from the center spot.

#### 7. Penalty shootout choreography is static, misaligned, crowded, and silent (`[measured]`)
- **Where:** `src/ui/matchday/timeline.ts:824-904`, `src/ui/matchday/player.ts:107-115, 211-235`, `src/components/matchday/Broadcast.tsx:220-221, 313-325`, and `src/components/matchday/MatchPlayer.tsx:136-186`.
- **Mechanism:**
  - `PlayerState` (`player.ts:38-51`) tracks `kicks: number` (an integer incremented every `pace.kick / state.speed` ms, `1,200ms` in `live`), and `stagePitch` (`timeline.ts:824`) receives only `kicks: number`, not `kickProgress: number` (`0..1`).
  - At the instant `kicks` increments from `0` to `1`, `stagePitch` (`timeline.ts:832-842`) teleports the ball from `spot` to `{ x: 96.5, y: 47.5 }` (scored) or `{ x: 98, y: 37 }` (missed), teleports the shooter to `lerpSpot(spot, mouth, 0.22)` in `pose: "celebrate"`, and teleports the keeper to `pose: "dive"`. There is no run-up and no ball flight.
  - `spot` in `timeline.ts:830` is `{ x: 86, y: 50 }` / `{ x: 14, y: 50 }`, which misses the SVG penalty spot drawn at `cx={89}` / `cx={11}` (`Broadcast.tsx:220-221`) by 3 pitch units.
  - Non-kicking players line up at `x: 46` and `x: 54` with `y: 18 + slot * 6.2` (`timeline.ts:852-854`), cramming 9 players into a vertical column where sprites overlap.
  - `MatchPlayer.tsx:136-186` has no `useEffect` watching `state.kicks`, so penalty shootouts play in dead silence.
- **Fix:**
  1. Compute `kickProgress = clamp01((now - state.kickAt) / (pace.kick / state.speed))` in `MatchPlayer` / `Broadcast` and pass it into `stagePitch`.
  2. Animate each penalty kick across three sub-stages: `0.00..0.35` shooter run-up from edge of box (`x: 81`) to the SVG penalty spot (`x: 89, y: 50`), `0.35..0.60` high-speed ball flight with `.trailLine` to the corner while the keeper dives (correct side on save, opposite or late on goal), and `0.60..1.00` net ripple / celebration or miss reaction.
  3. Stagger the 9 waiting teammates along a slight center-circle arc (`x: 44 + (slot % 2) * 2.5`) so sprites do not overlap on mobile.
  4. Trigger whistle + kick + `playGoalRoar()` / `playSaveGlove()` / miss SFX in `MatchPlayer.tsx` on each `state.kicks` increment.

---

### 2.2 Manager mode gameplay, Touchline UX, and tactical coaching gaps

#### 1. The Kickoff Tactic Trap disables assistant-coach fatigue subs (`[measured]`)
- **Where:** `src/components/matchday/MatchPlayer.tsx:48, 354-375`, `src/ui/matchday/clock.ts:51-68`, and `src/engine/match.ts:561, 607-629`.
- **Mechanism:**
  - In `src/engine/match.ts:561`, `const managed = !!(userManager && !isDefaultManager(userManager))`.
  - In `src/engine/match.ts:607-629`, automatic assistant-coach fatigue substitutions at `60'` and `75'` only run when `if (!managed)`.
  - In `MatchPlayer.tsx:48`, every managed match starts halted at `stop-kickoff` (`0'`) with the prompt `"Pick a tactic, then kick off."` (`MatchPlayer.tsx:359`).
  - If the user clicks `Press`, `Direct`, `All-out`, or `Contain` at `0'`, `isDefaultManager(manager)` becomes `false`, setting `managed = true`.
  - Yet `stopsFor` (`src/ui/matchday/clock.ts:51-68`) only stops the clock at `0'`, `45'`, `90'`, and injuries. At `45'` (`stop-halftime`), starter energy is still `75%` to `83%` (green), so the user clicks `"Start 2nd half"`. The clock then runs from `45'` to `90'` without stopping, while starters drain into the `< 35%` exhaustion cliff (`0.55x` performance multiplier in `src/engine/coefficients.ts:173`) and zero substitutions are made.
- **Fix:**
  1. **Decouple tactic selection from auto-sub suppression in Engine (or add a 65' tactical window stop in UI):** Without changing engine determinism for existing tokens, add an optional **65' Tactical / Fatigue Window** auto-pause (`stop-window` at minute `62'` or when the first starter drops below `55` energy in the second half) so the manager is prompted when fresh legs actually matter.
  2. In `stop-halftime` (`MatchPlayer.tsx:356-360`), show a projected 70' fatigue warning for the 2 lowest-energy starters (`"Gengar (68 EN) and Snorlax (64 EN) will hit tired legs by 65'"`).

#### 2. Blind substitutions in `<Touchline>` and `<InjuryPrompt>` (`[measured]`)
- **Where:** `src/components/matchday/Touchline.tsx:100-136`, `src/components/matchday/MatchPlayer.tsx:464-504`, and `src/ui/manager/touchline.ts:86-97`.
- **Mechanism:**
  - The `"Take off"` `<select>` (`Touchline.tsx:103-112`) shows `{p.role} · {species.name} ({Math.round(p.energy)} EN)`, and the `"Bring on"` `<select>` (`Touchline.tsx:116-120`) shows only `{speciesById(b.species).name}`.
  - The user cannot see whether a bench player is a `★ Best`, `OK`, or `Poor` fit for the selected `takeOff` role, cannot see the bench player's primary roles or `STA` attribute, and cannot see the resulting Team Score or Line (`attack`/`midfield`/`defense`/`keeper`) delta.
  - Likewise, when an injury strikes (`MatchPlayer.tsx:464-504`), `<InjuryPrompt>` says `"Pick a bench player to replace them"` (`MatchPlayer.tsx:470`) without even naming the injured starter's **position/role** (`ST`, `CB`, `GK`) in the prompt header, and lists only bare species names in the radio options (`MatchPlayer.tsx:480-491`).
- **Fix:**
  1. Replace the native `<select>` dropdowns in `Touchline.tsx:100-121` with direct interactive cards: tapping an on-pitch player row in the `.energyList` selects them as `"Take off"` (this already sets `onClick={() => setTakeOff(p.slot)}` at `Touchline.tsx:167`, making the `"Take off"` `<select>` redundant!), and immediately displays the 5 bench cards with **Role Suitability Pill (`★ Best for CM` / `OK` / `Out of position`), Role Fit score delta (`+4 Fit`), and Stamina (`78 STA`)**.
  2. In `<InjuryPrompt>` (`MatchPlayer.tsx:464-504`), display the injured player's role badge (`"Replace {injuredName} at {role}"`) and show each bench option's suitability badge and fit score for `{role}`.

#### 3. Yellow cards are invisible in the Touchline panel (`[measured]`)
- **Where:** `src/ui/manager/touchline.ts:86-97, 152-206` and `src/components/matchday/Touchline.tsx:147-195`.
- **Mechanism:**
  - In `src/engine/match.ts:705-719`, a player on a yellow card who commits a second cardable foul is sent off (`red = true`), reducing the team to 10 men.
  - Although `Broadcast.tsx:168-174` renders a tiny `.cardPip` on the pitch sprite, `OnPitchPlayer` in `src/ui/manager/touchline.ts:86-90` omits `yellow: boolean`, and `Touchline.tsx:147-195` renders no yellow-card indicator next to the player's name in the coaching drawer.
- **Fix:**
  - Add `readonly yellow: boolean` to `OnPitchPlayer` in `src/ui/manager/touchline.ts:86-90` (populated from `match.events` where `e.type === "yellow_card" && e.minute <= m`) and render a high-contrast `[YC]` / yellow card badge on the player's row in `Touchline.tsx` with a tooltip `"Booked. Second yellow sends them off."`

#### 4. Opponent tactical style disappears once the match begins (`[measured]`)
- **Where:** `src/components/matchday/MatchdayFlow.tsx:171-176`, `src/components/matchday/MatchPlayer.tsx:271-291`, `src/components/results/format.ts:96-102`, and `src/engine/coefficients.ts:177-184`.
- **Mechanism:**
  - Engine 6 models a rock-paper-scissors tactical counter matrix in `src/engine/coefficients.ts:177-184`:
    - Against **Pressing** opponents: `direct` gets `+0.05` attack, while `press` suffers `-0.04` defense.
    - Against **Possession** opponents: `press` gets `+0.05` attack, while `contain` gets `+0.04` defense.
    - Against **Direct** opponents: `contain` gets `+0.05` defense, while `all_out` suffers `-0.05` defense.
  - `<PreMatch>` (`MatchdayFlow.tsx:171-176`) shows `Style: {match.opponent.tacticalStyle}`. The moment the user clicks `"Go to the match"` and lands on `stop-kickoff` (`"Pick a tactic, then kick off"`), `match.opponent.tacticalStyle` is completely hidden from `MatchPlayer.tsx` and `Touchline.tsx`.
- **Fix:**
  1. Display the opponent's tactical style badge (`Pressing` / `Possession` / `Direct`) and Team Score directly in the `<MatchPlayer>` header/scoreboard (`MatchPlayer.tsx:271-291`).
  2. In `Touchline.tsx:66-92`, pass `opponentStyle={match.opponent.tacticalStyle}` and highlight which tactics have a **Tactical Edge** against this opponent (for example, showing a subtle `"Counters Pressing (+5% ATK)"` badge when `Direct` is selected against a Pressing opponent).

#### 5. Interacting with the Touchline during live play does not pause the clock (`[measured]`)
- **Where:** `src/components/matchday/MatchPlayer.tsx:103, 399-407` and `src/components/matchday/Touchline.tsx:54-60`.
- **Mechanism:**
  - While the match is running in `live` view (`1x` = `3.6` match minutes per real second; `2x` = `7.2` match minutes per real second), clicking `"Touchline"` or opening the substitution selector does not pause the clock. By the time a user picks a starter, picks a bench player, and clicks `"Make substitution"`, `15` to `25` match minutes have elapsed (often crossing a goal or injury beat).
- **Fix:**
  - Auto-pause the match clock (`dispatch({ type: "toggle-pause" })` or hold a transient `coachingHold` state) whenever the user focuses/interacts with the Touchline substitution controls or opens the mobile Touchline drawer, resuming smoothly once `"Make substitution"` or a tactic chip is confirmed.

#### 6. Redundant double stop before kickoff (`PreMatch` -> `stop-kickoff` at `0'`) (`[measured]`)
- **Where:** `src/components/matchday/MatchdayFlow.tsx:114-126, 154-224` and `src/components/matchday/MatchPlayer.tsx:48, 354-375`.
- **Mechanism:**
  - Before every round, `<PreMatch>` (`MatchdayFlow.tsx:154-224`) stops the flow to preview the opponent and offers `"Go to the match"`. Clicking `"Go to the match"` mounts `<MatchPlayer>`, which immediately halts at `0'` (`stop-kickoff` at `MatchPlayer.tsx:48, 354-375`) and asks the user to click `"Kick off"` a second time.
- **Fix:**
  - Let the user pick their starting tactic (`Balanced`, `Press`, `Direct`, `All-out`, `Contain`) directly on the `<PreMatch>` dressing-room screen (`MatchdayFlow.tsx:154-224`) where the opponent's `Style`, `Weakest line`, and `Key player` are visible, and have the primary CTA `"Kick off match"` launch `<MatchPlayer>` directly into running `first-half` play at `0'`.

---

### 2.3 Creative gameplay & animation upgrades for Manager Mode + Live Match

1. **Live Momentum & xG Tug-of-War Meter (`[design proposal]`):**
   - Right now, `Broadcast.tsx:73-93` (`<Scoreboard>`) shows only goals (`0 - 0`), which stays static for long stretches.
   - Because `buildTimeline` (`timeline.ts:323-488`) already computes per-phase possession (`side`), zone penetration (`toSpot.x`), shots (`timeline.beats`), and tactic segments (`tacticOf(userManager, m)`), `<Broadcast>` can render a sleek **Live Momentum / Pressure Bar** directly beneath the scoreboard (`Home Pressure vs Away Pressure` + live Shot count `Shots 4 (2) - 2 (1)`). When the user switches to `All-out` or `Press`, they immediately see the momentum bar surge toward the opponent's box, giving instant visual feedback that their touchline call changed the pitch physics.
2. **Signature Move Cut-In Banner on Crucial Moments (`[design proposal]`):**
   - Instead of popping up 50 small text pills during routine midfield passes, trigger a **2D Broadcast Lower-Third / Corner Cut-In** (with the Pokémon's `PlayerImage` sprite, move name, type badge, and elemental gradient from `TYPE_PALETTE` in `src/design/stadium.ts:4-23`) only on **Shots on Target, Goals, Great Saves, and Crunch Tackles**.
3. **Interactive Pitch Tap-to-Sub and Stamina Rings on the 2D Broadcast Pitch (`[design proposal]`):**
   - In `Broadcast.tsx:147-178`, each user player already receives `energy: number` (`PitchActor.energy` at `timeline.ts:48, 1003`) which currently only dims the sprite slightly (`filter: saturate(0.72) brightness(0.92)` when `energy < 35` at `Broadcast.module.css:160-162`).
   - Render a subtle **radial stamina arc** (or 3-bar battery indicator below the sprite when `energy < 55`) directly on the 2D pitch, and allow the manager to **tap any tired player directly on the 2D pitch** to pause and open the bench replacement picker for that exact slot.
4. **In-Match Role Swap for 10-Man Red Card Recovery (`[design proposal]`):**
   - Currently, if your goalkeeper (`GK`) or lone striker (`ST`) receives a red card (`onPitch[slot] === null`), `Touchline.tsx:38-40` blocks substituting into that slot (`"Nobody is playing in that position"`), forcing you to play the rest of the match without a keeper or striker.
   - Add a `"Fill vacant role"` action when a red card occurs: sacrifice an outfield starter (`takeOff: slotA`) while assigning the incoming bench player to the vacated red-card role, or allow one positional swap during a stoppage.
5. **Instant Highlight Scrubber on the Broadcast Timeline (`[design proposal]`):**
   - `MatchPlayer.tsx:295-336` renders `.eventBar` with `.pip` markers for goals, cards, subs, and injuries along the 0'-90' bar, and `MatchReplay.tsx` allows re-watching finished matches.
   - Make those `.pip` markers clickable in `MatchReplay` (and in `post-match` state inside `MatchPlayer`) so clicking a `67' Goal` or `82' Save` pip seeks the clock (`jumpTo(state, 67, now)`) directly to `b.minute - 1` and replays that exact highlight beat with full animation and sound.

---

## 3. Draft flow, 3D Pitch stage, Wheel, Squad Builder, Scouting, and Results UX

### 3.1 Draft flow (`DraftBoard.tsx`) and Wheel (`RollReveal.tsx`)

1. **Position-first draft mode locks players out of `ScoutingDossier` (`[measured]`):**
   - In `src/components/run/DraftBoard.tsx:270-274, 624-667, 747-796`, when `order === "positionFirst"`, candidate cards do not render the `Scout` button (`onInspect={order === "squadFirst" ? ... : undefined}` at `line 650` and `777`), and tapping a candidate card immediately calls `onPick(choiceIndex, currentPosIndex)` (`line 272`), committing the pick irrevocably. Players cannot inspect a candidate's role fits, moves, ability traits, or radar chart before drafting them.
   - **Fix:** Enable the `Scout` button (`onInspect`) on candidate cards in both `positionFirst` and `squadFirst` modes, and pass `slotContext={{ role: slots[currentPosIndex].role }}` into `<ScoutingDossier>` (`DraftBoard.tsx:697-703`) so the dossier opens focused on the exact role being drafted.
2. **Candidate comparison in `squadFirst` mode takes 4 taps per Pokémon (`[measured]`):**
   - In `DraftBoard.tsx:697-703`, `<ScoutingDossier>` is invoked without `slotContext` or `compareTo`, and inspecting all 3 candidates requires tapping `Scout` -> closing modal -> tapping `Scout` on candidate 2 -> closing modal.
   - **Fix:** Pass the full `round.offers` array into `<ScoutingDossier>` so the modal header renders **Prev / Next (`1 of 3`) candidate tabs** and a **Compare all 3** side-by-side radar overlay.
3. **Touch drag-to-slot aborts on mobile, and the mobile bottom sheet cannot be swiped or backdrop-dismissed (`[measured]`):**
   - `.card` (`src/components/run/DraftBoard.module.css:156`) sets `touch-action: pan-y`. When a user tries to drag a candidate card upward from the hand onto a pitch slot (`DraftBoard.tsx:314-354`), the browser's vertical scroll recognizer fires `pointercancel` as soon as vertical movement exceeds `8px`, aborting the drag (`DraftBoard.tsx:356-360`).
   - `.drawerBackdrop` (`DraftBoard.module.css:349-357`) sets `pointer-events: none`, so tapping outside the open mobile candidate sheet does not close it (`DraftBoard.tsx:734-738`) and instead clicks pitch slots underneath.
   - `.dragHandle` (`DraftBoard.tsx:741`) has no pointer/touch listeners.
   - **Fix:** Set `pointer-events: auto` on `.drawerBackdrop` when open, attach vertical swipe-down-to-close handlers on `.drawerHeader` / `.dragHandle`, and either remove drag instructions on touch devices in favor of the two-tap `.selectionBar` flow or attach drag initiation to a dedicated drag handle with `touch-action: none`.
4. **`RollReveal.tsx` skip bug skips two reels instead of one (`[measured]`):**
   - In `src/components/wheel/RollReveal.tsx:65-70`, clicking `"Skip"` while reel `0` is still spinning (`settled < last`) calls `setSettled(last)` instead of advancing the active reel (`setSettled((s) => s + 1)`), skipping the second reel's spin animation as well.

### 3.2 3D Pitch stage (`Pitch.tsx`, `Pitch.module.css`)

1. **Unconditional `touch-action: none` on all 16 `.token` cards creates a mobile scroll trap (`[measured]`):**
   - `src/components/pitch/Pitch.module.css:107` sets `touch-action: none` on every `.token` button. On mobile (`<=540px`), the pitch stage (`520px to 580px` tall) plus the 5-card bench (`~145px` tall) fills nearly the entire viewport. Starting a vertical page scroll with a thumb over any of the 16 player cards is swallowed by `touch-action: none`. Even on `ResultsView.tsx:177` where `onSwap` is `undefined` (read-only pitch), `.token` still blocks touch scrolling.
   - **Fix:** Only set `touch-action: none` when a card is actively being dragged (`data-dragging="true"` after a `180ms` long-press or via a dedicated drag handle), and default `.token` to `touch-action: pan-y` so vertical page scrolling always works on mobile. Rely on the already-implemented two-tap swap (`swapFrom` in `Pitch.tsx:86-135`) as the primary mobile swap gesture.
2. **Mobile 3D pitch card density squeezes sprites to `31px` (`27px` on bench) and wraps names mid-word (`[measured]`):**
   - At `<=540px` (`Pitch.module.css:362-415`), `.token` is `56px` wide (`48px` on bench) with `padding: 3px 4px`. Inside `.token[data-filled="true"]` (`Pitch.module.css:114`), `grid-template-columns: minmax(0, 1fr) 15px` reserves a `15px` right rail for the vertical type stripe, leaving only **`31px`** (`27px` on bench) for the Pokémon sprite. Meanwhile `.tokenName` (`Pitch.module.css:278`) sets `overflow-wrap: anywhere`, breaking names like ` Feraligatr` across lines mid-syllable.
   - **Fix:** Below `540px`, move the type indicator from a `15px` side column to a `3px` top/bottom accent bar (`grid-template-columns: 1fr`), reclaiming `+17px` of width (`48px` sprite instead of `31px`) and allowing single-line ellipsis on `.tokenName`.
3. **3D perspective drag drift (`[measured]`):**
   - `Pitch.tsx:146` applies `transform: translate(${drag.dx}px, ${drag.dy}px) scale(1.06)` inside `.surface`, which has `transform: rotateX(26deg)` (`Pitch.module.css:43`). Screen-space `dy` is foreshortened by `cos(26deg) = 0.898`, causing the dragged card to lag behind the pointer vertically.

### 3.3 Squad Builder (`Builder.tsx`) and Picker (`Picker.tsx`)

1. **Builder friendlies cannot use Manager Mode or Live Match Broadcast (`[measured]`):**
   - `PlayScreen.tsx:209` gates `MatchdayFlow` behind `const useMatchday = settings.mode !== "builder" && (panel.managerMode || panel.matchView === "live")`, and `LiveRun.tsx:117` hardcodes `const useMatchday = false`.
   - Yet `src/engine/replay.ts:27` and `src/engine/token.ts:25` already support `mode: "builder"` with full `manager` actions!
   - **Fix:** Remove `settings.mode !== "builder"` from `PlayScreen.tsx:209`, enable `MatchdayFlow` in `LiveRun.tsx:117` when `panel.managerMode || panel.matchView === "live"`, and add a `Matchday` toggle bar directly to `Builder.tsx` so players can test-drive their custom dream squads in live coached matches.
2. **Builder lacks two-tap swapping and leaks ratings when `showRatings === false` (`[measured]`):**
   - `Builder.tsx:260-281` omits `swapFrom` state on `<Pitch>`, so tapping a filled slot always opens the `900+` species `Picker` modal instead of allowing quick two-tap formation swaps.
   - `Picker.tsx:308-320, 417-420` still renders `★ Best for {role}` suitability pills and `swapFit` badges even when the player toggled `"Hide ratings"` (`showRatings === false`).
   - Browser `Back` while `ScoutingDossier` is open on top of `Picker` closes both modals simultaneously because both register `window.addEventListener("popstate", ...)` (`Picker.tsx:97-107` and `ScoutingDossier.tsx:115-124`).

### 3.4 Scouting Dossier (`ScoutingDossier.tsx`)

1. **Goalkeepers display outfield radar axes (`PAC, SHO, PAS, DRI, DEF, PHY`) instead of GK axes (`DIV, REF, HAN, GKP, KIC, AER`) (`[measured]`):**
   - `ScoutingDossier.tsx:25-32` hardcodes `RADAR_AXES` to the 6 outfield attributes for every Pokémon, even when `activeRole === "GK"` or when the Pokémon's primary roles include `GK` (`src/scouting/attributes.ts:111-145` already computes all 6 goalkeeper attributes `diving`, `reflexes`, `handling`, `gkPositioning`, `kicking`, `aerial`).
   - **Fix:** Switch `RADAR_AXES` dynamically to `["diving", "reflexes", "handling", "gkPositioning", "kicking", "aerial"]` (`DIV, REF, HAN, GKP, KIC, AER`) whenever `activeRole === "GK"`.
2. **Hidden ability multipliers and move point contributions (`[measured]`):**
   - `src/scouting/ability-traits.ts:19` (`ABILITY_TRAITS`) and `src/scouting/coefficients.ts:148-186` (`MOVE_TRAIT_POINTS`) drive Layer 1 attributes and Layer 3 role fits, and `src/scouting/attributes.ts:147-198` exports `attributeBreakdowns()`, yet `ScoutingDossier.tsx:359-374` displays only plain ability names and trait labels without showing their numeric boosts (such as `Speed Boost: +12 PAC, +6 DRI`). Surfacing these numbers directly embodies `principle-explain-the-number`.

### 3.5 Results screen (`ResultsView.tsx`), Star calculation (`starCalculation.ts`), and Exhibitions (`ExhibitionMatchModal.tsx`)

1. **Duplicate competing broadcast systems on `ResultsView` (`[measured]`):**
   - `ResultsView.tsx:148-168` mounts `<MatchdayLive>` (a legacy text-only minute ticker with no 2D pitch) at the top of the page, while each match card in `<MatchList>` (`MatchList.tsx:113-121`) has a `"Watch live"` button that opens `<MatchReplay>` (the full 2D `<Broadcast>` stage). Both can play simultaneously with competing clocks and sound effects.
   - **Fix:** Retire the legacy text-only `<MatchdayLive>` component (or upgrade `"Play Matchday Live"` to sequence all 3 cup rounds through `<MatchReplay>`'s 2D `<Broadcast>` stage).
2. **`starCalculation.ts` awards `"BLOCK!"` to keepers who lost `0-3` and styles losing records as `"D"` (`[measured]`):**
   - In `src/components/results/starCalculation.ts:141-157`, if the user scores 0 goals (`goalsFor === 0`) and has no assists or saves, the fallback awards Match Star to `draft.lineup.starters[0]` (even if substituted off) and sets the callout to `"BLOCK!"` whenever `starters[0]` is a `GK`, even if the keeper conceded 4 goals in a `0-4` loss and made 0 saves.
   - In `starCalculation.ts:222`, `getTournamentMvp` sets `tone: cup.wins > cup.losses ? "W" : "D"`, coloring `0W-0D-3L` records yellow (`"D"`) instead of `"L"`.
3. **Exhibition matches cannot use drafted Cup squads or the 2D `<Broadcast>` stage (`[measured]`):**
   - `ExhibitionMatchModal.tsx:163-166` only reads `localStorage["pokedraft.builder"]` (ignoring all completed Cup runs in `pokedraft:history`) and uses a bespoke text-only goal ticker (`ExhibitionMatchModal.tsx:139-227`) instead of rendering `<MatchPlayer>` / `<Broadcast>`.

---

## 4. Mobile-friendliness and small-viewport ergonomics (`320px` to `430px`)

1. **Home screen mobile fold and duplicate disclosure buttons (`[measured]`):**
   - `src/components/home/SidePanel.tsx:99` initializes `const [open, setOpen] = useState(true)`.
   - At `@media (max-width: 959px)` (`src/components/home/SidePanel.module.css:5-7, 13-17, 46-48, 127-131` and `HomeScreen.module.css:28-31`), `.panel` uses `display: contents !important` to place `.hub` at `grid-row: 1`, `.playCard` at `grid-row: 2`, `.more` (expanded by default!) at `grid-row: 3`, and `.builder` at `grid-row: 4`.
   - On a `375x667` or `390x844` phone, the Squad Builder pitch is pushed **`1,300px+` below the fold**, and two separate buttons (`"Challenge Hub"` at `SidePanel.tsx:125-133` and `"Hide settings and records"` at `SidePanel.tsx:170-178`) toggle the same `moreId` container with different labels.
   - **Fix:** Default `open` to `false` below `960px` (or persist user collapse state), remove the duplicate toggle button in `.hubHead`, and surface the active ruleset summary pill directly inside `.playCard`.
2. **`320px` (iPhone SE) 2-column CTA button wrapping (`[measured]`):**
   - `.ctas` (`SidePanel.module.css:77-82`) and `.actions` (`ConfirmPlay.module.css:56-61`) hardcode `grid-template-columns: 1fr 1fr` with no narrow-screen breakpoint. At `320px`, `"Play with this squad"` and `"Challenge Hub"` wrap across 2 to 3 lines inside `127px`-wide buttons.
   - **Fix:** Stack `.ctas` and `.actions` to `grid-template-columns: 1fr` at `@media (max-width: 380px)`.
3. **Safe-area inset gaps on non-Home routes (`[measured]`):**
   - `src/app/globals.css:359` sets `.page { padding-bottom: var(--space-10); }` (`48px`) without `env(safe-area-inset-bottom, 0px)`. Because `SiteFooter` is only rendered inside `HomeScreen.tsx:266` and omitted from `/daily`, `/play`, `/leaderboard`, `/history`, `/how-to-play`, and `/r/[token]`, bottom elements on those routes sit inside the iOS home-indicator zone.
   - **Fix:** Set `padding-bottom: calc(var(--space-10) + env(safe-area-inset-bottom, 0px))` on `.page` in `src/app/globals.css:359`.
4. **Broadcast HUD and Touchline vertical crowding on mobile (`[measured]`):**
   - During a live match on a `375px` phone (`MatchPlayer.module.css`), the top header, 2D pitch, event bar, clock bar, commentary ticker, and expanded Touchline panel stack vertically past `950px`. Users cannot watch the 2D pitch and operate the Touchline controls simultaneously without scrolling up and down.
   - **Fix:** On mobile (`< 720px`), dock a compact **Touchline Quick-Bar** directly under the 2D pitch (5 single-row tactic chips + a `"Sub (3)"` drawer trigger that auto-pauses the clock and overlays the bottom half of the screen while keeping the 2D pitch and scoreboard pinned at the top).

---

## 5. UI/UX, design system, theme/CVD, and feature discoverability

1. **Discoverability of Manager Mode and Live Match Broadcast (`[measured]`):**
   - `DEFAULT_PANEL` (`src/ui/settings.ts:45-46`) sets `managerMode: false, matchView: "quick"`.
   - On `/`, the `Matchday` toggle lives at the bottom of `"Settings and records"` (`SidePanel.tsx:180-198`), under a sub-caption that says `"Set up the builder, or change the rules before a run"` (`SidePanel.tsx:186`).
   - `ConfirmPlay.tsx` (`src/components/SettingsSummary.tsx` / `src/ui/settingsSummary.ts:10-38`) omits `Matchday` (`Sim vs Manager`, `Quick vs Live`) from the pre-run confirmation dialog, and `/how-to-play` (`src/app/how-to-play/page.tsx:38-45`) never mentions Manager Mode, Tactics, Energy/Stamina, or Live Broadcast.
   - **Fix:**
     1. Promote the **Matchday Mode (`Sim` vs `Manager` · `Quick` vs `Live`)** selector into `.playCard` (`SidePanel.tsx:135-179`) and `ConfirmPlay.tsx` (`settingsSummary.ts:10-38`) so players choose how they want to experience matchday right before every Cup or Friendly.
     2. Add a dedicated `"5. Manage from the touchline"` section to `/how-to-play` (`src/app/how-to-play/page.tsx`).
2. **Dark-mode atmosphere leaks into Light ("Day") theme and bypasses `theme-color-lint.mjs` (`[measured]`):**
   - `src/design/stadium.css:1-44` applies a dark floodlight radial vignette (`rgba(10, 14, 23, 0.55)`) unconditionally in both Light and Dark themes.
   - `src/components/home/SidePanel.module.css:21-29, 43, 55-59, 88-93` hardcodes dark-mode neon mint and electric-blue `rgba(...)` borders and gradients with no `[data-theme="light"]` override, and `scripts/audit/theme-color-lint.mjs:16` fails to catch them because its regex only scans `rgb(` and misses `rgba(`.
   - **Fix:** Scope the dark floodlight vignette in `stadium.css` to `[data-theme="dark"]` (and `@media (prefers-color-scheme: dark)` under `auto`), replace hardcoded `rgba(...)` literals in `SidePanel.module.css` with theme tokens, and update `scripts/audit/theme-color-lint.mjs:16` to match `\brgba?\s*\(` and `\bhsla?\s*\(`.
3. **Duplicate token blocks in `src/design/tokens.css` and razor-thin CVD margins (`[measured]`):**
   - `src/design/tokens.css:1-116` and `118-279` define two separate `:root` and dark-mode blocks in the same file, including a dead `--border-control: #8E9684` at `line 13` and a confusing `--ink-soft: var(--text-muted)` alias at `line 139`.
   - `pnpm audit:cvd` passes by just `0.0005` (`--type-ground` vs `--type-grass` dark protanopia `4.0005` vs `4.0` threshold) and `0.0014` (`--type-rock` vs `--type-fire` dark deuteranopia `4.0014`), while `TYPE_PALETTE` in `src/design/stadium.ts:4-23` is not checked by `scripts/audit/theme-cvd.mts`.
4. **Navigation active state (`aria-current="page"`) and `ThemeToggle` hydration (`[measured]`):**
   - `SiteNav.tsx:27-57` and `layout.tsx:44-63` never set `aria-current="page"` or apply the existing `.site-nav-item--selected` CSS class (`primitives.css:407-410`), so users have no active tab indicator in the header or mobile bottom nav.
   - `ThemeToggle.tsx:14-28` initializes `mode` to `"auto"` on initial render before `useEffect` reads `document.documentElement.dataset.theme`, flashing `"Auto"` on load, and never updates `<meta name="theme-color">` when toggling themes client-side.

---

## 6. Backend, database, leaderboard, security, share cards, and social features

### 6.1 Server bundle regression & retained engine deduplication

1. **`2.89 MB` of duplicate retained JSON in `.next/server/chunks` (`[measured]`):**
   - **Where:** `next.config.ts:40-42`, `scripts/build/retained-json-loader.cjs:8-17`, and `scripts/build/measure-retained-json.mjs:57`.
   - **Mechanism:**
     - `next.config.ts:41` matches `/(?:^|\/)src\/engine\/versions\/v[1234]\/src\/data\/(pokedex|scouting)\.json$/`, which omits `v5`. Consequently, `v5/src/data/pokedex.json` (`485,196` bytes, identical to live `src/data/pokedex.json`) is bundled a second time.
     - `scripts/build/retained-json-loader.cjs:8-17` only compares a retained JSON file against the live `src/data/<basename>`. When Engine 6 modified 4 species in `src/data/scouting.json`, `v2`, `v3`, `v4`, and `v5`'s `scouting.json` files (all `803,138` bytes and byte-identical to one another, SHA-256 `5f4b34e3...`) stopped matching `src/data/scouting.json`. Because the loader does not check earlier retained versions `v1..v(N-1)`, `.next/server/chunks` emits **4 identical copies of that 803 KB `scouting.json`** (`3.21 MB`).
     - Running `node scripts/build/measure-retained-json.mjs .next/server/chunks` currently fails with `AssertionError: 8 !== 3` (`totalPayloadBytes: 5784409`).
   - **Fix:** Change `v[1234]` to `v\d+` in `next.config.ts:41`, update `retained-json-loader.cjs` to re-export the earliest byte-identical retained version when `source` differs from `src/data/<basename>`, update `measure-retained-json.mjs` expected count to `4`, and add `node scripts/build/measure-retained-json.mjs .next/server/chunks` to `.github/workflows/ci.yml`.
2. **Duplicate token codecs across `src/proxy.ts` and UI helpers (`[measured]`):**
   - `src/proxy.ts:2-4` imports three token decoders (`./engine/token`, `v3/src/engine/token`, `v5/src/engine/token`), even though `v3` and `v5` `token.ts` files have zero diff, while `squad-preview.ts:9-12`, `challenge-href.ts:9-14`, and `builder-token.ts:27-32` each regex-rewrite `^pd\d+\.` before calling `decodeToken`.
   - **Fix:** Export a single `decodeAnyToken(token)` from `src/engine/token.ts` that validates any version in `[RUN_TOKEN_VERSION, ...RETAINED_TOKEN_VERSIONS]` and enforces `MANAGER_TOKEN_VERSIONS` for `manager` actions.

### 6.2 Security, passcode gate, and database efficiency

1. **Unhandled 500 in `POST /gate/unlock` on malformed/non-form bodies (`[measured]`):**
   - `src/gate/unlock.ts:30` calls `const form = await req.formData()` outside the `try / catch` block. Sending `Content-Type: application/json` or `text/plain` throws an unhandled `TypeError` (HTTP 500) instead of redirecting with `303` to `/gate?error=1`.
2. **Unauthenticated CPU work when `FRIENDS_PASSCODE` is enabled (`[measured]`):**
   - `/card` and `/gate` are in `PUBLIC` (`src/passcode.ts:9, 14`). `generateMetadata` in `src/app/gate/page.tsx:13-24` runs a full engine replay (`loadRun(token)`) before passcode verification, and `/r/<invalid>/opengraph-image` (`src/app/r/[token]/opengraph-image.tsx:15-34`) invokes Satori + Resvg PNG generation even when `loadRun(token)` returns `null`.
   - Meanwhile, `src/proxy.ts:66` runs `proxy()` on every `/creatures/default/<id>.webp` sprite request because `creatures/` is omitted from `config.matcher` and `isPublicPath`.
3. **Database query and index optimizations (`[measured]`):**
   - **Double `dailyTaken` probe on all-time submissions (`src/leaderboard/server/store.ts:115-127`):** Short-circuit `dailyTaken` to `sql\`false\`` when `board.dailyDate === null`.
   - **Pruning CTEs run on idempotent retries (`src/ratelimit/store.ts:67-87`):** Gate `pruned_events` and `pruned_buckets` with `WHERE ${needed}`, and replace `(SELECT max(attempt) FROM unnest(attempts)...)` (`line 45`) with O(1) `attempts[cardinality(attempts)]`.
   - **Combine `insert` + `rankOf` into one HTTP round-trip (`src/leaderboard/server/handlers.ts:245-267`):** Compute rank inside a `WITH inserted AS (INSERT ... RETURNING *)` CTE to cut fresh-submission Neon HTTP queries from 3 to 2.
   - **Double token decode per row in `toBoardEntry` (`src/leaderboard/server/store.ts:210-229`):** Decode `row.token` once in `toBoardEntry` to extract `squadSpeciesIds`, `coached`, and `formation`, cutting Node JSON/base64 work on `GET /api/leaderboard` in half (from 100 decodes to 50).

### 6.3 Leaderboard, share cards, and friend-group multiplayer upgrades

1. **`rankOf` ignores the `coach` filter, and `coach` is missing from URL state (`[measured]`):**
   - `store.top(board, coach)` (`src/leaderboard/server/store.ts:199-206`) ranks `all`, `uncoached`, and `coached` views separately (`1..50`), but `store.rankOf(row, board)` (`store.ts:192-198`) always returns the unfiltered `all` rank. An uncoached run that is `#1` on the `Uncoached` board is reported as `#52` in `SubmitPanel.tsx:81-83` if 51 coached runs outscore it.
   - `Board.tsx:41` stores `coach` only in local `useState` instead of URL query params (`BoardView` in `src/components/leaderboard/client.ts:17-21`), so friends cannot link directly to `/leaderboard?mode=cup8&scope=all&coach=uncoached`.
2. **Daily leaderboard rows repeat `"Open, Squad first, All regions"` instead of showing Formation (`[measured]`):**
   - On the Daily challenge, rules are fixed to `open.squadFirst.g123456789` and the only pre-draft choice is **Formation** (`4-3-3`, `4-4-2`, etc.). Yet `Board.tsx:206` renders `"Open, Squad first, All regions"` on every single Daily row and hides the formation each friend chose.
3. **Shared Builder links (`/?b=<token>`) lack OpenGraph image tags, and Run share cards omit `Coached` (`[measured]`):**
   - `/card?b=<token>` (`src/app/card/route.tsx:11-12`) already renders a 1200x630 PNG lineup card, but `src/app/page.tsx:1-14` has no `generateMetadata` to wire `/?b=<token>` to `/card?b=<token>`.
   - `runCardModel` (`src/components/share/card.tsx:53-70`) and `ResultPanel` (`src/components/share/card-panel.tsx:268-279`) omit a `Coached` chip, so downloaded PNG cards and Discord/iMessage previews never indicate whether a run was coached.
4. **High-leverage social features for the friend group (`[design proposal]`):**
   - **Shared-Seed Mini-Leaderboards (`GET /api/leaderboard?mode=cup8&seed=<seed>`):** `leaderboard_entries` already stores `seed` (`src/db/schema.ts:23`). When friends click `"Challenge this Seed"`, show a live **"Friends on this Seed"** table on `/r/[token]` and `ResultsView` comparing everyone who drafted from that exact seed.
   - **Head-to-Head Exhibition Links (`/r/[token]?vs=[challengerToken]`):** Let players pick **any squad from their Run History (`pokedraft:history`) or Builder**, play a 2-legged tie on the full 2D `<Broadcast>` stage with Manager Mode touchline controls, and copy a shareable head-to-head result link (`/r/[token]?vs=[challengerToken]`) with a dual-squad share card.
   - **Personal Nickname Highlight & Friend-Group Rivalry Strip on `/leaderboard`:** Read `pokedraft:nickname` from `localStorage` to highlight the player's own entries in `Board.tsx`, add a nickname filter chip, and show a compact **"Daily Champions / Trophy Cabinet"** strip summarizing how many daily crowns each friend has won.

---

## 7. Prioritized implementation roadmap

| Tier | Dispatch candidate | Risk tier | Primary files touched | Expected impact |
| --- | --- | --- | --- | --- |
| **Phase 1: Immediate bug & build fixes** | **1A. Retained JSON server bundle deduplication & CI gate** | Red (deploy/build) | `next.config.ts:41`, `scripts/build/retained-json-loader.cjs`, `scripts/build/measure-retained-json.mjs`, `.github/workflows/ci.yml`, `src/gate/unlock.ts:30`, `src/proxy.ts` | Cuts `2.89 MB` of duplicate JSON from `.next/server/chunks`, fixes `measure-retained-json.mjs`, and prevents unhandled 500 on `/gate/unlock`. |
| **Phase 1: Immediate bug & build fixes** | **1B. Broadcast single-timeline sync, elemental SFX restoration, SVG trail aspect fix & mobile nameplate scaling** | Yellow (UI/audio) | `src/components/matchday/MatchPlayer.tsx`, `src/components/matchday/Broadcast.tsx`, `src/components/matchday/Broadcast.module.css`, `src/ui/matchday/moves.ts`, `src/ui/matchday/timeline.ts` | Restores all elemental move audio, fixes `playRng` jump/desync, restores `11px` readable carrier badges on mobile, and fixes squashed SVG trails. |
| **Phase 2: Manager Mode & Live Match overhaul** | **2A. Touchline UX & Coaching Intelligence** | Yellow (UI) | `src/components/matchday/Touchline.tsx`, `src/components/matchday/MatchPlayer.tsx`, `src/components/matchday/MatchdayFlow.tsx`, `src/ui/manager/touchline.ts` | Adds role suitability/fit deltas and `STA` to bench subs, yellow card badges on energy rows, opponent tactical style + counter hints in HUD, auto-pause on Touchline interaction, a 65' fatigue window prompt, and merges `PreMatch` + `0'` kickoff stop. |
| **Phase 2: Manager Mode & Live Match overhaul** | **2B. Penalty shootout flight choreography, goal/kickoff continuity, 18-type effects & Live Momentum bar** | Yellow (UI) | `src/ui/matchday/timeline.ts`, `src/ui/matchday/player.ts`, `src/ui/matchday/moves.ts`, `src/components/matchday/Broadcast.tsx`, `src/components/wheel/sound.ts` | Adds sub-kick run-up and ball-flight animation + SFX for penalty shootouts, smooth goal/kickoff transitions, 18-type visual/audio coverage, clickable highlight pips, and a live pressure/shots bar. |
| **Phase 3: Mobile & Core UX polish** | **3A. Mobile 3D Pitch scroll-trap fix, Position-First Scouting Dossier, GK Radar & Builder Matchday** | Yellow (UI) | `src/components/pitch/Pitch.tsx`, `src/components/pitch/Pitch.module.css`, `src/components/run/DraftBoard.tsx`, `src/components/scouting/ScoutingDossier.tsx`, `src/components/run/PlayScreen.tsx`, `src/components/builder/Builder.tsx` | Unblocks vertical page scrolling over 3D pitch cards on phones, widens mobile pitch sprites from `31px` to `48px`, enables `ScoutingDossier` in `positionFirst` draft mode, shows `GK` radar axes, and unlocks Manager Mode / Live Match in Builder friendlies. |
| **Phase 3: Mobile & Core UX polish** | **3B. Mobile Home fold, Matchday onboarding, Light-theme cleanup & safe-area polish** | Yellow (UI) | `src/components/home/SidePanel.tsx`, `src/components/home/SidePanel.module.css`, `src/design/stadium.css`, `src/design/tokens.css`, `src/app/globals.css`, `src/app/how-to-play/page.tsx` | Collapses secondary settings by default on mobile so Builder is visible above the fold, promotes Matchday mode selection, fixes Light-mode dark leaks, and adds `safe-area-inset-bottom`. |
| **Phase 4: Leaderboard & Friend-Group Social** | **4A. Coached rank parity, Formation on Daily board, `/?b=` OG cards & Seed Leaderboards** | Red (leaderboard/API) | `src/leaderboard/contract.ts`, `src/leaderboard/server/store.ts`, `src/leaderboard/server/handlers.ts`, `src/components/leaderboard/Board.tsx`, `src/app/page.tsx`, `src/components/share/card.tsx`, `src/components/results/ExhibitionMatchModal.tsx` | Returns category-accurate coached/uncoached rank, puts `coach` in URL state, shows Formation on Daily rows, adds OG image cards to `/?b=` links and `Coached` badges to run cards, and adds shared-seed leaderboards + History-powered 2D Broadcast exhibitions. |
