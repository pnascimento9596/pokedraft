# Engine 7 missable penalties and nominated takers (6b3)

Wave 6 row 6b3, Red. Branch `feat/engine7-penalties` off `origin/main` at `6b7d40a` (the 6b2
squash). Dormant: the live coefficients keep `penalty.missable: false`, `penalty.awardShare: 0`
and `takers.freeKickWeight: 1`, and tokens stay pd6, so production engine output is exactly
engine 6's and no player sees the new control.

## Who notices

Nobody yet. From the flip (6b9):

- A penalty can be missed. About a quarter of the penalties a side is awarded do not go in: the
  keeper saves some, the taker puts others wide. A good 4-3-3 side sees about 0.4 unscored
  penalties per cup.
- Penalties come from their own draw instead of relabelling a goal, so the penalty count no longer
  rides on the goal count, and the side that makes more chances is awarded more penalties.
- In manager mode the pre-match card and the touchline's expanded view gain a "Set pieces" row:
  "Penalties" and "Free kicks", each "Auto (best shooter)" or a named player on the pitch. The
  penalty nominee takes the side's penalties and kicks first in a shootout; the free-kick nominee
  is 1.5 times as likely to be the one who scores a free kick. Sim mode never shows it.
- The broadcast plays a missed penalty as a kick from the spot that flies past the post, and a
  saved one as a save from the spot, each with its own commentary line.

## Scope and files

Engine (Red):

- `src/engine/coefficients.ts`, `coefficients-v7.ts`. `penalty: { missable, awardShare }` and
  `takers: { freeKickWeight }`. Live `false`, `0`, `1`; V7 `true`, `0.077`, `1.5`.
- `src/engine/rng.ts`. `set_pieces` appended to `SUBSTREAMS`.
- `src/engine/types.ts`. Manager action `{ type: "taker"; match; minute; set; slot: StarterIndex
  | null }`, `SET_PIECES`, `SetPiece`, and the incident `{ kind: "penalty"; side; minute; slot;
  taker; keeper; outcome: "saved" | "missed" }`.
- `src/engine/match.ts`. The set-piece draws and `takePenalty`, `keeperShare`, `bestShooter`,
  nominations (`takers`, `nominee`), the free-kick weight in `pickScorer`, the shootout order in
  `shootoutOf`, and `ChanceObservation.outcome` gains `"missed"`.
- `src/engine/token.ts`. `managerSchemaFor(version)`, the `p` and `f` tuples, and the refusal in
  `encodeToken`. `src/engine/story.ts` documents `"missed"`.
- `scripts/calibration/probe-modes.ts`. The kinds probe counts awarded, saved and missed
  penalties.

UI (dormant): `src/components/matchday/SetPieceTakers.tsx` and `.module.css` (new),
`MatchdayFlow.tsx`, `Touchline.tsx`, `MatchPlayer.tsx`, `src/ui/manager/touchline.ts`,
`your-calls.ts`, `src/ui/matchday/copy.ts`, `timeline.ts`, `cutin.ts`,
`src/components/results/format.ts`, `MatchIncidents.tsx`.

Tests: `penalties.test.ts`, `set-pieces-draws.test.ts`, `rate-parity.test.ts`,
`penalty-miss.test.ts`, `MatchdayFlow.setPieces.test.tsx`, `Touchline.setPieces.test.tsx`,
`e2e/penalty-takers.spec.ts` (new), plus additions to `token.test.ts`, `rng.test.ts`,
`v6-parity.ts`, `touchline.test.ts`, `your-calls.test.ts`, `MatchdayFlow.prematch.test.tsx`,
`Touchline.test.tsx`, and fixture fields in `Broadcast.test.tsx`.

No file under `src/scouting`, `scripts/data` or `src/data` changed. `goldens.test.ts` is
byte-identical to `origin/main` and green.

## The rule

With `penalty.missable` on, every five-minute window (regulation and extra time) opens one stream
per side, `deriveSubseed(seed, "set_pieces", "match:<i>:w<n>:<side>")`, and takes exactly two
draws from it whether or not anything happens:

1. `award`. The side is given a penalty when `award < min(1, awardShare * p * chancesPerSide)`,
   where `p` is the window's per-chance goal probability (`rate / total`, capped at
   `maxGoalProb`). The kick's minute is `first + floor(award / given * span)`, so the same draw
   places it inside the window.
2. `convert`. The taker scores when `convert < convertProb(penaltyEdge(taker, keeper))`. Otherwise
   the miss splits by `keeperShare = stop / (shot + stop)` (shot `0.75 SHO + 0.25 TEC`, stop the
   mean of REF, DIV, HAN and GKP): below `p + (1 - p) * keeperShare` the keeper saves it, above it
   the taker puts it wide.

The taker is whoever plays in the user's nominated position, if anyone does, else the highest SHO player on the pitch,
keeper included (ties by species id). The penaltyShare relabel draw is still taken (so the
`event_gen` stream is unchanged) but no longer turns a goal into a penalty.

With the rule off nothing opens the `set_pieces` stream and the relabel works as in engine 6.

## Guards

### RED then GREEN

Engine and codec. RED commit `e79487e4` adds the tests with scaffolding so they compile: the new
types, the coefficient fields at their engine 6 values (V7 at its candidates), the `set_pieces`
name, a `managerSchemaFor` stub with no taker tuple and no `encodeToken` refusal, the results copy
for the penalty incident, and a match engine that accepts and ignores a taker action.
`pnpm vitest run src/engine/__tests__/penalties.test.ts src/engine/__tests__/set-pieces-draws.test.ts src/engine/__tests__/token.test.ts`,
9 of 42 failed:

```
     × the engine 7 schema accepts a penalty taker and a free-kick taker back on Auto 3ms
     × encodeToken refuses a nominated taker while tokens are pd6 1ms
     × panel-7 match 1: exactly two draws per side per window, awarded or not 11ms
     × panel-24 match 4 with extra time: two draws per side in each of its 24 windows 5ms
     × panel-7 match 1: 802 misses a penalty at 9', the keeper is 88 4ms
     × the 9' kick is observed as a missed penalty chance at 0.80725, then 11' scores 1ms
     × panel-24 match 4: 346 saves 784's penalty at 71', the match still goes to extra time 2-2 4ms
     × with slot 10 nominated from kickoff, 903 scores it instead 3ms
     × with slot 10 nominated, 857 kicks first and the rest keep their order 2ms
 Test Files  3 failed (3)
      Tests  9 failed | 33 passed (42)
```

GREEN `955960a9`: 42 of 42. The literals (all golden panel lineups, cup8 4-2-3-1, under
`ENGINE_COEFFICIENTS_V7`):

- Award and miss: panel-7 match 1, `{ kind: "penalty", side: "user", minute: 9, slot: 7, taker:
  802, keeper: 88, outcome: "missed" }`, observed at p 0.80725; a second award at 11' scores.
- Save: panel-24 match 4, `{ ..., minute: 71, slot: 10, taker: 784, keeper: 346, outcome: "saved" }`
  at p 0.7695; the match still ends 2-2 and goes to extra time.
- Free kick: panel-7 match 4, the 58' free kick goes to 858 (slot 9) uncoached and to 903 when
  slot 10 is nominated from kickoff. With `freeKickWeight` 1 the nomination leaves it with 858.
- Shootout: panel-2 match 3 (0-0 after extra time), uncoached kickers `[149, 392, 727, 638, 389]`,
  with slot 10 nominated `[857, 149, 392, 727, 638]`.
- Draw count: panel-7 match 1 opens exactly the 36 scopes `match:1:w0:user` to `match:1:w17:opp`
  with 2 draws each; panel-24 match 4 (extra time) opens 48, each with 2.

Broadcast. RED `aea5b54e` (test only, so it also fails typecheck on `Beat.penalty`), 4 of 4
failed:

```
     × panel-7 match 1: a save beat at 9' marked missed, read as 'Penalty missed' 26ms
     × panel-24 match 4: a save beat at 71' marked saved, read as 'Penalty saved' 10ms
     × between strike and reach the ball flies from the user's spot (89, 50), wide of the post 9ms
     × a penalty put wide gets no keeper cut-in; a saved one shows the keeper, Cradily (346) 15ms
 Test Files  1 failed (1)
      Tests  4 failed (4)
```

GREEN `74d385f7`: 4 of 4.

Manager UI. RED `ad4437a9` (test only), 11 of 61 failed:

```
     × records { type: 'taker', match: 0, minute: 0, set: 'penalty', slot: 10 } and leaves managed off 2ms
     × a later stop still shows the nominee, and Auto records a null slot 0ms
     × refuses the taker already in place: 'That is already your taker.' 2ms
     × decideAll records a tactic and both takers at kickoff in order 0ms
     × names the set piece and the minute 3ms
     × shows the current nominee: Pikachu on penalties, Auto on free kicks 35ms
     × records a free-kick taker and a return to Auto 12ms
     × is disabled after the final whistle 9ms
     × offers Penalties and Free kicks, each on Auto (best shooter) with the eleven listed 140ms
     × a penalty taker in slot 10 records only that nomination at 0' 11ms
     × picking a taker and going back to Auto records nothing 11ms
 Test Files  4 failed | 3 passed (7)
      Tests  11 failed | 50 passed (61)
```

GREEN `41a2243c`: 61 of 61.

### Regression guards, no RED: behaviour already correct

- Engine 6 keeps relabelled penalties: panel-7 match 1 at the live coefficients has no penalty
  incident and penalty goals at 36' and 70' (`penalties.test.ts`), and opens no `set_pieces`
  stream (`set-pieces-draws.test.ts`).
- Codec (`token.test.ts`): `managerSchemaFor(6)` rejects `["p", 2, 0, 10]`; a forged pd6 token
  carrying it is `invalidAction` in both the live decoder and the frozen v6 codec, while the same
  body with a tactic decodes in both; `encodeToken(decodeToken(GOLDEN_CUP8_V6))` is
  byte-identical to `GOLDEN_CUP8_V6`.
- Substreams (`rng.test.ts`, `f8766c35`): the first `uint32` of each of the 11 existing
  substreams for `deriveSubseed("pin-seed", name, "match:0:w0")`. These pass against
  `origin/main`'s `rng.ts` (checked by swapping it in), so appending `set_pieces` moved none.
  `set_pieces` draws 3503216661 first.
- Per-trial rate parity (`rate-parity.test.ts`, helpers in `v6-parity.ts`): golden panel runs 0
  to 7, each uncoached and holding Counter or Press from kickoff and 45', every match the run
  plays: 123 matches and 12,946 trials, each observation (rate, outcome, kind, shooter, slot)
  identical to the frozen engine 6 bundle. Self-test (the 6b2 carryover): one engine 7 term live
  in a `structuredClone` of the live coefficients, counting the side of each match's first
  divergence: `counterLead` 1.1, user 23 and opponent 11; `pressFade.perPoint` 0.004, user 20 and
  opponent 13; missable penalties at `awardShare` 0.077, user 23 and opponent 15. So the guard
  sees each term, on the opponent's side too.
- `missable` only with pd7 (`96844719`): `!ENGINE_COEFFICIENTS.penalty.missable ||
  RUN_TOKEN_VERSION >= 7`. Found by the browser proof (below).
- UI at engine 6: no Set pieces row on the pre-match card (either mode) or the touchline, in unit
  tests and in `e2e/penalty-takers.spec.ts`.

### Moved engine 7 literals

Two 6b1 and 6b2 tests pin V7 scores, and each gains one penalty goal from the new award draw:
`split-managed.test.ts` (panel-0 match 1, 3-0 to 4-0, a penalty at 61') and
`tactic-edges.test.ts` (panel-0 match 4, Press 6-2 to 7-2 at 57', Balanced 4-2 to 5-2 at 58').
With the penalty rule switched off in V7 both return to their old scores (checked); their
assistant and rate expectations are unchanged.

## Measurements

Against `docs/reports/engine-7/baseline-v6.json` (6p). V7 here is the whole candidate (split
managed, 6b2's tactic edges and this row), so the deltas are not this row's alone.

Kinds, `--probe kinds --n 2000 --coeffs v7` (good bot, 4-3-3), sha256 `6cb0a06f...`, 15.0 s:

| | Engine 6 baseline | V7 |
| --- | --- | --- |
| matches | 13,914 | 13,949 |
| penalty goals per match | 0.2036 (2,833) | 0.2038 (2,843) |
| user penalty goals | 2,506 | 2,511 |
| opponent penalty goals | 327 | 332 |
| penalty share of user goals | 0.0592 [0.0570, 0.0615] | 0.0558 [0.0537, 0.0579] |
| penalty share of opponent goals | 0.0598 [0.0538, 0.0664] | 0.0564 [0.0508, 0.0626] |
| penalties awarded per match | 0.2036 (all scored) | 0.2617 (3,651) |
| conversion | 1 by construction | 0.7787 [0.7649, 0.7919] |
| saved / put wide | 0 / 0 | 300 / 508 |
| unscored penalties per cup | 0 | 0.404 (0.150 saved, 0.254 wide) |
| user goals | 42,344 | 45,008 |

`awardShare` was tuned to keep penalty goals per match at engine 6's level: 0.075 gave 0.1988,
0.077 gives 0.2038. Total goals rise because the relabel no longer converts goals into
penalties, so the penalty share of goals falls slightly while the count holds. The free-kick
share is 0.0737 user, 0.0820 opponent (baseline 0.0733, 0.0842).

Shootouts, `--probe shootouts --n 15000 --coeffs v7`, sha256 `8d0a1e3d...`, 112.2 s:

| | Engine 6 baseline | V7 |
| --- | --- | --- |
| knockout matches | 59,226 | 59,505 |
| shootout rate | 0.0886 [0.0863, 0.0909] | 0.0808 [0.0786, 0.0830] |
| user wins a shootout | 0.5052 [0.4917, 0.5188] | 0.5055 [0.4914, 0.5196] |
| top minus bottom edge quartile | +0.1029 [+0.0647, +0.1407] | +0.1169 [+0.0770, +0.1563] |
| coin deciders | 0 | 0 |

Fewer level knockouts reach a shootout (more goals); the shootout itself is unchanged by this row
(no probe bot nominates a taker).

Browser (`e2e/penalty-takers.spec.ts`, Chromium, headless): both selects 44 px tall and inside
the viewport with no side scroll. Pre-match: 390 px 145x44 at x 45 and x 200 (side by side); 360
px 270x44, 320 px 230x44, 308 px 218x44 (stacked, x 45). Touchline expanded: 390 px 178x44, 360
px 163x44, 320 px 143x44 (side by side, x 12); 308 px 284x44 (stacked). Screenshots in
`docs/reports/engine7-penalties/`.

## Product decisions

- Award in proportion to the window's expected goals rather than at a flat rate: a flat rate gave
  weak sides about four times their engine 6 penalties and turned penalties into a leveller.
  Proportional awards keep each side's penalty count where engine 6 had it.
- A miss splits into saved and wide by the keeper's stopping attributes against the taker's
  shooting, so a strong keeper saves more and the broadcast can tell the two apart.
- A nomination never takes the touchline from the assistant. It is a set-piece choice, not a
  tactic or a sub, so the assistant's tactics and fatigue subs stay on and the 65' stop logic
  ignores it. It does mark the run coached (the token carries a manager decision).
- "Auto (best shooter)" is the default and can be chosen again at any stop. A nomination names a
  position: whoever plays there takes the kick, so a substitute in that position inherits it, and
  an empty position (a red card) hands it back to Auto.
- Copy: "Set pieces", "Penalties", "Free kicks", "Auto (best shooter)", "Name (position)";
  refusals "That is already your taker." and "Nobody is playing in that position."; commentary
  "Penalty saved. <keeper> stops <taker>" and "Penalty missed. <taker> puts it wide"; Your calls
  "your penalty taker from kickoff", "your free-kick taker at 60'". Sentence case, no dashes.

## Implementation decisions

- The two draws per side per window are taken before any item in the window, right after the
  boundary, in a fixed order (user then opponent, award then convert), so the stream is
  independent of what happens in the match and the count is exactly two (guarded).
- The award draw doubles as the minute (`award / given` is uniform on [0, 1) once awarded), so the
  rule needs no third draw.
- A penalty kick is an item sorted with the window's other events at its minute (order 500 plus
  side), so decisions recorded at or before that minute apply first.
- A penalty goal is pushed with the same key order as `goalEvent`, so a V7 run serialises like any
  other.
- The shootout nominee is gated on `penalty.missable` too, so the whole row switches on one flag.
- The pre-match card records its tactic and takers in one `decideAll` replay, so the run is
  replayed once and a refusal of any decision records none.

### How the browser sees engine 7's row before the flip

The UI reads `SET_PIECES_ON = ENGINE_COEFFICIENTS.penalty.missable` at module scope, with no flag,
query or storage key. `e2e/penalty-takers.spec.ts` installs a `page.route` on
`**/_next/static/chunks/**` that replaces the minified live literal
`penalty:{missable:!1,awardShare:0},takers:{freeKickWeight:1}` with engine 7's
`penalty:{missable:!0,awardShare:.077},takers:{freeKickWeight:1.5}` in the responses the browser
downloads, and asserts at least one replacement happened. The precedent is the chunk route in
`e2e/data-split.spec.ts`. Nothing of this ships: the built chunks are untouched, and the engine 6
test in the same spec runs without the route.

Under the rewrite tokens are still pd6, and `encodeToken` refuses a taker in a pd6 token, so
recording a nomination there throws when the run is saved ("Something went wrong"). That is the
designed refusal, not a UI bug, but it means the rule and the token version must flip together.
The `96844719` guard pins it, and the e2e picks a taker, screenshots it, then returns to Auto
before kicking off; recording is covered by the unit tests.

## Brief vs code

- The brief has the actions "naming a slot". The tuple's slot is nullable: null is a return to
  Auto at a later stop, which the touchline needs. `managerSchemaFor(7)` accepts
  `["f", 2, 45, null]`.
- The brief says no nomination means the max SHO player, keeper included. Code: `bestShooter`
  sorts the players on the pitch by SHO descending, then species id.
- After the flip, the client's `readAnyToken` decodes with the live codec (pd7, taker tuples
  allowed). A forged pd6 token carrying a `p` tuple is refused by the frozen v6 codec, which the
  proxy and server use for pd6, so a client may render a forged pd6 link that the server rejects.
  That is harmless (nothing is stored) and must not be "fixed" by loosening the server's v6
  codec.
- The brief lists the shootout nominee without a gate. It is gated on `penalty.missable` so engine
  6 keeps its order whatever action arrives (none can: the token refuses it).
- `cupMatchInput` and `runCup` already accepted any manager action; no cup code changed.

## NOT RUN

- Review (GLM and the Red reviewer) and hosted CI: the coordinator runs them.
- Probe modes other than kinds and shootouts under V7 (manager, informed, noop, oracle, luck,
  upsets, formations). 6b8 measures the whole candidate.
- WebKit and the phone projects for the new spec (it sets its viewport on Chromium, like
  `prematch-merge.spec.ts`). A real phone check and a screen reader pass.
- A browser run that records a nomination end to end (blocked by the pd6 refusal by design; see
  above). Recording is unit tested.

## Carryovers

- 6b9 (flip): `penalty.missable`, `RUN_TOKEN_VERSION` 7 and the V7 coefficients go together; the
  `96844719` guard fails otherwise. Re-pin the e2e row tests on the live build and drop the chunk
  route from `e2e/penalty-takers.spec.ts`, and add an end-to-end nomination (pre-match record,
  touchline change, replay of the shared link).
- 6b8: tune `awardShare` with the rest of the candidate; it was set here only to hold penalty
  goals per match at engine 6's level. `freeKickWeight` 1.5 is untuned.
- Your calls will list nominations as calls; whether a nomination should count in the "what your
  calls changed" comparison is open for 6b9.
