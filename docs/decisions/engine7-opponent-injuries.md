# Engine 7: opponent injuries and rotation incidents (row 6b4, Red)

Branch `feat/engine7-opponent-injuries`, base `origin/main` `cee1ad14`. Dormant: every new
behaviour sits behind `ENGINE_COEFFICIENTS.opponent.injuries`, false live and true in
`ENGINE_COEFFICIENTS_V7`. Engine 6 output is unchanged (parity below).

## Scope

Under engine 7 a Boss Club player can be injured with the same draw and hazard as a user player.
A reserve from the club's own themed pool comes on, so the club keeps eleven. The 60' and 75'
opponent rotations become `rotate` incidents. Each window records the club's rounded outfield
energy as `oppEnergy`. The broadcast ticker, the pitch and the results list show all of it only
when it is present.

The row also carries two carryovers from 6b3. One is a literal guard on live
`takers.freeKickWeight`. The other widens the e2e engine 7 chunk switch so it also matches Vercel's
`/_next/static/immutable/chunks/` path.

## Files

- Engine:
  - `src/engine/coefficients.ts` and `coefficients-v7.ts` add `opponent.injuries`.
  - `src/engine/types.ts` widens the `injury` and `sub` `side` to `Side`, adds the `rotate` incident and adds `WindowSnapshot.oppEnergy?`.
  - `src/engine/opponents.ts` adds `bossReserve`.
  - `src/engine/match.ts` adds `MatchInput.mode?`, the opponent injury path, the rotate incident and `oppEnergy`.
  - `src/engine/cup.ts` passes `mode` into each match.
- Matchday UI: `src/ui/matchday/copy.ts`, `timeline.ts` and `player.ts`.
- Touchline: `src/ui/manager/touchline.ts` (only the user's injuries).
- Results: `src/components/results/format.ts`, `MatchIncidents.tsx` and `starCalculation.ts`.
- Ticker: `src/components/matchday/MatchPlayer.tsx` and `MatchPlayer.module.css`.
- Tests:
  - `src/engine/__tests__/opponent-injuries.test.ts` (new).
  - `rate-parity.test.ts` (self-test).
  - `token.test.ts` (pd6 guards).
  - `src/ui/matchday/__tests__/opponent-injury.test.ts` (new).
  - `src/components/results/__tests__/opponent-incidents.test.ts` (new).
- e2e:
  - `e2e/v7-switch.ts` (new shared switch).
  - `e2e/v7-switch.spec.ts` (new).
  - `e2e/penalty-takers.spec.ts` (uses the shared switch).
  - `e2e/opponent-injuries.spec.ts` (new).
- Probe: `scripts/calibration/probe-modes.ts` and `probe.test.ts`. The kinds probe now counts
  injuries, opponent reserves and rotations.

## RED commits

Engine, `b42ab5a7`. 5 of 9 failed; the 4 that passed are the engine 6 and scope regression guards:

```
     × panel-10 match 0: Tyrogue (236) is injured at 13' in slot 9 and Monferno (391) comes on 19ms
     × Monferno takes Hau'oli City's chances from 17' and Tyrogue none after the injury 3ms
     × panel-10 match 0: Hau'oli City rest Riolu (447) at 60' and Mankey (56) at 75' 6ms
     × each window records the Boss Club's rounded outfield energy, lifted by each rotation 6ms
     × golden panel runs 0 to 49: 71 opponent injuries, each replaced, and 425 rotations in 242 matches 215ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  5 failed | 4 passed (9)
```

GREEN `91e1a27d`.

UI and results, `5fbcff44`. 7 of 7 failed:

```
 FAIL  .../opponent-incidents.test.ts > ... > panel-10 match 0 lists the injury once, naming Monferno, and both rotations
TypeError: listedIncidents is not a function
 FAIL  .../opponent-incidents.test.ts > ... > a 0-0 with the opponent taking off its own 630 still names the user's keeper 630
AssertionError: expected 893 to be 630 // Object.is equality
 FAIL  .../opponent-injury.test.ts > ... > the 13' injury beat is Hau'oli City's slot 9 and reads 'Tyrogue is injured. Monferno comes on.'
AssertionError: expected { kind: 'injury', minute: 13, …(1) } to match object { kind: 'injury', minute: 13, …(2) }
 FAIL  .../opponent-injury.test.ts > ... > Tyrogue lies down in the opponent's slot 9 while the user's slot 9 plays on
AssertionError: expected { species: undefined, pose: undefined } to deeply equal { species: 236, pose: 'down' }
 FAIL  .../opponent-injury.test.ts > ... > the opponent's injury and its reserve have keys of their own
AssertionError: expected [ 'injury:13:9', 'sub:13:9:Monferno' ] to deeply equal [ 'injury:13:opp:9', …(1) ]
 FAIL  .../opponent-injury.test.ts > ... > the manager gets no injury stop for an opponent: half time is the only stop
AssertionError: expected [ 'injury:13:9', 'halftime' ] to deeply equal [ 'halftime' ]
 FAIL  .../opponent-injury.test.ts > ... > reads 'Hau'oli City rotate: Riolu rested.' at 60' and Mankey at 75'
AssertionError: expected [] to deeply equal [ …(2) ]
 Test Files  2 failed (2)
      Tests  7 failed (7)
```

GREEN `508e65e4`.

The e2e switch (carryover b), `cb7382cf`. 1 of 1 failed: the route saw only the `next start` path.

```
    Error: expect(received).toEqual(expected) // deep equality
      Array [
        "/_next/static/chunks/probe.js",
    -   "/_next/static/immutable/chunks/probe.js",
      ]
```

GREEN `df0e1e53` (glob `**/_next/static/**/chunks/**`). This is a local check: the spec serves a
probe script at each path and asserts the route sees both. The production run of
`penalty-takers.spec.ts` stays with the coordinator's live check.

Regression guards with no RED, because the behaviour was already correct (`e195329f` and the engine
file):

- Engine 6 output carries no opponent injury, opponent sub, rotation or `oppEnergy`: panel runs 0 to
  49 at the live coefficients give 241 matches and zeros.
- The rung scopes `0` to `7` of `opponent_roster` open on the same first draws. `inj:0:9` opens
  elsewhere (4125128776), and `buildLadder` under V7 equals live for panel runs 0 to 9.
- `token.test.ts`: live `takers.freeKickWeight` is 1 and `opponent.injuries` is false while
  `RUN_TOKEN_VERSION < 7` (carryover a). I checked both by mutating the live value. Each failed and
  passed again once restored.
- Rate parity self-test: with `opponent.injuries` true, `firstDivergence` finds 11 user-side and 23
  opponent-side divergences in the `rateInputs(8)` panel.

## Measurements

Kinds probe, `nice -n 10 pnpm exec tsx scripts/calibration/probe.mts --probe kinds --n 2000`.
Good bot, 4-3-3, draft seeds `probe-4-3-3-good-<i>`, i = 1..2000. Intervals are Wilson 95%.

| | Live (engine 6) | V7 |
| --- | --- | --- |
| sha256 | `7bef9749...` | `782d3031...` |
| wall | 13.0 s | 15.5 s |
| matches | 13,914 | 13,949 |
| user injuries | 3,041 (0.2186 per match) | 3,044 (0.2182 per match) |
| opponent injuries | 0 | 4,129 (0.2960 per match) |
| opponent injuries replaced | 0 | 4,129 (all) |
| matches with an opponent injury | 0 | 0.2551 [0.2479, 0.2624] (3,558) |
| rotation incidents per match | 0 | 1.5305 |
| user goals | 42,344 | 45,004 |
| opponent goals | 5,466 | 5,891 |
| penalty goals per match | 0.2036 | 0.2037 |

The live column reproduces the 6p baseline `docs/reports/engine-7/baseline-v6.json` exactly:
13,914 matches, 42,344 user goals, 5,466 opponent goals and 0.2036 penalty goals per match.

Opponent injuries per match are 0.296, which meets the brief's target of about 0.3. V7 here is the
whole candidate (6b1 to 6b4), so the goal deltas are not this row's alone. 6b3 recorded 45,008 user
goals and 2,843 penalty goals on the same probe; this row gives 45,004 and 2,842. Rotations average
1.53 per match, not 2, because a rotation fires only when an outfield player is below
`autoSubEnergy` 82.

Parity:

- `v6-parity.test.ts`: 50 runs byte for byte.
- `v6-parity.slow.test.ts` (`SLOW_TESTS=1`): 200 runs byte for byte.
- `rate-parity.test.ts`: 123 matches and 12,946 trials, each identical at the live coefficients,
  plus four mutation self-tests including the new one.
- `goldens.test.ts` has an empty diff against `origin/main` and passes.

Browser (`e2e/opponent-injuries.spec.ts`, Chromium, headless). The spec uses seed `e2e-opp-11`,
drafted as `draftSixteen` drafts it. Under the switch, match 0 is against Hau'oli City:

- At 25' the ticker reads "Tinkatink is injured. Tinkatuff comes on." and the opponent's slot 4 shows
  Tinkatink (0957) with `data-pose="down"`. No user player is down.
- At 60' and 75' the ticker reads "Hau'oli City rotate: Magnemite rested." and "Hau'oli City
  rotate: Shieldon rested."
- Both kinds carry a 3 px inline-start border whose computed colour equals `var(--bc-opp)`,
  rgb(96, 165, 250).
- The reserve's own sub line stays off the ticker.
- There is no side scroll.

Line boxes, as x from left to right:

| Width | x |
| --- | --- |
| 390 px | 44 to 346 |
| 360 px | 44 to 316 |
| 320 px | 44 to 276 |
| 308 px | 44 to 264 (measured only) |

The same seed at the live coefficients shows no injury or rotation line through 80'.

Screenshots are in `docs/reports/engine7-opponent-injuries/`, for 390, 360 and 320. The medic
banner reads "Tinkatink is down".

## Product decisions applied

- Hand-off 6b4 decides the following:
  - same draw and hazard as the user;
  - a reserve of the club's ladder quality on `opponent_roster` scope `inj:<match>:<slot>`;
  - `rotate` incidents;
  - `oppEnergy`;
  - the two ticker lines in the opponent's colour;
  - the down pose for either side.
- Copy is sentence case with no em or en dashes. The lines are "{name} is injured. {replacement}
  comes on." and "{opponent} rotate: {name} rested."

## Implementation decisions

- **`MatchInput.mode?`.** A reserve needs the themed pool, and the pool depends on the mode, which
  `MatchInput` did not carry. `cupMatch` now passes it. An exhibition has no mode, so its opponent
  is never injured. This mirrors the user's side, where an exhibition has no injuries. The rotate
  incident needs only the flag, so exhibitions log rotations. The field is optional, so engine 6
  inputs and bytes are unchanged.
- **The reserve rule (`bossReserve`).** It takes the club's themed pool minus every player used so
  far. It slides over that list the same 11-wide window `bossRoster` uses for this ladder step, so
  a reserve is about as strong as the club's own XI. It takes the three best fits for the injured
  slot's role, ordered by fit then id, and draws one on the new scope. It is one draw per
  injury on a scope nothing else reads, so no existing scope moves (guarded).
- **Subs cap.** A Boss Club sends on at most `maxSubs` reserves. After that, or with an empty pool,
  the slot stays vacant and `vacancies` rises, as on the user's side.
- **Keeper.** A keeper is injured only when a reserve exists, at half the outfield hazard. This is
  the user's rule with "a reserve exists" in place of "the bench can cover". The cover is looked
  up before the roll. That lookup is pure: same scope, no state change.
- **Hazard.** The user's inline hazard became a closure `hazard(canReplace)` with the same operation
  order, so engine 6 floats are unchanged (rate parity proves it).
- **Shims in the engine GREEN.** Widening `Incident` forced a few compile shims into `91e1a27d`
  ahead of the UI commits: the `rotate` copy type and text, the results `rotate` case and
  `MARK.rotate`. The UI RED `5fbcff44` then pinned the behaviour, and `508e65e4` finished it.
- **One ticker line per injury.** An opponent's reserve is named in the injury line ("... comes
  on."). Its `sub` beat stays off the ticker and out of the results list (`listedIncidents`), so
  the reserve is not shown as the user's assistant sub. The user's lines are unchanged.
- **The opponent's colour as a border.** The line gets a 3 px inline-start border in
  `--bc-opp`. The text colour stays the same, so contrast on both themes is unchanged.
- **`oppEnergy` is the outfield mean**, as `meanOutfieldEnergy` already defines it for the
  rotation. The keeper's energy does not move.
- **No stop for an opponent's injury.** The manager stop and `awaitingAnswer` stay user-only. The
  touchline's injury list skips the opponent's side. The match star's "left early" check counts
  only the user's subs.
- **Keys.** Opponent injury, sub and rotate beats get their own keys (`injury:<m>:opp:<slot>` and so
  on). They cannot collide with the user's, and the user's keys are unchanged.

## Brief vs code

- **The rotation codemap note holds.** The rotation at `match.ts:763` fires only when an outfield
  player is below `autoSubEnergy` (82). The `rotate` incident is pushed inside that branch, so it
  appears only when a rotation happens (1.53 per match).
- **The `side` key on the user's incidents.** The brief says to guard that no `side` key appears in
  engine 6 output. At the base, `injury` and `sub` already carried `side: "user"`
  (`origin/main:src/engine/types.ts:362` and `:369`). The guard instead checks for no `side: "opp"`
  injury or sub, no `rotate` and no `oppEnergy` key.
- **The user's injury rate.** The brief puts it at 0.3 per match. The same probe measures 0.2186
  live and 0.2182 under V7. The opponent rate is 0.296, which meets the stated target, but it is
  higher than the user's. I did not break down why (NOT RUN). The code is the same formula on both
  sides, so the difference comes from inputs: the Boss Club's STA, its press share and how often a
  user keeper has no cover.
- **The reserve's quality.** The opponent's chance rates read the fixed `opponent.lines`, not the
  players on the pitch. A reserve therefore changes who shoots (scorer weights) and the club's
  energy, not its line strength. The panel-10 test pins this: Monferno takes Hau'oli City's chances
  from 17' on.
- **Same glob issue in `data-split.spec.ts`.** It also routes a `next start`-only chunk path
  (`e2e/data-split.spec.ts:114`, `**/_next/static/chunks/**`).
  This row does not touch it; it is a carryover.

## NOT RUN

- GLM review and the independent Red reviewer (the coordinator's job).
- Hosted CI.
- The production run of `penalty-takers.spec.ts` with the widened glob. The glob is proved locally
  only.
- Full Playwright suite. Run instead on chromium: `opponent-injuries`, `v7-switch`,
  `penalty-takers`, `injury-staging`, `fatigue`, `watch-live`, `results-reveal`,
  `results-interactions`, `touchline-intel` and `your-calls`.
- Owner phone check and screen reader pass.
- A breakdown of the user's and opponent's injury rates.
- A probe with only this row's flag flipped. The CLI's `v7` loads the whole candidate.

## Carryovers

- `e2e/data-split.spec.ts` chunk route has the same production path gap the switch had.
- At the flip (6b9), the token version and `opponent.injuries` must move together. The guards in
  `token.test.ts` apply only while `RUN_TOKEN_VERSION < 7`, so they fail if the rule is switched on
  early and stop applying once the version is bumped.
