# Matchday robustness (dispatch B)

The hand-off section this dispatch implements, verbatim:

## B. Matchday robustness (GLM notes on #62 plus my own)

5. **Decision cost runs on the main thread.** Each touchline decision calls
   `runCup(...)` synchronously (`src/ui/manager/touchline.ts:265`). It was measured at about 174 ms
   in node by the implementer, and that number has not been independently verified. Measure it in a
   real browser on a mid-range phone profile, first. If it is noticeable, either move the replay to
   a Web Worker or reuse the already-played prefix. The engine guarantees a decision at minute m
   changes nothing at or before m, so earlier matches can be reused instead of replayed.
6. **Reload during the matchday loses decisions.** A reload returns to the finished draft and the
   manager list is gone; results save only when the cup finishes. Persist the in-progress manager
   list in the run snapshot (the same per-tab and durable checkpoint the draft uses) and restore the
   matchday at the right match. Needs a RED test in the savedRun suite.
7. **No "Watch live" replay from results.** The results page has no way to replay a finished cup in
   the broadcast, so the goals-only fallback for retained runs is unit-tested but unreachable in the
   UI. Add "Watch live" per match on results (lazy-load like the matchday broadcast) and a browser
   test that reaches the goals-only fallback with a pd5 link.
8. **Cross-tab settings.** `subscribe` in `src/components/matchday/MatchdaySettings.tsx:16` is a
   no-op, so changing the panel in another tab does not update an open start screen until reload.
   Add a `storage` event listener, or document the per-tab authority as intended.
9. **Two copies of the incident copy.** `beatLine` (`src/ui/matchday/copy.ts:24`) and
   `incidentLine` (`src/components/results/format.ts:114`) render the same events separately. Both
   are pinned by tests but can drift. Extract one shared formatter. Also make an opponent tactic at
   minute 0 render sensibly (today it would read "0' Opp switch to X" if the engine ever emitted it).
10. **Evidence gaps to close while touching these files.** The savedRun RED at `385bc84` has no
    captured failing log in any review packet, and the 174 ms figure is implementer-reported. When
    you add new REDs, capture the failing output into the PR body or evidence file, itemized per
    test.

## Outcome

Items 5 to 10 are done on branch `feat/matchday-robustness` off `648cf2f`. No file under `src/engine` changed.

- Item 5. A touchline decision costs a median 27.7 ms on the main thread at a 4x CPU throttle in Chromium, well under the 100 ms bar. Nothing changed: no Web Worker, no prefix reuse.
- Item 6. The run snapshot now holds the matchday. A reload comes back at the same match with every decision kept.
- Item 7. Each played match on the results page has Watch live, which lazy-loads the Live match broadcast for that match. A pd5 link reaches the goals-only fallback in the browser.
- Item 8. The start screen's matchday settings follow a change made in another tab.
- Item 9. One formatter, `incidentText` in `src/ui/matchday/copy.ts`, writes the incident copy for both the ticker and the results. An opponent tactic at minute 0 reads "Kick off: Opp play Counter".
- Item 10. Every new RED's failing output is below, itemized per test.

## Decisions

### Item 5: measure first, then change nothing

The coordinator's rule was to act only if the median exceeded 100 ms under a 4x throttle. It is 27.7 ms, and the slowest cold first decision seen was 42.4 ms. `src/ui/manager/touchline.ts` is unchanged. Prefix reuse would not have helped the worst case anyway: a decision in the first match still replays every later match, because the decision changes everything after it.

The 174 ms figure from the last dispatch does not reproduce as a steady-state cost. In node through `tsx` on the same run token, the first two `runCup` calls took 96.4 and 122.5 ms and the warm median was 22.0 ms. My inference is that the 174 ms was a cold, unoptimized first call. That is a guess about a measurement I did not see.

### Item 6: what the snapshot holds and where a reload lands

The snapshot gains a third screen. Its shape is `{ screen: "matchday", token, daily, matchday: { match, view, managerMode } }`. The token is the draft token with the decisions so far in its `manager` list, so the restore path reuses the coached-token checks that already exist (`rebuild` proves the draft part, then `replay` runs every decision through the engine). The view and manager mode are stored rather than read from the panel at reload, so a reload never switches a coached matchday into a different mode.

LiveRun saves it on entry to the matchday, on every accepted decision and on every Next match. A reload reopens the pre-match screen of the saved match. Decisions already taken in that match stay, so the touchline refuses a decision before the last one with the existing "That moment has already been played." copy. That is the engine's ordering rule, not a new one.

This adds no new way to retry a match. Before this change a reload returned to the finished draft, and the same seed replayed the whole cup from scratch.

A matchday restores from the durable checkpoint like a draft does, because it is a run still in progress. The unseeded-challenge rule that blocks restoring finished results from durable storage alone still applies only to results. `DailyScreen`'s light peek schema now accepts the `matchday` screen, so a Daily matchday restores on its own formation.

### Item 7: where Watch live opens

Each played match card has a Watch live button. It opens one replay panel above the highlights, scrolls to it and focuses its heading. Only one match plays at a time. The panel is `src/components/results/MatchReplay.tsx`, loaded with `next/dynamic` and `ssr: false` from `ResultsView`, which also pulls in `MatchPlayer` and the broadcast. It plays the match in the Live view with the cup's seed, so the choreography matches what the matchday showed. It plays without the touchline: a finished run is not coached again.

Measured in Chromium on a pd5 results page: 18 scripts loaded before the click and none contained the broadcast's goals-only copy. After the click, 21 scripts had loaded and 1 contained it.

### Item 8: storage events, and a local choice that gives way

`subscribe` now listens for `storage` events. The old `local` state also had to change. Once a player tapped a setting on the screen, that local value overrode the store for good, so a later change in another tab would still not show. The local value now records the stored panel it was made over and holds only while that is still the stored panel. It still covers blocked storage, where the store never changes.

### Item 9: one formatter, and the kickoff copy

`incidentText` takes an `IncidentCopy` whose players are already named. The broadcast beats for cards, injuries, substitutions and tactics already have that shape, so `beatLine` passes them straight through. `incidentLine` maps an engine `Incident` onto it. `TACTIC_LABEL` moved with it into `copy.ts`; `Broadcast.tsx` and `Touchline.tsx` import it from there.

One difference between the two surfaces is kept on purpose. The ticker names the team on every card, because both sides scroll past together. The results list names only the opponent, as its tests pin. `CardTeams.user` is `null` for the results.

The opponent kickoff copy is "Kick off: Opp play Counter". It mirrors the user's existing "Kick off: you play Press", and it has no em dash.

## Measurements (item 5)

Setup:

- Build: `pnpm build` of `origin/main` at `648cf2f`, served with `next start --port 3482`.
- Browser: Playwright Chromium. CDP `Emulation.setCPUThrottlingRate` at 4 is the mid-range phone profile. Rate 1 is the unthrottled host.
- Page: `/play` cup8 4-3-3 with seed `e2e-coach`, drafted with the first candidate into the first open slot, manager mode on, quick view, reduced motion. Viewport 412 by 915.
- Host: a 12-core Mac. Load average was 12 to 28 during the runs because other lanes were building, so expect noise.
- Script: `bench/decision-bench.mjs` in the session scratchpad.

The timed work is one tactic tap at the kickoff stop. The script calls `element.click()` inside the page and times it with `performance.now()`. React handles a click as a discrete event and finishes the update before `click()` returns, so the sync time covers the handler, the `runCup` replay and the React render: the block the player feels. The paint time adds one frame. The control taps the tactic already in play, which the touchline ignores, so it times a click with no work.

To show the work happened: after every timed tap, the tapped tactic was `aria-pressed="true"`, and that value comes from the replayed cup's incidents (0 of 15 not applied in each run). No refusal alert showed.

| Profile | Match index | Samples | Decision sync median (min to max) | p90 | Click to next frame median (min to max) | No-op sync median |
| --- | --- | --- | --- | --- | --- | --- |
| 4x | 0 | 15 after 3 warmup | 27.7 ms (24.3 to 33.6) | 30.4 | 35.8 ms (33.2 to 44.3) | 0.1 ms |
| 4x | 5 | 15 after 3 warmup | 27.0 ms (24.6 to 31.8) | 31.1 | 34.9 ms (33.2 to 51.1) | 0.1 ms |
| 1x | 0 | 15 after 3 warmup | 5.7 ms (5.0 to 9.6) | 6.4 | 14.6 ms (9.6 to 16.1) | 0.0 ms |

Cold decisions use 5 fresh browser sessions at 4x with no warmup. The first three decisions of each session took:

- 33.3, 30.0 and 31.6 ms
- 29.0, 29.9 and 27.7 ms
- 42.4, 38.8 and 38.6 ms
- 34.8, 35.6 and 30.6 ms
- 34.5, 26.8 and 31.1 ms

The medians over all 10 decisions per session were 28.9, 27.8, 28.6, 29.2 and 29.5 ms. The worst single decision was 42.4 ms.

The limiter is the engine. A separate CPU profile (not used for the numbers above) covered 12 decisions at 4x. It put 225 ms of self time in the largest client chunk (837 KB), which is about 19 ms per decision. I take that chunk to hold the engine and the species data from its size. The build is minified, so the profile cannot name the functions. React's chunk took 35 ms and a 27 KB app chunk took 94 ms. Idle time and `(program)` made up the rest.

Node through `tsx`, unthrottled, on the same run token, 40 calls of `runCup` with one kickoff tactic:

- First call 96.4 ms, second 122.5 ms.
- Warm median 22.0 ms, range 5.8 to 183.9 ms under the same host load.

Limits of this measurement:

- CDP throttling slows the host CPU by a factor. It is not a phone's memory, thermal or GC behaviour.
- A physical phone was NOT RUN.
- WebKit and Firefox were NOT RUN.

## Evidence

### RED commits

| Item | Commit | Tests that failed before the fix |
| --- | --- | --- |
| 6 | `223d3f6` | 1 (savedRun) |
| 9 | `b17be61` | 2 (format, timeline) |
| 8 | `f8383bb` | 2 (MatchdaySettings) |
| 7 | `08897fb` | 3 (Playwright, watch-live) |

Each fix commit follows its RED. The item 6 RED calls a `saveRun` form that did not exist yet, so `pnpm typecheck` is expected to fail on `223d3f6`. Typecheck on the RED commits was NOT RUN.

### Item 6 RED, `pnpm vitest run src/components/run/__tests__/savedRun.test.ts` at `223d3f6`

16 tests ran, 1 failed and 15 passed.

Test: "coached runs > restores an in-progress matchday at the match it was on, with the decisions taken so far".

```
AssertionError: expected undefined to be 'matchday' // Object.is equality
- Expected:
"matchday"
+ Received:
undefined
 ❯ src/components/run/__tests__/savedRun.test.ts:190:28
    189|     const restored = restoreRun(slot);
    190|     expect(restored?.kind).toBe("matchday");
```

The sibling test "refuses a matchday checkpoint that points past the matches the cup played" passed before and after. Before the fix it passed because no matchday snapshot parsed at all, so it is a behaviour pin and not a RED.

### Item 9 RED, `pnpm vitest run src/components/results/__tests__/format.test.ts src/ui/matchday/__tests__/timeline.test.ts` at `b17be61`

28 tests ran, 2 failed and 26 passed.

Test 1: "incidentLine > writes an opponent tactic at kickoff as the shape they start in, not a 0' switch".

```
AssertionError: expected '0\' Opp switch to Counter' to be 'Kick off: Opp play Counter' // Object.is equality
Expected: "Kick off: Opp play Counter"
Received: "0' Opp switch to Counter"
 ❯ src/components/results/__tests__/format.test.ts:293:7
```

Test 2: "beatLine > writes an opponent tactic at kickoff as the shape they start in, not a 0' switch".

```
AssertionError: expected '0\' Opp switch to Counter' to be 'Kick off: Opp play Counter' // Object.is equality
Expected: "Kick off: Opp play Counter"
Received: "0' Opp switch to Counter"
 ❯ src/ui/matchday/__tests__/timeline.test.ts:238:7
```

### Item 8 RED, `pnpm vitest run src/components/matchday/__tests__/MatchdaySettings.test.tsx` at `f8383bb`

2 tests ran and 2 failed.

Test 1: "follows manager mode and the match view when another tab changes them".

```
AssertionError: expected 'false' to be 'true' // Object.is equality
Expected: "true"
Received: "false"
 ❯ src/components/matchday/__tests__/MatchdaySettings.test.tsx:31:77
```

Test 2: "still follows another tab after a change made on this screen".

```
AssertionError: expected 'true' to be 'false' // Object.is equality
Expected: "false"
Received: "true"
 ❯ src/components/matchday/__tests__/MatchdaySettings.test.tsx:43:77
```

### Item 7 RED, `PLAYWRIGHT_PORT=3482 pnpm exec playwright test e2e/watch-live.spec.ts --project=chromium` at `08897fb`

The suite ran against a `next start` build of `648cf2f` on port 3482. That is the code before the Watch live change, and this spec reads no app code. 3 tests ran and 3 failed. Each test loaded the results (`results-record` visible) and then timed out waiting for the button.

Test 1: "Watch live replays a retained pd5 match as a goals-only broadcast at 360px".

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByTestId('match-G1').getByTestId('watch-live')
> 17 |     await page.getByTestId("match-G1").getByTestId("watch-live").click();
```

Test 2: "Watch live replays a retained pd5 match as a goals-only broadcast at 1280px".

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByTestId('match-G1').getByTestId('watch-live')
> 17 |     await page.getByTestId("match-G1").getByTestId("watch-live").click();
```

Test 3: "Watch live on an engine-6 run plays the full broadcast with match events".

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByTestId('match-G2').getByTestId('watch-live')
> 41 |   await page.getByTestId("match-G2").getByTestId("watch-live").click();
```

### Browser proof added with the fixes

- `e2e/manager-mode.spec.ts` gains "a reload during the matchday comes back at the same match with the decisions kept" (item 6). The test coaches a kickoff tactic and moves to match 2. After a reload it checks the same match index and title, then finishes the cup and finds "Kick off: you play Attack" in the first match's incidents.
- `e2e/manager-mode.spec.ts` gains "a start screen follows manager mode and the match view changed in another tab" (item 8). The test uses two pages in one browser context.
- `e2e/watch-live.spec.ts` covers item 7. It checks the pd5 goals-only broadcast at 360 and 1280px with no sideways scroll, and an engine-6 link playing the full broadcast.
- Targeted run on a fresh build of `6866dc4`: `PLAYWRIGHT_PORT=3482 CI=1 pnpm exec playwright test e2e/watch-live.spec.ts e2e/manager-mode.spec.ts --project=chromium --project=pixel-7` passed 17 of 17.

### Gates at `6866dc4` (the last code commit)

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm format:check`, `pnpm check:image-seam` and `pnpm check:client-bundle` all exited 0. The client bundle check reported 20 server files holding the retained bundle and none in the client.
- `pnpm test`: 1,289 passed of 1,289, in 140 files.
- Playwright on a fresh build with `PLAYWRIGHT_PORT=3482 CI=1 pnpm exec playwright test`: 811 passed, 0 failed, 61 skipped, no flaky retries, in 5.7 minutes. By project: chromium 348 passed and 1 skipped, iphone-se 135 and 29, webkit-wheel 6 and 0, webkit-progress 6 and 0, iphone-14 173 and 3, pixel-7 143 and 28.
- `pnpm check:mirrors`: NOT RUN, because no mirrored file changed.
- Hosted CI, the independent review, a physical phone, and WebKit or Firefox timing for item 5: NOT RUN.
