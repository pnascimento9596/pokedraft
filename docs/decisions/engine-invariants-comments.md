# Engine comments and invariants

Section A of the hand-off `pokedraft-next-dispatch.md` (2026-10-16), copied verbatim.

## A. Engine comments and invariants (GLM review notes on #61)

1. **Clean-sheet eligibility rule.** `src/engine/cup.ts:248` uses
   `played * 2 >= REGULATION_MINUTES`, so 45 minutes of a 120-minute match qualifies as "at least
   half" (half of regulation, not of the match). Implementation and the independent recompute in
   the tests agree. Add a comment stating the intended rule. If the intended rule is actually "half
   of the minutes played in that match", that is a behaviour change: Red tier, goldens move.
2. **Ghost starters after a red card.** `refreshUserLines` (`src/engine/match.ts:522`) re-inserts
   the original starter's species into a slot emptied by a red card, so `rateTeam` briefly rates a
   player who is not on the pitch until the vacancy multipliers correct it. Either document that the
   vacancy constants intentionally do this double duty, or rate empty slots as empty (behaviour
   change, recalibrate with `scripts/calibration/engine6-compare.mts`, update goldens).
3. **Why the auto coach steps back.** In `boundary()` (`src/engine/match.ts:603`, the
   `autoSubMinutes` checks at 611 and 628), once the manager makes any decision in a match the auto
   coach stops for the user side in that match, including fatigue subs. This is pinned by
   `src/engine/__tests__/manager.test.ts` ("a manager tactic hands over the touchline"). Add a one-line
   comment so nobody "fixes" it.
4. **Pre-match absences invariant.** `match.absences` holds at most one entry by construction
   (`src/engine/cup.ts` builds `absence === null ? [] : [absence]`), and the UI relies on it:
   `src/ui/manager/touchline.ts:44` and `src/components/matchday/MatchdayFlow.tsx:149` read only
   `absences[0]`. Add a test in the engine suite that pins "at most one absence per match" across
   many seeds, and a comment at both UI sites pointing to it.

## Decisions

The coordinator fixed all four calls before implementation. Each keeps behaviour unchanged, so no
golden moved. Tier is Green for the comments. The one new test adds an assertion but changes no
behaviour.

1. **Clean sheet.** Keep "half of regulation" (45 minutes), even in a 120-minute match. The comment
   at the `played * 2 >= REGULATION_MINUTES` check in `src/engine/cup.ts` (now lines 246 and 247)
   states the rule and the reason. Extra time never raises the bar for a defender or keeper who held
   the shutout.
2. **Ghost starters after a red card.** Keep. The comment above `refreshUserLines` in
   `src/engine/match.ts` says that the emptied slot falls back to the original starter for
   `rateTeam`, and that the vacancy multipliers in `rate()` are calibrated to correct for that as
   well. No recalibration ran because nothing changed.
3. **Auto coach steps back.** A two-line comment above `if (!managed)` in `boundary()` says that any
   manager decision switches the auto coach off for the user side, fatigue subs included. It names
   the pinning case in `src/engine/__tests__/manager.test.ts`. The hand-off quoted that case as "a
   manager tactic hands over the touchline". The real title is "hands the touchline to the manager:
   no auto tactic for the user once they decide", and the comment uses the real title.
4. **One absence per match.** A new case in `src/engine/__tests__/cup.test.ts`, inside the
   `runCup` describe, is titled "records at most one pre-match absence per match (catches a second
   absence the UI would drop)". It reuses the 400 cups the file already builds through the public
   `runCup` (200 seeds each for the KANTO and MIDDLING squads), so it adds no simulation time. It
   asserts that the largest `absences.length` over every played match is exactly `1`. That one
   literal covers both halves of the brief. No match has two, and at least one match has one, so
   the test cannot pass vacuously. One-line comments at `fieldedFor` in
   `src/ui/manager/touchline.ts` and at the `absences[0]` read in `PreMatch` in
   `src/components/matchday/MatchdayFlow.tsx` point to it.

The new test pins an invariant that already holds, so there is no RED commit. To show it catches
the bug it names, `src/engine/cup.ts` was mutated locally to emit `[absence, absence]`. The case
then failed with `AssertionError: expected 2 to be 1`, and the mutation was reverted before any
commit.

## Evidence

Commands ran in the dispatch worktree on branch `chore/engine-invariants-comments`, cut from
`origin/main` at `648cf2f`. Final counts are in the PR body and `STATE.md`.

- `pnpm vitest run src/engine`. 23 files and 273 tests passed.
- `pnpm vitest run src/engine/__tests__/goldens.test.ts`. 7 of 7 passed. The goldens file is
  unchanged.
- `bash scripts/engine/check-bundle-provenance.sh v5 6053928`. Exit 0 with "provenance ok: 34
  files in src/engine/versions/v5 match 6053928; only @/ import lines differ". No file under
  `src/engine/versions` changed.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. The first run failed in `pnpm test`
  with 1 of 1284 tests failing (138 of 139 files passed). The failing case was
  `src/components/builder/__tests__/announce-builder.test.tsx` "Randomize says the Team Score the
  screen shows", which could not find the `LCB Bulbasaur` button. This PR touches neither that file
  nor anything it renders. Run alone, the file passed 6 of 6. The full chain was then rerun and
  exited 0, with lint and typecheck clean, 139 files and 1284 of 1284 tests passing, and
  `next build` compiling. It is recorded as an unrelated flake that did not reproduce.
- `pnpm format:check`. Exit 0.

NOT RUN.

- Playwright. Nothing at runtime changed (comments and one engine unit test), so browser behaviour
  cannot differ.
- `scripts/calibration/engine6-compare.mts`. No engine behaviour changed.
- `pnpm check:mirrors`. `CLAUDE.md`, `AGENTS.md` and the skill are untouched.
