# Health cron (Wave 7 item, landed early in Wave 5)

Tier: Green. One new workflow, `.github/workflows/health.yml`. No change under `src/`, `e2e/` or
`scripts/`, so nothing in the app, the build or the deploy changes.

## Scope

The brief's Wave 7 row: "GitHub Actions cron every 30 min: `/api/health?db=1` status ok and `.sha`
equals `origin/main`; opens or updates an issue on failure (Green, S)." The Wave 5 hand-off moves
it to right after 5f1, because Wave 5 changes the production schema twice and merging to `main`
deploys with no staging gate and no monitoring.

## What it does

- Runs at minutes 7 and 37 of every hour (UTC), and on demand through `workflow_dispatch`.
- Reads the `main` head sha and its committer date through the GitHub API, then fetches
  `https://pokedraft-woad.vercel.app/api/health?db=1` up to three times, 20 s apart, until it
  answers 200.
- Fails when the last answer is not 200 or `db.status` is not `ok`, or when the served `sha`
  differs from `main` and `main` is at least 20 minutes old.
- On failure it comments on the open issue titled "Production health check failing", or opens
  one, with the served sha, the expected sha, the status and the raw response, then exits 1 so the
  run shows red.

## Decisions

- **20-minute deploy grace.** `land.sh` waits up to 15 minutes for production to serve a merge.
  A cron run landing in that window would otherwise open an issue for every merge. 20 minutes
  covers a normal Vercel build (about 2 to 4 minutes here) with room for a slow one; a deploy still
  missing after that is a real failure. Principle: alert on what is actually broken.
- **Off-minute schedule (7 and 37).** GitHub delays top-of-hour cron jobs under load. The brief
  asks for every 30 minutes, not a particular minute.
- **One issue, comments after.** A failure that lasts hours adds comments to one issue rather
  than opening dozens. The owner closes it when production is fixed; the next failure opens a new
  one.
- **Three tries before failing.** A Neon compute waking from suspend can make the first
  `db=1` call slow. Retrying keeps a cold start from paging anyone.
- **No secrets.** `/api/health` is outside the passcode gate (the entry gate and every live check
  read it with plain `curl`), so the job needs only the default `GITHUB_TOKEN` with
  `issues: write`.
- **Untrusted text stays in env vars.** The response body and the computed problem reach the
  issue step through `env`, never interpolated into the script, and the multiline output uses a
  random delimiter.

## Proof

- `actionlint .github/workflows/health.yml` exit 0 (shellcheck included). Prettier passed.
- The check step's script, extracted verbatim and run locally with `gh` and GNU `date -d` shimmed
  (macOS has no GNU date), on 2026-10-19 against production serving `5932775`:
  - served sha equals main: `problem=` (pass);
  - main set to forty zeros, merged 11,570 s earlier: `problem=production serves 5932775... but
    main is 0000... (merged 11570s ago)`;
  - the same mismatch with main merged 1 s earlier: `problem=` (inside the grace window);
  - URL `/api/health-missing`: `problem=HTTP 404, db.status unparsable`.
- The issue step was not run locally (it writes to GitHub).

## NOT RUN

- The scheduled trigger and the issue step on GitHub before merge. `workflow_dispatch` only runs
  from the default branch, so the first real run is a manual dispatch right after merge, recorded
  in the next STATE update.
- A real failure path on GitHub (it would open a real issue). The local run above covers the
  decision logic.

## Removed (2026-10-19, owner decision)

The owner asked for the 30-minute health cron to be removed: "please remove the health check that
runs every 30 minutes, i don't need any health check". The workflow was disabled on GitHub the same
day (`gh workflow disable health.yml`, state `disabled_manually`) and `.github/workflows/health.yml`
is deleted in the follow-up PR. It ran once (the manual dispatch after #128, success) and opened no
issue.

The `/api/health` route stays. It is not a scheduled check: the merge procedure (`land.sh`) and each
row's live check read it once to confirm production serves the merged sha, and it costs nothing when
nobody calls it.

This supersedes the Wave 5 hand-off's recommendation 8.4 and the brief's Wave 7 health cron row.
After a merge, production state is still verified by hand through the live check in hand-off 3.7.
