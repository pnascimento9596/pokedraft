# CI hygiene (row 7ci, Green)

Branch `chore/ci-hygiene` off `origin/main` at `6606585`. Wave 7 row 7ci (Green).

## Scope

- `.github/workflows/ci.yml`: sets `timeout-minutes: 30` and `node-version: 24` on every job (`check`, `db`, `e2e`), pins all five GitHub Actions to full 40-character commit SHAs with trailing version comments, adds `pnpm format:check` to `check`, and adds the `db` job backed by a `postgres:16` service container. Triggers remain `pull_request`, `push` (`branches: [main]`), and `workflow_dispatch`. `.github/workflows/theme-measurement.yml` is untouched.
- `scripts/db/connect.mts` and `scripts/db/migrate.mts`: adds `createPgSql` and an opt-in `DB_DRIVER=pg` path inside `connect()` using `pg` (`8.23.1`) and `drizzle-orm/node-postgres` (`drizzle-orm` `^0.45.4`) while keeping `@neondatabase/serverless` (`neon()`) and `drizzle-orm/neon-http` when `DB_DRIVER` is unset. `scripts/db/smoke.mts`, `scripts/db/rollback.mts`, `scripts/db/delete-entry.mts`, and `src/db/client.ts` are untouched.
- `scripts/db/connect.test.ts`: unit test guarding default Neon selection, `DB_DRIVER=pg` selection, lazy `sql.query` execution inside `sql.transaction` (`BEGIN` and `COMMIT` on one checked-out client), and `ROLLBACK` on statement failure.
- `package.json` and `pnpm-lock.yaml`: adds `pg` (`^8.23.1`) and `@types/pg` (`^8.23.1`) to `devDependencies`.

## Action SHA pins

Resolved with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (and `gh api repos/pnpm/action-setup/git/tags/d9184bf108216479bc5a137cc391f4d7b14c870b` to dereference the annotated `v6.1.0` tag object to its commit SHA):

| Action | Tag | Commit SHA | Ref object type |
| --- | --- | --- | --- |
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `commit` |
| `pnpm/action-setup` | `v6.1.0` | `ea17c68df8912ef543352723c149a84f56e3d413` | `tag` (`d9184bf108216479bc5a137cc391f4d7b14c870b` -> commit `ea17c68df8912ef543352723c149a84f56e3d413`) |
| `actions/setup-node` | `v7.1.0` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `commit` |
| `actions/cache` | `v6.1.0` | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` | `commit` |
| `actions/upload-artifact` | `v7.0.2` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `commit` |

Command output from `gh api`:

```text
$ gh api repos/actions/checkout/git/ref/tags/v7.0.1
{"ref":"refs/tags/v7.0.1","node_id":"MDM6UmVmMTk3ODE0NjI5OnJlZnMvdGFncy92Ny4wLjE=","url":"https://api.github.com/repos/actions/checkout/git/refs/tags/v7.0.1","object":{"sha":"3d3c42e5aac5ba805825da76410c181273ba90b1","type":"commit","url":"https://api.github.com/repos/actions/checkout/git/commits/3d3c42e5aac5ba805825da76410c181273ba90b1"}}
$ gh api repos/pnpm/action-setup/git/ref/tags/v6.1.0
{"ref":"refs/tags/v6.1.0","node_id":"MDM6UmVmMjYyMjg5NzQ3OnJlZnMvdGFncy92Ni4xLjA=","url":"https://api.github.com/repos/pnpm/action-setup/git/refs/tags/v6.1.0","object":{"sha":"d9184bf108216479bc5a137cc391f4d7b14c870b","type":"tag","url":"https://api.github.com/repos/pnpm/action-setup/git/tags/d9184bf108216479bc5a137cc391f4d7b14c870b"}}
$ gh api repos/pnpm/action-setup/git/tags/d9184bf108216479bc5a137cc391f4d7b14c870b
{"node_id":"TA_kwDOD6I5U9oAKGQ5MTg0YmYxMDgyMTY0NzliYzVhMTM3Y2MzOTFmNGQ3YjE0Yzg3MGI","sha":"d9184bf108216479bc5a137cc391f4d7b14c870b","url":"https://api.github.com/repos/pnpm/action-setup/git/tags/d9184bf108216479bc5a137cc391f4d7b14c870b","tagger":{"name":"Zoltan Kochan","email":"z@kochan.io","date":"2026-09-05T07:26:11Z"},"object":{"sha":"ea17c68df8912ef543352723c149a84f56e3d413","type":"commit","url":"https://api.github.com/repos/pnpm/action-setup/git/commits/ea17c68df8912ef543352723c149a84f56e3d413"},"tag":"v6.1.0","message":"v6.1.0\n-----BEGIN PGP SIGNATURE-----\n\niQIzBAABCgAdFiEEe3TRKZVotYa6mWK1ZJ5NSvdOfewFAmqbxBMACgkQZJ5NSvdO\nfeyTJw/6Akyt1MmT1OuGhGi7T+hcD0wNpGOF/g+SxJnFy6Ky4HuzVp+8t+/M5F0P\n7t9oZypsHt5MllD6qOldn/O9+TgQf/qltz8+utk+7JCqJcAgFfZS3RWY3ThbHJM9\ndWX4WTI2HDyNmg83BIghtgjJgEFjHMuE2q+zuDdAP9xNHSpdanPtVwSPugEhbiDf\nyvHXk3z8gfHZHcUA58kFkX0BPzCvtJyrfzW+pJgaHte0KnNJ4ppcTZEurLMuxjWf\nAOZuv9/lh0J0olQGAKloc9hiiJu//J/gAKt5K98zrda5FSTAWD5OP17ALNrR4g56\nkdahyuLHZaxW9Tchi2vCgXjyjj83aRbS1qmc99dgWeGyY916CEFotNIzFcHz/PHa\nq6ppJYfx8HpmPI+6wR2AY2Y+TdRcYjBy9ybokeWa/Q4DDlB6su7mMxvmF+6cMNsZ\nM3dppl+iuL3+4UA2P/q6S0Og/R0VubtFEVMzcrHhJkb/XUge5UBkLDqvEDNlxNL3\n0KDQzDJ/G5pK0M72F+74yvbDxZ8+tN5jpbXOCo+r6aMeNQbSQkC9u9ESGE4Nz9/g\nqm+zWdiY/iaYUfRyHzfCtvgMrl4OYZoRjvIQ3M49qy6GfpBZFK38v01dxOBskX5e\neV8JowMazP3wkh2kddKelQEIQw9WpQWqmHGPYnY8bB37PU1mqFQ=\n=uD+t\n-----END PGP SIGNATURE-----\n","verification":{"verified":true,"reason":"valid","signature":"-----BEGIN PGP SIGNATURE-----\n\niQIzBAABCgAdFiEEe3TRKZVotYa6mWK1ZJ5NSvdOfewFAmqbxBMACgkQZJ5NSvdO\nfeyTJw/6Akyt1MmT1OuGhGi7T+hcD0wNpGOF/g+SxJnFy6Ky4HuzVp+8t+/M5F0P\n7t9oZypsHt5MllD6qOldn/O9+TgQf/qltz8+utk+7JCqJcAgFfZS3RWY3ThbHJM9\ndWX4WTI2HDyNmg83BIghtgjJgEFjHMuE2q+zuDdAP9xNHSpdanPtVwSPugEhbiDf\nyvHXk3z8gfHZHcUA58kFkX0BPzCvtJyrfzW+pJgaHte0KnNJ4ppcTZEurLMuxjWf\nAOZuv9/lh0J0olQGAKloc9hiiJu//J/gAKt5K98zrda5FSTAWD5OP17ALNrR4g56\nkdahyuLHZaxW9Tchi2vCgXjyjj83aRbS1qmc99dgWeGyY916CEFotNIzFcHz/PHa\nq6ppJYfx8HpmPI+6wR2AY2Y+TdRcYjBy9ybokeWa/Q4DDlB6su7mMxvmF+6cMNsZ\nM3dppl+iuL3+4UA2P/q6S0Og/R0VubtFEVMzcrHhJkb/XUge5UBkLDqvEDNlxNL3\n0KDQzDJ/G5pK0M72F+74yvbDxZ8+tN5jpbXOCo+r6aMeNQbSQkC9u9ESGE4Nz9/g\nqm+zWdiY/iaYUfRyHzfCtvgMrl4OYZoRjvIQ3M49qy6GfpBZFK38v01dxOBskX5e\neV8JowMazP3wkh2kddKelQEIQw9WpQWqmHGPYnY8bB37PU1mqFQ=\n=uD+t\n-----END PGP SIGNATURE-----\n","payload":"object ea17c68df8912ef543352723c149a84f56e3d413\ntype commit\ntag v6.1.0\ntagger Zoltan Kochan <z@kochan.io> 1788593171 +0200\n\nv6.1.0\n","verified_at":"2026-09-05T07:27:51Z"}}
$ gh api repos/actions/setup-node/git/ref/tags/v7.1.0
{"ref":"refs/tags/v7.1.0","node_id":"MDM6UmVmMTg5NDc2OTA0OnJlZnMvdGFncy92Ny4xLjA=","url":"https://api.github.com/repos/actions/setup-node/git/refs/tags/v7.1.0","object":{"sha":"949feb2413d6458794dcd2491c4babbbce0c15c1","type":"commit","url":"https://api.github.com/repos/actions/setup-node/git/commits/949feb2413d6458794dcd2491c4babbbce0c15c1"}}
$ gh api repos/actions/cache/git/ref/tags/v6.1.0
{"ref":"refs/tags/v6.1.0","node_id":"MDM6UmVmMjE1NTY2NDYyOnJlZnMvdGFncy92Ni4xLjA=","url":"https://api.github.com/repos/actions/cache/git/refs/tags/v6.1.0","object":{"sha":"55cc8345863c7cc4c66a329aec7e433d2d1c52a9","type":"commit","url":"https://api.github.com/repos/actions/cache/git/commits/55cc8345863c7cc4c66a329aec7e433d2d1c52a9"}}
$ gh api repos/actions/upload-artifact/git/ref/tags/v7.0.2
{"ref":"refs/tags/v7.0.2","node_id":"MDM6UmVmMTkyNjI1OTU1OnJlZnMvdGFncy92Ny4wLjI=","url":"https://api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.2","object":{"sha":"cf430e030ddbb5b0abf93d22962f4752f3646cd9","type":"commit","url":"https://api.github.com/repos/actions/upload-artifact/git/commits/cf430e030ddbb5b0abf93d22962f4752f3646cd9"}}
```

## Decisions and evidence

- **Node 24 in every CI job (`check`, `db`, `e2e`).** Vercel production runs Node 24.x, and `package.json` specifies `"engines": { "node": ">=22" }`. Nothing in `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` is known to break on Node 24. The local machine runs Node `v22.22.3`, so the PR's hosted GitHub Actions run is the proof for Node 24 execution.
- **Database driver adapter (`DB_DRIVER=pg`) over a Neon HTTP proxy container.** Option (b) was chosen over option (a) (per `principle-laziness-protocol` and `principle-boundary-discipline`). Neon does not publish an official single-purpose HTTP proxy container image on Docker Hub or GHCR, and wiring two service containers together in GitHub Actions requires a third-party proxy image and container-to-container networking flags. By contrast, `drizzle-orm` (`^0.45.4`, already in `package.json`) ships `drizzle-orm/node-postgres` and `drizzle-orm/node-postgres/migrator`, so adding `pg` and `@types/pg` (`8.23.1`) to `devDependencies` and branching inside `connect()` when `process.env.DB_DRIVER === "pg"` keeps all production code (`src/db/client.ts`) and default Neon script behavior (`DB_DRIVER` unset) untouched.
- **Lazy `SqlQuery` for `sql.transaction([...])`.** `scripts/db/rollback.mts` passes `[...down.map((s) => sql.query(s)), sql.query("DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1", [entry.when])]` into `sql.transaction([...])`. `createPgSql` returns a lazy thenable from `sql.query(text, params)` that starts `pool.query` only when `.then` is invoked directly, while `sql.transaction(queries)` checks out one client from `pool.connect()`, executes `BEGIN`, runs each `q.text` and `q.params` sequentially on that client, executes `COMMIT` (or `ROLLBACK` on error), and releases the client. `pg.Pool` is configured with `allowExitOnIdle: true` so the CLI scripts exit cleanly after top-level `await`.
- **RED then GREEN guard (`scripts/db/connect.test.ts`).** Committed failing test first at `4beb76c7` (3 of 3 failed), then fixed in `a33fcc28` (3 of 3 passed):

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7ci

 ❯ scripts/db/connect.test.ts (3 tests | 3 failed) 4ms
   ❯ scripts/db/connect (3)
     × keeps the Neon HTTP driver when DB_DRIVER is unset and selects pg when DB_DRIVER=pg 3ms
     × defers sql.query execution until awaited so sql.transaction runs all statements inside BEGIN/COMMIT on one client 1ms
     × rolls back and releases the client when a statement inside sql.transaction fails 0ms
```

- **Local throwaway Postgres 16.14 proof.** Verified all six migrations (`0000_leaderboard_entries.sql` through `0005_leaderboard_integrity.sql` in `drizzle/`) and their paired `.down.sql` files in `drizzle/rollback/` against a throwaway local `postgres (PostgreSQL) 16.14 (Homebrew)` instance initialized with `/opt/homebrew/opt/postgresql@16/bin/initdb` and started with `/opt/homebrew/opt/postgresql@16/bin/pg_ctl` on TCP port `55432` (no Docker Desktop, cleaned up on exit):

```text
$ tsx scripts/db/migrate.mts
[db:migrate] target endpoint localhost
[db:migrate] OK, 6 migration(s) recorded
$ tsx scripts/db/smoke.mts
[db:smoke] target endpoint localhost
[db:smoke] select [
  {
    nickname: 'smoke',
    mode: 'cup8',
    daily_date: '2000-01-01',
    wins: 4,
    draws: 1,
    losses: 1,
    team_score: 700,
    coached: false,
    fingerprinted: true
  }
]
[db:smoke] second daily row for the same nickname: 23505
[db:smoke] second row with the same mode and run_fingerprint: 23505
[db:smoke] OK
$ tsx scripts/db/rollback.mts
[db:rollback] target endpoint localhost
[db:rollback] OK, rolled back 0005_leaderboard_integrity
$ tsx scripts/db/rollback.mts
[db:rollback] target endpoint localhost
[db:rollback] OK, rolled back 0004_run_fingerprint_coached
$ tsx scripts/db/rollback.mts
[db:rollback] target endpoint localhost
[db:rollback] OK, rolled back 0003_serialized_rate_limit
$ tsx scripts/db/rollback.mts
[db:rollback] target endpoint localhost
[db:rollback] OK, rolled back 0002_alltime_board_idx
[db:count] 2 migration(s) recorded
$ tsx scripts/db/migrate.mts
[db:migrate] target endpoint localhost
[db:migrate] OK, 6 migration(s) recorded
```

## NOT RUN

- Node 24 execution locally (local Node is `v22.22.3`; proven on the PR's hosted GitHub Actions run).
- Playwright e2e suite locally (nothing under `src/` or `e2e/` changed; CI runs the 8-shard matrix).
- Coordinator review, PR creation, hosted CI verification, and squash merge.
