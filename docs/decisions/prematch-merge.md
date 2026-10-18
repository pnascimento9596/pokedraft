# Pre-match merge (Wave 3, row 3f)

Tier Yellow. Branch `feat/prematch-merge` off `origin/main` at `bcf5493`. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the engine goldens are untouched.

## Scope

Re-verified at `bcf5493`:

- `stopsFor` (`src/ui/matchday/clock.ts:52`) built a `kickoff` stop at minute 0. `MatchPlayer`
  showed it as the "Pick a tactic, then kick off." dialog (`STOP_COPY.kickoff`), with the Touchline
  open below it. Its tactic pill went through `manager.decide(0, ...)`, which is `onDecide` in
  `MatchdayFlow`, which calls `decide(ctx, cup, actions, index, 0, d)`.
- `PreMatch` (`src/components/matchday/MatchdayFlow.tsx`) showed opponent, style, your shape, the
  absence line, your eleven and `BossRoster`, and a "Go to the match" button.
- `precheck` in `src/ui/manager/touchline.ts` refuses a tactic equal to the current one, and the
  side starts at `"balanced"` (`sideState`). Engine 6 `applyManager` sets `managed` for any action.

The change:

- `stopsFor` no longer builds a kickoff stop, and `StopKind` drops `"kickoff"`. Half time, extra
  time and injury stops are unchanged. `STOP_COPY.kickoff` is gone.
- `src/components/matchday/TacticPills.tsx` (new) is the five-pill group the Touchline had inline,
  with its CSS moved out of `Touchline.module.css` unchanged. The Touchline and `PreMatch` both
  render it. Test ids stay `tactic-<name>`.
- `PreMatch` takes `start`, the side's tactic at minute 0 from `touchlineAt(..., 0)` in manager
  mode and `undefined` in sim mode. In manager mode it shows the pills under the facts, labelled
  "Starting tactic". Sim mode shows none.
- The button reads "Kick off". It calls `onKickOff(tactic)` only with a tactic that differs from
  `start`; otherwise it passes `null` and `MatchdayFlow` records nothing. A changed tactic goes
  through the same `onDecide(0, { kind: "tactic", tactic })` the kickoff stop used. If `decide`
  refuses, the card stays with the reason in a `role="alert"` line; otherwise the match mounts and
  the clock runs at once (`running` already started true in manager mode).

## RED output (verbatim excerpt)

RED commit `995c229` (8 of 23 failed across 4 files):

```
     × stops at the injury at 45 before the half-time whistle and each later injury, never at 0' (catches the kickoff stop the pre-match tactic replaced) 3ms
     × finds the next unanswered stop 1ms
     × Kick off starts the clock with no stop at 0' (catches a managed match held at a kickoff stop) 3ms
     × Attack on PreMatch records { type: 'tactic', match: 0, minute: 0, tactic: 'attack' } 69ms
     × Balanced on PreMatch records no action and never calls decide 12ms
     × offers the five tactics in manager mode and labels the button Kick off 66ms
     × shows no tactic pills with manager mode off, and Kick off still records nothing 10ms
     × with manager on, pace is live regardless of saved matchView: 1600 ms reaches 2', not 32' 202ms
AssertionError: expected +0 to be 2 // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="tactic-attack"]
TestingLibraryElementError: Unable to find an element by: [data-testid="tactic-balanced"]
TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Starting tactic"
AssertionError: expected 'Go to the match' to be 'Kick off' // Object.is equality
AssertionError: expected [ 'kickoff', 'injury:45:4', …(2) ] to deeply equal [ 'injury:45:4', 'halftime', …(1) ]
AssertionError: expected 'kickoff' to be 'halftime' // Object.is equality
AssertionError: expected { key: 'kickoff', …(2) } to be null
 Test Files  4 failed (4)
      Tests  8 failed | 15 passed (23)
```

The guards:

- `src/ui/matchday/__tests__/player.test.ts`: one tick from `START` with `running: true` and the
  stops `stopsFor` builds leaves `stop === null`, `running === true` and the minute at
  `16 / PACE.live.regulation`.
- `src/ui/matchday/__tests__/clock.test.ts`: the stop keys are `injury:45:4`, `halftime`,
  `injury:70:6`, with no `kickoff`.
- `src/components/matchday/__tests__/MatchdayFlow.pace.test.tsx`: the managed match reaches 2'
  after 1600 ms with no `stop-go` click.
- `src/components/matchday/__tests__/MatchdayFlow.prematch.test.tsx` (new): Attack then Kick off
  reports exactly `[{ type: "tactic", match: 0, minute: 0, tactic: "attack" }]`. Attack, then
  Balanced, then Kick off reports `[]` and `decide` is called 0 times (a wrapping mock of
  `@/ui/manager/touchline` counts calls). The pills are the five `TACTICS` in order and the button
  reads "Kick off". Sim mode has no pills, and Kick off calls `decide` 0 times.

The sim-mode guard passed before the fix in part (no pills existed anywhere); it failed on the
button label. It stays as a guard that must stay green.

## Measurements

Pill boxes on the pre-match card in Playwright (chromium, `CI=1`), width x height in CSS px:

| Viewport | Balanced | Attack | Defend | Press  | Counter |
| -------- | -------- | ------ | ------ | ------ | ------- |
| 390x844  | 300x58   | 300x74 | 300x58 | 300x74 | 300x74  |
| 360x780  | 270x58   | 270x74 | 270x58 | 270x74 | 270x74  |
| 320x640  | 230x74   | 230x74 | 230x74 | 230x74 | 230x74  |

All five clear 44 px at every width, with no horizontal overflow. `quick-not-broadcast` logged a
managed match at 5' after 3 s of live pace with no stop to answer.

## Gates

At `eb2af7b`: lint, typecheck and build exited 0; all seven `check:*` scripts exited 0; 1,486 unit
tests passed in 172 files; Prettier passed on the touched files. Playwright (`CI=1`, fresh build):
`prematch-merge` plus `manager-mode` 19 passed; `builder-matchday`, `quick-not-broadcast`,
`mobile-pitch-fixes`, `injury-staging` and `watch-live` 10 passed; `mobile-targets` plus
`mobile-acceptance` 360 passed and 54 skipped by their own project gates.

## Product decisions applied

- Decision 1 (manager mode plays live) is unchanged; the pace guard still reads live pace.
- Decision 3 (blind challenges): the pills add no number. Nothing new appears with ratings off.
- Decision 4 (assistant after a decision): keeping Balanced records nothing, so the assistant stays
  on for the match. The hand-off measured a Balanced kickoff action at 0.8 to 5.3 win-rate points
  lost because it switches the assistant off.

## Implementation decisions

- PreMatch skips `decide` when the tactic equals `start`, not only when it is Balanced. For a fresh
  match `start` is Balanced, which is the case the row names. For a restored match whose token
  already has a 0' tactic, `start` is that tactic, so kicking off again records nothing twice. The
  guard counts `decide` calls instead of relying on `precheck`'s refusal.
- One shared `TacticPills` with a `label` prop, not a fork. The Touchline keeps its own "skip the
  current tactic" check in its `onPick`; PreMatch only selects. The Touchline renders the same
  markup and classes, so its layout does not change.
- `prematch-go` keeps its test id. Every spec that opens a match clicks it.
- The "matchday live touchline" mobile scene used the kickoff stop to hold the touchline still. It
  now waits for the clock to pass 0', pauses with `play-toggle`, and names `play-toggle` (Resume) as
  its primary action.
- `mobile-pitch-fixes` checked all 22 sprites at the kickoff stop. It now pauses straight after Kick
  off and checks the 22 sprites and that the clock is at 2' or earlier. It logged 0' and 22 of 22.
  The screenshot keeps its old file name (`390-kickoff-stop.png`) so no other report links break.

## Brief vs code

- The brief says PreMatch shows "style, weakest line and key player". At `bcf5493` it shows
  opponent, style, your shape, the absence line, both elevens and `BossRoster`. Nothing computes a
  weakest line or a key player. This row does not invent them; the pills sit next to the facts
  that exist. Carryover to Wave 4 (pre-match).
- The brief says opponent style and Team Score "stay in the match header". At `bcf5493` the match
  header (`MatchdayFlow` `header`) shows "Match n" with "Manager mode", and the round and opponent
  name. The scoreboard shows "Your XI", the clock, the score and the opponent name. The HUD shows
  each side's current tactic, which is not the opponent's style. Opponent style shows only on the
  pre-match card, and it still does. Team Score shows nowhere in the matchday. This row adds
  neither: a Team Score in the header would be a new number that must hide with ratings off
  (decision 3), and no row asks for it. Recorded for Wave 4.
- The hand-off's guard wording "state after first tick: `stop === null`, `running === true`"
  matches the real `PlayState` fields in `src/ui/matchday/player.ts`.
- `applyManager` is at `src/engine/match.ts:560` as the hand-off says. Its first statement,
  `managed = true` at :561, runs before the `a.tactic !== user.tactic` check, so a Balanced action
  at 0' would switch the assistant off even though it changes nothing on the pitch.

## NOT RUN

- Physical phone check (owner action).
- Review, hosted CI and the full e2e suite at the time of writing.

## Risks and carryovers

- The pills stack in one column at phone widths (the shared grid needs 150 px per column), so the
  five take about 340 px of height on the pre-match card. The touchline has the same layout today.
  Row 3a redesigns the collapsed pills for phones; this row does not fork them.

- Weakest line and key player on the pre-match card (Wave 4, pre-match).
- Team Score in the match header, hidden with ratings off, if the owner wants it (Wave 4).
