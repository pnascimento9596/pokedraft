# Two-leg exhibitions and lifetime history

Dispatch: two-leg exhibitions and lifetime history. Branch `feat/two-leg-and-lifetime-history` off
`origin/main` at `6053928`. The owner fixed the product decisions; this log records how they were
built and the calls the dispatch left open.

## A. Two-leg exhibition

### Decision

The exhibition modal offers "One match" (the default) and "Two legs". Both are unranked and write
nothing to storage. The pure logic lives in `src/components/results/exhibition.ts`. The engine is
untouched. The module calls the same `simulateMatch`, `matchLines` and `rateTeam` exports the modal
already used.

| Piece | Scope (the seed string) | Phase |
| --- | --- | --- |
| One match | `[seed, own, other, rematch]`, unchanged | group |
| Leg 1 | `[seed, own, other, rematch, "two-legs", 1]` | group |
| Leg 2, first 90 minutes | `[seed, own, other, rematch, "two-legs", 2]` | group |
| Leg 2 tie-break, attempt k | `[seed, own, other, rematch, "two-legs", "tie-break", k]` | knockout |

- The tie is decided on aggregate. There is no away goals rule.
- `simulateMatch` plays extra time only when a knockout match is level after its own 90 minutes.
  A knockout leg 2 would therefore play extra time whenever leg 2 alone was drawn, even with the
  aggregate decided, and never when leg 2 was won but the aggregate was level. Both are wrong.
- So leg 2 is a group-phase match. When the aggregate is level after it, the tie-break walks
  attempts `k = 0, 1, 2, ...` and takes the first knockout simulation whose own 90 minutes ended
  level. Leg 2 then shows that match's goals after minute 90, its extra-time score and its
  shootout. Its first 90 minutes are discarded. The result is decided by that match's outcome.
- This is a rejection sample. Extra time is drawn from the engine's real knockout machinery,
  conditioned on a level 90 minutes. That is the only state in which the engine ever plays extra
  time. Measured with a throwaway Vitest probe over 2,000 ties each way, the widest mismatch tried
  (Team Score 820 against 174) needed a mean of 69.9 attempts and at most 656. The cap is 20,000
  attempts, an estimated 1.6 seconds of simulation (the probe ran about 280,000 simulations in
  about 23 seconds). Hitting it throws a
  `RangeError`. With a level 90 minutes at about 1 in 70, that has a probability near e^-285.
- Each leg reuses one `MatchReplay` component, which keeps the original pause, resume, full time
  and replay controls. Leg 2 replays to minute 120 when it went to extra time. The aggregate stays
  hidden until both legs are at full time, so a replay does not spoil the result. "Play rematch"
  and switching format reset both legs to full time.

### Evidence

- `exhibition.test.ts` pins the one-match result (0 - 2, goals at 75' and 83') and asserts it is
  byte-identical to `simulateMatch` on the seed the modal always used. The unchanged
  `ExhibitionMatchModal.test.tsx` cases still pass.
- Literal cases for one fixture: rematch 2 is decided on aggregate. Rematch 3 has a drawn leg 2
  (1 - 1) with no extra time because the aggregate is 1 - 2. Rematch 7 has leg 2 won 0 - 1 and a
  level aggregate, so it goes to penalties (4-5). Rematch 5 is settled in extra time (2 - 0, goals
  at 98' and 111'). Rematch 0 goes to penalties (6-7).
- `e2e/exhibition-two-legs.spec.ts` at 1280 and 360px: a mirror match (the shared run's own squad
  saved as the Builder squad) goes 0 - 3, 4 - 0 after extra time, aggregate 4 - 3, with the 118'
  goal listed. Leg 2's replay counts to 120'. History and lifetime storage are unchanged.

## B. Lifetime history

### Data shape

`src/ui/lifetime.ts` keeps one `LifetimeTotals` under `pokedraft:lifetime:v1`. It is never trimmed.

- `buckets`. One entry per stat bucket (8-0 Open, 8-0 Classic, 151, Friendly): runs, cups won,
  W, D, L, goals for and against, `goalRuns` (runs whose goals are known), best finish.
- `formations`. Ranked runs only, the same scope the career view always used.
- `counted`. Hashed run tokens (the first 64 bits of `cyrb128`, 16 hex characters), newest first,
  bounded to 1,000.
- `backfilledRuns`. Runs taken from the retained history when tracking started.

Run records now also store `goalsFor` and `goalsAgainst`, summed over played matches with extra
time and without shootout kicks. Older records do not have them, so the panel says
"Goals cover N of M runs" until every counted run has goals.

### Counting once

`recordCompletedRun` replaces the results view's call. It loads or backfills the totals, records
the run in the 50-run history and the per-mode bests as before, then adds the run only when its
hashed token is not in `counted`. A reload, a re-render or reopening a run that already fell out of
the history adds nothing. Without lifetime tracking, the retained history was the only dedupe, so
a run older than the last 50 would have counted again. A test covers that case. The bound means
only a run replayed after 1,000 newer runs could count twice.

### Backfill

The first time totals are needed and none are stored, they are built once from the retained
history and saved, with every history token marked counted. The panel says "Includes your last N
saved runs from before lifetime tracking." If the stored totals fail validation, they are rebuilt
the same way. That is honest about what is known, but it drops anything counted past the history.
The older `pokedraft:stats:v1` run counts are not used, because they carry no W-D-L or goals to
match.

### Backup and restore

`src/ui/backup.ts`. A backup is `{ format: "pokedraft-backup", schemaVersion: 1, exportedAt,
history, lifetime }`. Restore rejects, with a message and no writes: a file over 1 MB, invalid
JSON, a missing format marker, another schema version, and any field that fails the Zod schemas
(the message names the first bad path).

Merge rules:

1. History. Union by token, this browser's copy wins, newest first, trimmed to 50.
2. Runs the backup holds in full and this browser never counted are counted exactly.
3. Then each mode's figures take the larger of the two sides. Totals cannot reveal how much two
   sides overlap (the same browser backed up twice), so adding them could count a run twice. No
   side's count exceeds the true combined count, so the larger is a lower bound that never double
   counts and never lowers a figure. The best finish is the better of the two.
4. A formation keeps whichever side has more runs, whole, so its win rate is one side's real rate
   and never a blend.
5. Counted keys are unioned. Restoring the same file again changes nothing, and a test covers it.

The known cost is that two browsers with mostly different runs merge to the larger side, beyond
what rule 2 recovers from their retained histories.

### UI

The history page has a "Lifetime record" card above the run list. It shows runs completed, cups
won, W-D-L, goals, best finish per mode, and the Download and Restore buttons. The formation win
rate now reads lifetime totals, and its caption says so. The Career summary still describes stored
history only, with its existing copy. Both components read one shared external store
(`src/components/history/store.ts`), so a restore refreshes both.

## Gates

See STATE.md, "Two-leg exhibitions and lifetime history candidate", for exact commands, exit codes
and counts on the PR head.

## Principles

- Model the Domain. A `TwoLegTie` value (legs, leg 2 as shown, aggregate, `decidedBy`, winner)
  replaced format booleans in the modal. A `LifetimeTotals` record keyed by bucket replaced
  per-field storage.
- Make Operations Idempotent. Counting is keyed by hashed token. Backfill runs only when no totals
  are stored. Restore is max-based, so repeating it converges.
- Boundary Discipline. Zod parses storage and backup files at the boundary. The merge and fold
  functions are pure and trust their types.
- Test Behavior, Not Implementation. Tests assert literal scores, goal lines, messages and totals.
