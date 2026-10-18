# CI: shard the e2e job four ways (side fix)

Tier Green. Branch `ci/shard-e2e`, off `9d37864`. Only `.github/workflows/ci.yml` changes. No
runtime, test or product change. An out-of-band side fix, not a Wave 1 row.

## Why

Every program PR waits on the hosted `e2e` job before its SHA-pinned merge. Measured on PR #80's
run 39080365144:

- `pnpm test:e2e` step: 28.6 min (824 passed, 61 skipped). Setup before it (install, browser
  install, build) about 1.8 min.
- Summed test time 6,729 s over 4 workers. By project: iphone-14 2,593 s, chromium 2,123 s,
  iphone-se 1,164 s, pixel-7 576 s, webkit-progress 209 s, webkit-wheel 61 s.
- By spec: `mobile-acceptance` 2,744 s (270 runs across three phones), `mobile-targets` 774 s,
  `manager-mode` 486 s, `mobile-draft` 483 s. The slowest single test is 96 s.

The `check` job takes about 4 min, so `e2e` is the whole critical path.

## Decision

A matrix of four jobs, each `playwright test --shard=N/4`. The config is `fullyParallel`, so
Playwright splits at test level and the heavy phone specs spread across shards. The repository is
public, so standard runner minutes are free; the cost is four copies of the 1.8 min setup.
`fail-fast: false` keeps every shard's result, and each failing shard uploads its own report
(`playwright-report-N`). Retries stay at 1 per test, as before.

Not chosen: dropping a phone project or merging specs. That removes coverage the brief's 390x844
proofs rely on, and the shard split gets most of the time back without it. Caching browsers saves
under a minute per job because `--with-deps` still installs the system packages.

## Measurement

Before: 28.6 min test step, about 31 min job (PR #80). After, on this PR's first run (head
`a380010`): shards 1 to 4 took 7.4, 6.9, 9.1 and 6.7 min end to end, all green. The slowest
shard sets the job time, about 9 min.

## NOT RUN

Local Playwright (no test or config change; the hosted run is the proof). GLM review is run by the
coordinator.
