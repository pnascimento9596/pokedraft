# Unit flakes: announce-builder and run (side fix)

Tier Green. Branch `test/unit-flakes`, off `e449555`. Test only: `announce-builder.test.tsx` and
`run.test.tsx` changed, no product code. An out-of-band side fix, not a Wave 1 row.

## The two flakes and their causes

### `announce-builder.test.tsx` "Randomize says the Team Score the screen shows"

Hosted run 39073776203, attempt 1, `check` job, on `27659c6`:

```
 ❯ src/components/builder/__tests__/announce-builder.test.tsx (6 tests | 1 failed) 7519ms
     × Randomize says the Team Score the screen shows 1567ms
     ✓ Clear all says the slots are empty 1004ms
TestingLibraryElementError: Unable to find role="button" and name `/LCB Bulbasaur/`
      Tests  1 failed | 1340 passed (1341)
   Duration  140.01s (tests 69%, import 16%, environment 13%, transform 2%)
```

Each test opens the builder from a `?b=` link. `HomeScreen` loads the builder engine
(`@/components/builder/live`) with `import()` when it sees the link, decodes the squad, then draws
the pitch. The test waited for the `LCB Bulbasaur` slot with `findByRole` and its 1000 ms default.
That budget covers four things. The first is the lazy import. The first test in the file pays to
transform that module graph. The others are the decode, the render, and repeated `getByRole` polls,
each one an accessible-name walk over the whole page.

Measured under 36 CPU-burner processes on this 12-core machine, the time from render to the slot
being found with `getByRole` (6 runs):

| render in file | wait, ms                               |
| -------------- | -------------------------------------- |
| first (cold)   | 2097, 2463, 2660, 2569, 2275, 1916     |
| second         | 651, 349, 354, 507, 428, 573           |
| third          | 370, 516, 425, 353, 459, 297           |

In the cold case about 1.3 to 2.0 s goes to reaching the slot and 0.5 to 0.7 s to the first role
query. The same wait unloaded is about 0.3 to 0.5 s. The hosted job ran the suite in 140 s against
26 s locally, so it is loaded in this sense. `Builder.test.tsx` already waits for the same slot,
after the same lazy import, with `{ timeout: 10_000 }`. `announce-builder.test.tsx` missed that.

This is not the PR #78 cause. No fake timers are involved. The shared part is a lazily imported
module inside a fixed wait.

### `run.test.tsx` "saves a new unseeded run before its first pick and keeps its seed after reopening"

The test checked `localStorage` right after `start()` returned. `start()` returns once the round
header is in the DOM. `LiveRun` saves a new run in a `useEffect`, and React runs passive effects
in a scheduler task after the commit. `findBy` resolves from a MutationObserver callback, then
drains with a `setTimeout(0)`. Under load that timer can fire before the effect task, so the check
runs before the save. This mechanism comes from reading the React and Testing Library source. It
was not traced with instrumentation.

A probe test with the same setup started 40 runs per file and checked the save right after
`start()`. Run 5 times under 36 burners, the save was missing in 1 of 200 starts. Unloaded it was
missing in 0 of 40. The full-suite loops below never hit it.

This is not a product bug. React flushes pending passive effects before it handles the next
discrete event, so the run is saved before any pick. The other tests in that `describe` click a
candidate before they read storage, which flushes the effect.

## Fix

- `announce-builder.test.tsx`: `openWithTwoPlaced` is async. It waits once for the `LCB Bulbasaur`
  slot with `{ timeout: 10_000 }`, the budget `Builder.test.tsx` and `run.test.tsx` already use for
  this lazy load. The six tests drop their own default-timeout `findByRole`. 10 s is about 4 times
  the slowest measured cold wait (2.7 s).
- `run.test.tsx`: the save check is `await waitFor(() => expect(...).not.toBeNull())`.

No other test in `src/components` reads a passive-effect side effect right after a findBy on a lazy
load. `swap.test.tsx` already wraps its focus check in `waitFor`. The `Builder.test.tsx` storage
checks follow click handlers that write synchronously.

## Failure counts, verbatim summaries

### Before (`e449555`)

Full suite `pnpm test --maxWorkers=4`, unloaded, 6 runs. 0 failed. Two `src/__tmp` measurement
files sat in the tree during runs 2 to 6, which is why the counts read 1,333 and 1,334:

```
before run 1 exit 0 ::       Tests  1332 passed (1332) ::
before run 2 exit 0 ::       Tests  1333 passed (1333) ::
before run 3 exit 0 ::       Tests  1333 passed (1333) ::
before run 4 exit 0 ::       Tests  1334 passed (1334) ::
before run 5 exit 0 ::       Tests  1334 passed (1334) ::
before run 6 exit 0 ::       Tests  1334 passed (1334) ::
```

Full suite under 24 burners, 2 runs (124.74 s, close to the hosted 140 s). 0 failed:

```
loadedbefore run 1 exit 0 ::       Tests  1332 passed (1332) ::
loadedbefore run 2 exit 0 ::       Tests  1332 passed (1332) ::
```

The two files alone under 36 burners, 20 runs. `announce-builder` failed in 20 of 20 runs, always
"Randomize", plus "Clear all" in 7. `run.test.tsx` passed in all 20:

```
filebefore 1 exit 1 ::       Tests  2 failed | 34 passed (36) ::  FAIL  ...announce-builder.test.tsx > builder announcements > Clear all says the slots are empty| FAIL  ...Randomize says the Team Score the screen shows|
filebefore 3 exit 1 ::       Tests  1 failed | 35 passed (36) ::  FAIL  ...announce-builder.test.tsx > builder announcements > Randomize says the Team Score the screen shows|
(runs 2, 9, 11, 12, 16, 17: 2 failed; runs 4 to 8, 10, 13 to 15, 18 to 20: 1 failed)
TestingLibraryElementError: Unable to find role="button" and name `/LCB Bulbasaur/`
 ❯ src/components/builder/__tests__/announce-builder.test.tsx:88:18
```

### After (`598f824`)

The two files alone under 36 burners, 20 runs. All 20 passed:

```
fileafter 1 exit 0 ::       Tests  36 passed (36) ::
...
fileafter 20 exit 0 ::       Tests  36 passed (36) ::
```

Probe with the `waitFor` fix, 5 runs of 40 starts under 36 burners. 0 of 200 failed the save check.
Given a 1 in 200 rate before, that count alone proves little. The `waitFor` closes the race by
construction.

Full suite `pnpm test --maxWorkers=4`, unloaded, 8 runs. All passed, 25.9 to 26.7 s each:

```
after run 1 exit 0 ::       Tests  1332 passed (1332) ::
after run 2 exit 0 ::       Tests  1332 passed (1332) ::
after run 3 exit 0 ::       Tests  1332 passed (1332) ::
after run 4 exit 0 ::       Tests  1332 passed (1332) ::
after run 5 exit 0 ::       Tests  1332 passed (1332) ::
after run 6 exit 0 ::       Tests  1332 passed (1332) ::
after run 7 exit 0 ::       Tests  1332 passed (1332) ::
after run 8 exit 0 ::       Tests  1332 passed (1332) ::
```

Full suite under 24 burners, 2 runs (126.58 s and 126.18 s). All passed:

```
loadedafter run 1 exit 0 ::       Tests  1332 passed (1332) ::
loadedafter run 2 exit 0 ::       Tests  1332 passed (1332) ::
```

## Each test still catches its bug

Each mutation was applied to product code locally, run, and reverted with `git checkout`.

1. `Builder.tsx` announces `score + 1` on Randomize. "Randomize says the Team Score the screen
   shows" fails:

   ```
   AssertionError: expected 'Randomized. Team Score 491.' to be 'Randomized. Team Score 490.' // Object.is equality
         Tests  1 failed | 5 skipped (6)
   ```

2. `HomeScreen.tsx` ignores the `?b=` link, so the shared squad never loads. The new 10 s wait
   fails:

   ```
        × Randomize says the Team Score the screen shows 10060ms
   TestingLibraryElementError: Unable to find role="button" and name `/LCB Bulbasaur/`
         Tests  1 failed | 5 skipped (6)
   ```

3. `LiveRun.tsx` drops the new-run `saveRun` effect. "saves a new unseeded run before its first
   pick" fails:

   ```
        × saves a new unseeded run before its first pick and keeps its seed after reopening 1555ms
   AssertionError: expected null not to be null
    ❯ src/components/run/__tests__/run.test.tsx:387:80
         Tests  1 failed | 29 skipped (30)
   ```

## RED then GREEN

skip: no new guard test. These are timing fixes to existing tests. The RED evidence is the loaded
repro counts above, and the mutation runs show the tests still fail on their bugs.

## NOT RUN

- Hosted CI on this branch. Pushed but not opened as a PR, so no CI run exists yet.
- A hosted reproduction. The hosted runner was approximated with CPU burners locally.
- Playwright. No UI or product code changed.
- The GLM review (the coordinator runs it).
