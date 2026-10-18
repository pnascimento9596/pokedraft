# Test flakes and retained replays in CI

Tier Green. Branch `chore/test-flakes-retained-replays` off `bcf5493`. Wave 3 chore row. Only
tests, one build check script and the CI workflow changed. No product code, and nothing under
`src/engine`, `src/data` or `src/scouting`. `src/engine/__tests__/goldens.test.ts` is untouched.

Files:

- `src/components/matchday/__tests__/MatchPlayer.quick.test.tsx`
- `src/components/builder/__tests__/Builder.test.tsx`
- `scripts/build/check-retained-replays.mts`
- `.github/workflows/ci.yml`
- `e2e/fatigue.spec.ts`

## 1. `MatchPlayer.quick` "Quick shows no cut-in through the 30' goal"

### Hosted durations at `15 s`

The test stepped 16 ms frames from kickoff to 35', once in Quick and once in Live. Live alone is
about 1,380 frames. Durations from the `check` job logs (`gh run view --job <id> --log`):

| run | head | test | file |
| --- | --- | --- | --- |
| 39097585976 (push main, #89) | `ae8ee22` | timed out at 15,000 ms | 23,122 ms |
| 39098571030 (PR #92) | | 13,967 ms | 22,089 ms |
| 39102048235 (PR #93) | | 14,116 ms | 22,065 ms |
| 39100279135 (PR #92) | | 8,442 ms | 13,698 ms |
| 39103113124 (push main, #93) | | 8,958 ms | 14,440 ms |
| 39104967690 (PR #96) | | 7,657 ms | 11,952 ms |
| 39105613070 (push main, #96) | | 9,008 ms | 14,517 ms |
| 39106393864 (push main, #97) | | 9,248 ms | 14,568 ms |
| 39154593040 (PR #98) | | 9,432 ms | 15,145 ms |

The timeout, verbatim:

```
 ❯ src/components/matchday/__tests__/MatchPlayer.quick.test.tsx (4 tests | 1 failed) 23122ms
 FAIL  src/components/matchday/__tests__/MatchPlayer.quick.test.tsx > Quick view (catches a Quick sim that runs the broadcast: a phase sound and a move badge every 61 ms) > Quick shows no cut-in through the 30' goal, while Live shows the goal card
Error: Test timed out in 15000ms.
      Tests  1 failed | 1420 passed (1421)
```

### Fix

The goal beat fires at 30' (`fire` and `revealed` in `src/ui/matchday/player.ts`), and
`cutInAt` shows a goal card only for an active goal beat. No card can show before 30'. So:

1. One `act` advances `PACE[view].regulation * 29` ms of fake time while
   `requestAnimationFrame` fires every 100 ms. 100 ms is the largest `dt` the frame loop takes
   (`Math.min(100, t - last)` in `MatchPlayer.tsx`). The clock lands at 28' in both views; the
   test asserts that literal.
2. From 28' the test steps 16 ms frames as before and returns the minute the goal card first
   shows, or `null` if none shows by 35'.
3. It asserts `null` for Quick and `30` for Live. Before, it asserted 0 card frames in Quick and
   more than 0 in Live. The new Live assertion is a literal and also says when the card shows.

Live now stops stepping once the card shows, so the 2.6 s goal hold and the minutes after it
are no longer stepped frame by frame.

### Local durations (this machine, `-t "30' goal"`, alternating runs)

| run | before | after |
| --- | --- | --- |
| 1 | 1,310 ms | 291 ms |
| 2 | 1,345 ms | 296 ms |
| 3 | 1,379 ms | 297 ms |

In the full file the test takes about 210 ms (1,243 ms before). The hosted duration was not
measured; no CI run of this branch existed when this was written.

### The test still catches its bug

Each mutation was applied to `MatchPlayer.tsx`, run, and reverted with `git checkout`.

- `cutIns={view === "live"}` to `cutIns` (Quick shows cut-ins):
  `AssertionError: expected 31 to be null`, 1 failed.
- `cutIns={view === "live"}` to `cutIns={false}` (Live loses them):
  `AssertionError: expected null to be 30 // Object.is equality`, 1 failed.

## 2. `Builder.test.tsx` flake

Run 39080199806 (push main, `90aba39`, #79), `check` job, verbatim:

```
 FAIL  src/components/builder/__tests__/Builder.test.tsx > builder pitch token notes > show no rating on any token with Show ratings off
AssertionError: expected 'DF  LCB + Tap to Draft!' to be 'DF  LCB  Bulbasaur Grass Poison ' // Object.is equality
 ❯ src/components/builder/__tests__/Builder.test.tsx:275:64
      Tests  1 failed | 1342 passed (1343)
   Duration  134.42s (tests 69%, import 16%, environment 13%, transform 2%)
```

### Cause

The idle builder pitch renders `slot-s2` as an empty slot before `HomeScreen` has loaded
`@/components/builder/live` with `import()` and decoded the `?b=` squad. `findByTestId("slot-s2")`
therefore resolves on the first check, on the empty slot. The test read `textContent` after
Testing Library's `setTimeout(0)` drain. React updates the same button in place, so the test
passed whenever the lazy import and decode finished before that drain, and failed when they did
not. This is the #80 class: a lazily imported module inside a fixed wait.

### Fix (#80's pattern)

- The test waits for the decoded slot,
  `findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 })`, the wait every other
  `?b=` test in the file uses, then reads `slot-s2`, `slot-s9` and `slot-b0` with `getByTestId`.
- "keeps Builder actions above feedback that appears after the engine loads" waited for
  `Chemistry links (` with the 1 s default after the same lazy load. It gets the same 10 s budget.

No other `findBy` after a `HomeScreen` render in `src/components` uses the default timeout before
the engine loads. `Builder.test.tsx:643` waits for a fetch rejection after the engine loaded.

### Reproduction

Ten runs of the file alone under 36 CPU burners on this 12-core machine all passed
(`Tests  42 passed (42)` each), so load alone did not reproduce it here. A scratch probe did,
deterministically. It copied the test file and added a `vi.mock` of `@/components/builder/live`
whose factory waits before returning the real module, then ran one test with `-t`. The probe was
not committed. Output, verbatim:

```
== Before :: show no rating on any token with Show ratings off   (300 ms import)
     × show no rating on any token with Show ratings off 53ms
AssertionError: expected 'DF  LCB + Tap to Draft!' to be 'DF  LCB  Bulbasaur Grass Poison ' // Object.is equality
      Tests  1 failed | 41 skipped (42)
== After :: show no rating on any token with Show ratings off    (300 ms import)
      Tests  1 passed | 41 skipped (42)
== Before (1500 ms) :: keeps Builder actions above feedback
   × keeps Builder actions above feedback that appears after the engine loads 1091ms
TestingLibraryElementError: Unable to find an element with the text: /^Chemistry links \(/. ...
      Tests  1 failed | 41 skipped (42)
== After (1500 ms) :: keeps Builder actions above feedback
      Tests  1 passed | 41 skipped (42)
```

The "before" failure is the CI failure, byte for byte.

Mutation check. With `HomeScreen.tsx` ignoring the `?b=` link, the fixed test fails:
`× show no rating on any token with Show ratings off 10048ms`,
`Unable to find role="button" and name /LCB Bulbasaur/`. Reverted with `git checkout`.

## 3. `check-retained-replays.mts`: v1 to v6, in CI

### What was wrong

The script matched `retained-engine-bundle:v([1234])` and asserted exactly 4 bundles. The v5
bundle, which the build emits, was never replayed, and the script was not in CI.

### What it checks now

- The set of `retained-engine-bundle:vN` markers in the emitted server chunks equals
  `RETAINED_TOKEN_VERSIONS` (`src/engine/versions/label.ts`, today `[1, 2, 3, 4, 5]`).
- Every retained version and the live `RUN_TOKEN_VERSION` has at least one golden case.
- Each retained bundle replays its goldens to the pinned sha256: the old seven plus
  `GOLDEN_CUP8_V5` (`d3f3598c...`) and `GOLDEN_KANTO151_V5` (`d4d1db9b...`), the hashes
  `versions.test.ts` pins.
- v6: the engine-6 cup8 golden token, as `goldens.test.ts` builds it (its sha256 `91d7a44a...`
  is pinned there), replays through the emitted `replayAnyVersion` to `2b26ee82...`, the hash
  `goldens.test.ts` pins for the source engine.
- Every case also goes through the emitted `replayAnyVersion` and must route to its own bundle
  (`bundle` is `retained-engine-bundle:vN`) or, for the live version, to the live engine
  (`bundle` is `null`).

The v6 case was cheap. The minifier renames `replayAnyVersion` and its module id, so the script
finds it as the export whose source throws `unknown token version` inside a module group that
reads `.BUNDLE_MARKER`, and fails if it finds none. Loading the route group needs
`globalThis.AsyncLocalStorage`, which the script sets.

At the engine 7 freeze (Wave 6), v6 moves into `RETAINED_TOKEN_VERSIONS`. The v6 case then checks
the v6 bundle's raw replay against the same hash, unchanged, and the script fails until a live
v7 golden case is added. The hashes all cover `JSON.stringify({ draft, cup })`, which is what
`replay` returns, so the old seven hashes are unchanged.

### RED, then GREEN

There is no RED commit. The change is the check itself, and no committed state of this branch
fails it. The RED evidence is the check failing on a broken build. Each tamper edited the built
chunk in place under `.next/server/chunks`, and the chunk was restored from a copy afterwards
(`cmp` confirmed). The old script ran from a scratch copy of the `bcf5493` file.

RED 1. The emitted v5 bundle replays differently (`coreWeight:.8` to `.81` in
`src_engine_versions_v5_*.js`):

```
--- old script (v1 to v4)
7 emitted retained replays passed
exit=0
--- new script
PASS emitted retained v4 bundle golden replay 1da7e5609fcd0c0a8d6a32f9856c0b91f4a21a584dac19b119bbffc2656cf795
AssertionError [ERR_ASSERTION]: emitted retained v5 bundle golden replay changed
+ 'c855ad7c072116cb64a596779cfcd545cd26dc72999625ce97a5b6335a86fe8e'
- 'd3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a'
exit=1
```

RED 2. The v5 bundle is absent (its chunk removed):

```
--- old script (v1 to v4)
7 emitted retained replays passed
exit=0
--- new script
AssertionError [ERR_ASSERTION]: the emitted server build must hold exactly the retained bundles in RETAINED_TOKEN_VERSIONS
  actual: [ 1, 2, 3, 4 ],
  expected: [ 1, 2, 3, 4, 5 ],
exit=1
```

RED 3. The emitted live engine replays differently (`coreWeight:.8` to `.81` in
`src_0ncugkja8ekdh._.js`, the only non-bundle chunk that holds it):

```
AssertionError [ERR_ASSERTION]: emitted live engine, token v6 golden replay changed
+ '49da9cedb3c20ff59d3537861174410c90ce3dda9fbde7a3dba4a9940d93ea5f'
- '2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e05'
exit=1
```

RED 4. The script expects a wrong v5 hash (`d3f3598c...` edited to `00f3598c...`):

```
AssertionError [ERR_ASSERTION]: emitted retained v5 bundle golden replay changed
+ 'd3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a'
- '00f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a'
exit=1
```

A first v5 tamper (`floor:25` to `floor:26` in the attribute scale) did not change the v5
replay, and the new script passed on it. It was not used as RED evidence.

GREEN on the untouched build:

```
PASS emitted retained v5 bundle golden replay d3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a
PASS emitted retained v5 bundle golden replay d4d1db9bd84cbd39eae072a86791a76864a16f96db5844c5be67df7c1ab2a95a
PASS emitted live engine, token v6 golden replay 2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e05
10 emitted golden replays passed, 1 dispatcher(s)
```

### Runtime and CI

Three local runs after `pnpm build`: 0.65 s, 0.64 s and 0.64 s wall clock, under the 60 s
budget. The script runs in the `check` job right after `pnpm build`, as
`pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`. It needs no
environment variables; this worktree has no `.env` file.

## 4. `e2e/fatigue.spec.ts`: token from the live engine

The proof used a literal `pd6.` builder token. After an engine bump it would replay on the
retained v6 bundle and quietly stop testing the live engine. The spec now encodes the same squad
with `encodeToken` from `src/engine/token.ts` and `RUN_TOKEN_VERSION`: the eleven starters and
five bench species, seed `fatigue-1`, `builder` mode, 4-3-3, all nine generations, no
legendaries, and a `press` tactic at 0' in each of the six matches. Playwright already imports
from `src` (`e2e/images.spec.ts` imports `src/engine`), so this needed no setup.

On engine 6 the encoded token is byte-identical to the old literal (a scratch `tsx` comparison
printed `identical to the literal pd6 token`). The spec's expectations (116', slot 2 spent,
slot 10 tired, one stamina arc) stay literal. On engine 7 they fail loudly if the new engine
moves the energies, instead of passing on the frozen engine.

I kept the token in the spec rather than in `e2e/helpers.ts` or the `e2e/pins.ts` generator,
because the spec is its only user.

## Brief vs code

- The hand-off says the Quick test hit 15 s on #92. The only timeout found is run 39097585976,
  the push to main for #89 (`ae8ee22`). #92's first PR run took 13,967 ms, under the limit.
- The hand-off proposes "one large tick (dt jumps the clock)". The frame loop caps `dt` at
  100 ms (`MatchPlayer.tsx`, `Math.min(100, t - last)`), and the test cannot dispatch to the
  reducer. The nearest equivalent without product changes is 100 ms frames to 28'.
- The hand-off says "extend it to v5 and v6". v6 has no retained bundle, so v6 is covered
  through the emitted dispatcher and live engine, as the coordinator allowed.
- `measure-retained-json.mjs` was already in CI after `pnpm build`. The replay check now runs
  before it.

## Decisions

- Jump the clock in the test, not raise the timeout. The time went into frames, so fewer frames
  is the fix (Fix Root Causes).
- Probe the Builder race with a delayed `vi.mock` instead of only loaded loops. Load did not
  reproduce it locally, and the probe reproduced the exact CI message (Prove It Works).
- Derive the expected retained set from `RETAINED_TOKEN_VERSIONS` and require a case per
  version, so the engine 7 freeze cannot skip a version without failing CI (Encode Lessons in
  Structure). The hashes stay literal (Test Behavior, Not Implementation).
- Smallest diff for the fatigue token: build it in the spec, no new shared helper (Laziness
  Protocol).

## NOT RUN

- Hosted CI on this branch at the time of writing.
- The full unit suite under CPU load. Only `Builder.test.tsx` alone ran under load.
- Playwright beyond `e2e/fatigue.spec.ts`. No UI changed, so no browser proof or screenshots
  were added. The spec rewrote its two screenshots, which were reverted.
- The GLM review (the coordinator runs it).

## Carryovers

- W6b checklist: none from 2f; the fatigue token is generated now. At the engine 7 freeze, add a
  v7 golden case to `check-retained-replays.mts` (the script fails until one exists) and recheck
  `fatigue.spec.ts`'s 116' expectations on engine 7.
- The replay check finds `replayAnyVersion` by a string it throws. A Next or Turbopack upgrade
  that changes the chunk format fails the check loudly; it does not pass silently.
