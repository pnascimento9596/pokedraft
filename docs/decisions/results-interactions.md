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
