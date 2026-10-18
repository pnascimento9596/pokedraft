# Injury staging (Wave 1, row 1d)

Tier Yellow. Branch `fix/injury-staging`, built on row 1c (`fix/score-lands-with-ball`, head
`7162ad2`). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine goldens
are untouched.

## Scope

The bug, re-verified at `7162ad2` on match 5 (the quarter-final) of the golden cup8 replay under
engine 6. Roselia (315) is injured in slot 1 at 42' and the assistant brings on Kommo-o (784).

- `buildTimeline` logs the injury and its replacement at the same minute, and `xiAt` already puts
  Kommo-o in slot 1 at 42'.
- The player fires both beats in the same frame. `activeBeat` keeps the later of two beats that
  fired together, so the sub beat won and the injury beat was never staged. Kommo-o walked on at
  once and Roselia never lay down.
- In manager mode the injury stop opens at 42' with both beats already fired. Kommo-o walked on
  and then stood in the slot for the whole stop, which gave away the assistant's pick while the
  prompt asked for a replacement.

The fix:

- `stagePitch` puts the injured species in its slot, in the `down` pose, while the injury beat is
  on the pitch. Reduced motion gets the same pose on the still pitch.
- `activeBeat` moves from `Broadcast.tsx` to `player.ts`, next to `beatKey` and `landed`, and
  takes the clock. An injury's replacement starts on the pitch only once the injury staging
  (`SHOW.injury`, 1800 ms) has run. An injury stays on the pitch while the clock waits at its
  minute and the replacement has not fired.
- `fire` holds back an injury's replacement until the manager answers that injury's stop. On the
  answer the replacement fires and walks on from the touchline. The sub sound moves with it.

## Discrepancy with the audit

Audit A measured "Kommo-o is drawn with `pose=down`". That holds for `stagePitch` called with the
injury beat active. Through the real player at `7162ad2` the injury beat never became active, so
the screen showed Kommo-o walking on (`pose` `sprint`) rather than lying down. Both are the same
root cause, and the guard checks what the screen draws.

## RED output (commit `519cd93`, verbatim excerpts)

```
     × manager stop at 42': Roselia, not Kommo-o, lies down in slot 1 and Kommo-o is nowhere on the pitch 40ms
     × manager stop at 42': Kommo-o walks on only once the stop is answered 18ms
     × watched without stops: Roselia lies down at 42', then Kommo-o walks on at the sub beat 11ms
AssertionError: expected { pose: 'sprint', species: '0784' } to deeply equal { pose: 'down', species: '0315' }
TestingLibraryElementError: Unable to find an element by: [data-testid="sub-board"]
AssertionError: expected { pose: 'sprint', species: '0784' } to deeply equal { pose: 'down', species: '0315' }
      Tests  3 failed (3)
```

## Measurements

- Browser, live replay of the golden quarter-final at 390x844 on the fix build (`3130f82`). Slot 1
  while the medic banner showed: `[{"banner":"medic","slot":"0315","pose":"down","kommo":false}]`.
  Every frame with the sub board showed Kommo-o (0784) in slot 1, and the sub board came after the
  medic banner.
- Screenshots: `docs/reports/injury-staging/390-roselia-down.png` (42', "Roselia is down") and
  `390-kommo-o-walks-on.png` (44', "On: Kommo-o, Off: Roselia").

## Product decisions applied

None of section 2 applies. The row is display only.

## NOT RUN

- The browser spec on the RED build. The RED proof is the unit guard above.
- A browser run of the manager-mode injury stop. Manager e2e drafts are random, so no injury is
  pinned. The stop case is covered by the reducer-driven unit tests.
- Hosted CI, the GLM review and a physical phone check.

## Carryover

- The ticker still lists "Kommo-o on for Roselia" during the manager injury stop, because the feed
  reads `revealed` by the clock, not the fired beats. The injury prompt preselects the same pick,
  so the row's "on the pitch" scope is met, but the ticker could follow the pitch in a later row.
