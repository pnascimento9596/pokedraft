# pokedraft. Agent operating contract

Private, non-commercial fan game for one friend group. Players draft Pokémon into a soccer
formation, get a Team Score, and play a cup. `STATE.md` is measured repo truth. Verify any doc
claim against code before relying on it.

## Stack and layout

Single Next.js app (App Router, TypeScript strict, `src/`), pnpm, Node 22+, Vitest, ESLint,
Prettier, Zod. No monorepo.

- `src/app/` Next.js routes.
- `src/data/` committed build artifacts: `pokedex.json`, `scouting.json`. Never hand-edit.
- `src/scouting/` scouting model. `attributes.ts` (Layer 1 baseline), `review/gen-<n>.json`
  (Layer 2 per-species review), `fit.ts` (Layer 3 role fit), `coefficients.ts`, `tags.ts`.
- `src/lib/` shared pure helpers (`rng.ts`, the only randomness source).
- `scripts/data/` deterministic build levers. `build-pokedex.mjs` (PokéAPI CSV to
  `pokedex.json`), `build-scouting.ts` (layers 1 to 3 to `scouting.json`).
- `tools/pstack-core/` vendored pstack slice plus `pokedraft-overrides.md`.
- `docs/decisions/` per-dispatch decision logs. `docs/reports/` review and data reports.

## ⚠ Merge = ship

Once Vercel is linked, merging to `main` deploys to production. There is no staging gate. Until
then this banner is dormant. `STATE.md` records whether Vercel is linked.

## Workflow

Work under the `pokedraft-mode` skill: `tools/pstack-core/skills/pokedraft-mode/SKILL.md`
(mirrored at `.claude/skills/pokedraft-mode/SKILL.md`). It loads
`tools/pstack-core/pokedraft-overrides.md` first; those rules win. Subagents use the
`pokedraft-mode` agent in `.claude/agents/`.

- One PR per dispatch off `origin/main`. Conventional commits.
- Stage explicit paths. Never `git add -A`, `-u`, or `.`. Never `git stash`. Never force-push.
- Squash merge pinned to the reviewed head: `gh pr merge <n> --squash --match-head-commit <sha>`.
  Never `--auto`.
- Update `STATE.md` in the same PR that merges.

## Hosting assumptions

- The client IP comes from `x-real-ip`, which Vercel sets to the caller's address (it is what
  `ipAddress()` from `@vercel/functions` reads). `x-forwarded-for` is only the fallback for other
  hosts and local runs. Off Vercel, a caller can spoof both, and the per-IP limits stop being
  trustworthy.
- `IP_HASH_SECRET` (at least 32 characters) keys the stored IP hash. Submissions and gate unlocks
  fail closed when it is missing. Rotating it orphans old hashes, which only resets rate-limit
  history and the `ip_hash` column on past rows.
- Preview deployments use the Neon `preview` branch through their own `DATABASE_URL`. Production
  keeps the main branch.

## Risk tiers

| Tier   | Scope                                                     | Gate                                                                                         |
| ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Red    | engine, data, scouting, leaderboard, deploy/env           | independent reviewer re-executes the gates on the exact head; fix forward to PASS; SHA-pinned squash |
| Yellow | UI, display-only, no engine/data/scouting semantics       | same reviewer flow, lighter scope (diff plus lint, typecheck, build, browser proof)           |
| Green  | docs and mechanical chores with no runtime change         | CI green plus reviewer receipt                                                                |

A commit after PASS voids the receipt. Two review rounds per head, three fix rounds max, then stop
and report.

## Validation ladder (narrowest first)

1. `pnpm vitest run <path>` for the files you touched.
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
3. `pnpm check:mirrors` when you touch `CLAUDE.md`, `AGENTS.md`, or the `pokedraft-mode` skill.
4. Data changes: rerun `pnpm data:pokedex` and `pnpm data:scouting` and confirm `git diff` shows
   only the intended artifact changes.

CI runs install, lint, typecheck, test, build, and the mirror check on GitHub-hosted
`ubuntu-latest` for every PR and every push to `main`.

## Honesty

- Never fabricate test counts, measurements, review verdicts, or merge/deploy status.
- Anything not run is reported as NOT RUN. Unknown stays flagged as unknown.
- A guard test proves RED then GREEN: commit the failing test before the fix.
- Tests assert literal expected values and name the bug they catch.
- UI claims are proven in a real browser.
- Never stop silently. Blocked means report the command, output, SHA, and what unblocks it.

## Standing invariants

- Determinism. Build scripts produce byte-identical output from the same inputs. Randomness comes
  only from `src/lib/rng.ts` with an explicit seed. ESLint forbids `Math.random`, `Date.now`, and
  `new Date()` in `src/scouting`, `src/lib`, and `scripts/data`. `src/engine` draws only through
  `src/engine/rng.ts` (cyrb128 + sfc32 with rejection sampling, named substreams) and ESLint bans
  `Date`, `crypto`, `performance`, DOM globals, `Math.random`, `Math.exp/log/pow`, and
  `localeCompare` there. Engine output is pinned by `src/engine/__tests__/goldens.test.ts`.
- Golden tests for any engine or data change. A change to `pokedex.json` or `scouting.json` ships
  with updated golden assertions and the regenerated artifact in the same PR.
- PlayerImage is the only image seam. No other component loads Pokémon art.
- No fabricated data. The scouting review cites the fields that drove each call. No Pokédex flavor
  text ships.
- No em dashes in user-facing copy. Nothing copied from all22pokemon.com.

## Final report format

Outcome first. Then: PR URL, squash SHA, reviewed head SHA, reviewer identity · gates run with
real counts · what changed · NOT RUN list · risks and carryovers · decisions with the principles
that shaped them.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
