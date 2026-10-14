# Results interaction repair

## Fixed scope

The repair starts at `d1cdc9546fa96989207676ddd383fe5ce8e34230`. Runtime ownership is limited to `MatchHighlights.tsx`, its CSS, `SoccerBall.tsx`, and `starCalculation.ts`. Engine awards, goal events, ability metadata, kick moves, and deterministic selection remain unchanged.

## Causes and decisions

- `MatchHighlights.tsx` passed an undefined `striking` class while the ball CSS required `data-striking="true"`. `SoccerBall` now forwards the existing boolean to that attribute. The existing shot animation is unchanged.
- Pause previously covered only selected descendants. A single section-level `data-paused` selector now pauses every descendant animation, including pseudo-elements and the goal celebration. Pause controls visual motion, not the 550 ms celebration or 2800 ms reset timers. Reduced-motion rules and media behavior remain unchanged.
- Selection and Continue Dribbling reset state without canceling callbacks. Two retained timeout handles are canceled on selection, reset, and unmount. Hooks remain above the early return.
- A final draw does not establish that the user's goal was an equalizer. All single-goal headlines now use neutral `Goal Scorer` copy with the observed minute. The literal regression uses a user opener at 10 minutes and an opponent equalizer at 80 minutes, finishing 1-1. It is controlled test input, not a claim about production matches.

Model the Domain preserves the existing local strike state and gives its timers explicit lifecycle ownership. Laziness Protocol chooses existing CSS and neutral copy instead of new animation states or score reconstruction. Test Behavior, Not Implementation and Prove It Works require literal timer repros and actual browser animation checks.

## Verification

The RED test commit is `0f92b21`. Before runtime edits, focused units failed 5 of 13 tests. Actual public-production browser repros failed the shot and pause checks in both Chromium and WebKit, with 2 reduced-motion checks passing.

After the repair, focused units passed 13 of 13 tests across 2 files. A fresh local production build on port 3481 passed 6 browser checks using explicit Chromium and WebKit contexts under the existing Chromium project. The checks observe the ball's CSS animation name and transform, frozen idle motion, paused shot and goal-pop animations, resume, logical timer completion, and reduced-motion controls. No Playwright configuration changed.

Lint, typecheck, and build each exited 0. Full units exited 1 with 882 passing and 4 failing tests across 97 files. All four failures concern card text order in the untouched Builder and run tests. An archive of the exact base independently reproduced those same four failures, with 64 passing tests across those two files. They remain outside this lane's ownership.

Logs, RED traces, and GREEN Chromium/WebKit screenshots are under `/Users/paulo/.hermes/cache/scratch/results-repair/`. The original public-production audit is `/Users/paulo/.hermes/cache/scratch/pr47-highlight-audit/report.md`. Protected runtime paths and Playwright configuration have an empty diff against the base.

## Handoff

Independent review, complete browser sweep, remote CI, push, PR, merge, and deployment are NOT RUN. The parent owns them. Architect is skipped because the dispatch fixed the design. Delegation and Opening a PR are skipped because this is an isolated implementation subagent with no push or PR authority. No external model routing ran.

## Parent verification and production readiness

The parent repaired the four inherited card DOM-order contracts in PR48, independently reran lint, typecheck, the complete unit suite, production build, bundle guard, and full browser suite. All 886 units and 719 browser cases passed with 55 existing conditional skips, zero unexpected or flaky outcomes, and no retries. Merging PR48's squash into this branch preserved the entire tested tree byte for byte. A fresh build at `608e1ad` passed all 10 focused results and original-request browser checks. Real 390px and 1440px captures and a controlled-clock browser probe verified shot, correct visible/live star, selection cancellation, early Continue, and later-strike duration. GLM independently approved that head, but the following harness correction supersedes its receipt.

Production verification on PR48's deployed `95708d46` exposed an untouched drag guard reading empty labels while Builder's lazy `withLive` Randomize promise was still resolving. Two complete matrices failed that exact stale-snapshot assertion. The guard now waits for both participants' existing `data-filled="true"` state before capturing their names; both original swap assertions and the grass-scroll assertions remain intact. No application code, timeout budget, retries, or configuration changed. The corrected complete original-request production matrix passed 119 cases with four existing skips. Twenty repeated production drag cases passed without retries. The production artifact and stress receipts are in the parent scratch directory. This readiness-only correction is included with the results follow-up so the two original requests finish with truthful end-to-end proof. New exact-head review and CI remain required.

## CI ordering correction

### Linux follow-up

The `b562193` Linux run passed the corrected pause and shot guards but still failed the two iPhone wheel-layout cases while awaiting natural candidates within their unchanged five-second budget. The open-art and reduced-motion goal cases passed on retry; the check job also failed one untouched keyboard-selection unit. Root did not rerun the whole workflow blindly. A read-only keyboard audit passed five isolated runs and eight full 29-test file runs without reproducing the failure. Passive-effect readiness remains a hypothesis, not a proven application defect.

The geometry and open-art setup now invoke the existing Skip handler in one DOM evaluation only if its button is still present. This avoids both the disappearing-button actionability race and waiting for the full sequential roll under Linux load. It does not claim a physical Skip tap; the separate motion-on mobile-targets guard still verifies that real interaction. Every existing viewport/geometry/seeded-offer/scroll assertion remains. Reduced-motion goal inspection uses the same controlled logical clock as the other two results cases, preventing auto-reset from consuming its short observation window. The keyboard unit adds one async `act` barrier after the asynchronous Start and before its one keydown sequence; it flushes pending React work without retrying user input or changing any literal assertions. This is fixture hardening, not a claimed reproduced root cause.

The revised affected matrix passed 85 repeated checks with zero skips, failures, flaky outcomes, or retries, and the keyboard file passed all 29 tests with `CI=true`. No application/controller/engine/timer/CSS or timeout/retry/runner changes. Earlier receipts and local/remote whole-suite results are superseded for the new test head. Final exact-head review, whole gates and CI remain required.

The `363c3df` Linux browser run failed the new WebKit pause sampler and the pre-existing transient Skip geometry guard. PR48's squash browser job failed the same Skip race again on its one failed-job rerun; no further reruns were requested. The formation loop and open-art flow also spent their Start tap during lazy restore. Saved job traces/logs establish these failures before the corrections.

The pause test now confirms the section's paused state and settled animation objects before recording the still-frame transform. It keeps exact equality after 200 ms and every original shot/goal/paused-state assertion. A controlled browser clock advances the existing 550/2800 ms logical callbacks without racing slow screenshot/inspection calls. The animation recorder discriminates CSS animations, CSS transitions, and other web animations rather than casting every object to CSSAnimation. It still checks all observed animations, allowing native hover transitions to settle rather than omitting them. Shot sampling likewise holds logical reset until its frame is captured. No application animation or timer changed.

The wheel-layout test samples the visible wheel and then lets its existing automatic completion offer candidates. It no longer tries to scroll to or click a Skip button that disappears during scrolling; all original geometry, viewport, placement, and document-scroll assertions remain. The separate motion-on mobile-targets guard still exercises the actual Skip target. Draft-flow Start taps now reuse the existing hydration/idle protocol, including each formation and the open-art flow. That flow's transient Skip action is likewise unnecessary for its offer/scroll contract.

Five repeated runs of these affected cases passed 75 checks with zero skips, failures, flaky outcomes, or retries. Runtime, engine, data, scoring, persistence, API, leaderboard, package, lockfile, and runner/configuration deltas remain empty. The prior review is superseded. PR49's forward fixture fixes must pass their own exact-head review/CI; the latest post-merge main run and production checks must then be green. Historical PR48 main cannot be called green, and requiring its unfixed harness to pass before merging its corrective successor would be a circular gate.
