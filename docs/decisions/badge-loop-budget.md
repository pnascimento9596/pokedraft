# Badge loop budget (out-of-band side fix)

Tier Green. Branch `test/badge-loop-budget`, off `origin/main` at `9f01b8c`. Only
`e2e/team-readability.spec.ts` changed. No product code changed.

## Symptom

On PR #134 (Wave 5 row 5e, results reveal), hosted run 39357079608 failed shard e2e (4) twice: the
first attempt and a rerun of the failed job. Each time all three widths of `every play badge of a
whole match stays inside the pitch box` hit `Test timeout of 240000ms exceeded.` (4.6 minutes with
setup), including their retries. Every other check on #134 was green.

## Root cause

The test steps a fake clock 50 ms at a time through a whole match, up to 3,000 steps. Each step
made three browser round trips: `clock.runFor`, `getAttribute("data-minute")` and one `evaluate`
for the badge. On hosted runners the test already took 3.1 to 3.3 minutes on PRs #131 and #132,
close to its 240 s budget. The heavier results page from 5e pushed it over. Locally the test is
not slow: 18.2 s at main `9f01b8c` and 18.5 s at the 5e head `cbd0ba3`. This is a budget problem
in the test, not a product regression.

## Decision

Per hand-off 3.5, a check that fails again on a rerun is not a flake and gets its own small PR
before the row lands.

- One `evaluate` per step now reads the minute from the enclosing `match-player` and the badge
  together. That is two round trips per step instead of three.
- The test now asserts the loop really reached minute 90. Without it, a missing minute would let
  the loop run to its cap and pass with partial coverage.
- The timeout goes from 240 s to 480 s. That is headroom on slow hosted runners, not a target; the
  loop itself is the real cost.

Rejected: a coarser clock step (fewer samples, so a badge shown briefly near an edge could be
missed), and dropping widths (the three widths are the layout proof).

## Measured

Same build, same machine, chromium, `CI=1`, `--retries=0`, one worker:

| Spec           | 390 px | 360 px | 320 px | Run total | Result at each width                          |
| -------------- | ------ | ------ | ------ | --------- | --------------------------------------------- |
| main `9f01b8c` | n/c    | n/c    | n/c    | 54.6 s    | 13 badges, closest margin 0 px, clipped `[]`  |
| this branch    | 11.7 s | 11.3 s | 11.3 s | 35.0 s    | 13 badges, closest margin 0 px, clipped `[]`  |

n/c: per-width times for main were not captured; the run total was.

Coverage is unchanged and local wall time drops by about 36%. Hosted CI timing is in STATE.
