# Wave 6 summary (Green)

## Scope

Close Wave 6: the program-log entry, the owner phone and screen reader checklist, and the owner
items that are still open. No product code changes.

## Files

- `docs/reports/audits-2026-10-17/program-log.md`: the Wave 6 entry (PR table, order and why, the
  flip, the engine 7 calibration table, hosted and production failures, review lessons,
  measurements that moved, open carryovers).
- `STATE.md`: the PR #156 merged paragraph and this section.

## Owner phone check (NOT RUN; owner action)

One consolidated session on iPhone Safari and one Android phone, against production. Use the
Wave 5 list in `docs/decisions/wave5-summary.md` (10 items), plus:

1. A Live match shows the "Chances (xG)" river filling as the match goes, and the stronger side
   holds the ball more.
2. A ticker line like "Late drama at 87'" or "Against the run of play" appears only when it is
   true.
3. In manager mode, after you make a sub, the Touchline says "Assistant: subs off, tactics on", and
   the assistant still changes tactic late in the match.
4. No stop at 65' any more; the half-time fatigue line is still there.
5. "Set pieces" on the pre-match screen lets you pick a penalty and free-kick taker; a penalty can
   now be missed.
6. Opponents can get injured; the ticker says who came on.
7. An old link (any run from before 2026-10-21) still opens and shows its old result.
8. The leaderboard's default board says "No runs on this engine yet" until someone plays, and "All
   engines" shows the older runs labelled "Engine v6" and "Engine v3".
9. The dossier shows "Abilities +n" and "Moves +n" under attribute bars.

## Screen reader pass (NOT RUN; owner action)

VoiceOver is enough. The Wave 5 list, plus the xG river's label, the four assistant status lines,
the set-piece selects and the empty-board button.

## Owner items still open

1. **Turn the passcode gate on, now that this PR has merged.** Set `FRIENDS_PASSCODE` in Vercel
   Production yourself (you choose the passcode; the agent never sees it), then redeploy. With the
   gate off, anyone who finds the URL can put names on the friends' board, and engine 7 started a
   fresh default board. Link previews, the gate page, the manifest and icons, CSP reports and
   `/api/health` stay public (`src/passcode.ts`). Afterwards, write the cookie digest to a 0600
   file for the Wave 7 live checks.
2. **Delete the two Wave 5 restore points** (`br-snowy-surf-b7yk5m7w`, `br-noisy-bread-b7gzc2s4`):
   the agent asks for a one-word yes.
3. **Calibration findings** (program log, open carryovers): P1 good, P7, P8 and the open-play
   goal-kind share. Each fix is an engine change for a later wave.
4. **Credential rotation and the WAF rule** stay in Wave 7 as decided in Wave 5.

## Decisions

- 6b7 was dropped by measurement: 6p's decision 10 prototype failed P9.
- The 6b9 landing window was waived by the owner, and `GRACE` moved one day to match the actual
  landing date.
- From 6b8 on, the Red reviewer was a Gemini 4 Argon (High) lane, by the owner's decision to save
  Claude usage. The lanes reported false content often enough that the coordinator re-ran every
  gate and verified every cited number and symbol before each merge.
- The summary was written by the coordinator, not a lane, for the same reason.

## NOT RUN

- The phone check, the screen reader pass and the owner items above.
- The grace-window receipt: the window closes at `2026-10-23T04:00:00Z`.
- Unit tests and the e2e suite on this branch: nothing under `src/` or `e2e/` changed. CI runs them.
