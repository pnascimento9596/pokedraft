# Dispatch 1 decision log

Lane owner: Claude Code, Opus 5.5. Branch `feat/foundation`. Mode `pokedraft-mode` from GATE 2 on.

## GATE 0 recon

Sources were shallow clones taken on 2026-10-09: `pnascimento9596/wcdraft` at its default head and `pnascimento9596/BiotraxIQ` at `c6833024577edf1549ebb5ddaf005591618d8f9f`. Neither clone is inside this repo.

### wcdraft workflow (`wcdraft/CLAUDE.md`)

- `CLAUDE.md:8-11` names the "Merge = ship" banner. Ported as a banner that activates once Vercel is linked.
- `CLAUDE.md:21` stages explicit paths only, no `git add -A`/`-u`, no `git stash`. Ported verbatim.
- `CLAUDE.md:25-31` defines Green/Yellow/Red tiers. Red requires an independent reviewer who re-executes gates and a squash pinned with `--match-head-commit`. Ported, with engine/data/scouting/leaderboard/deploy as Red and UI as Yellow.
- `CLAUDE.md:39-53` lists standing invariants: golden tests for core logic, deterministic ETL with byte-stable output, no fabrication. Ported as determinism plus golden tests for engine or data.
- `CLAUDE.md:55-71` is the self-hosted runner wedge runbook. Not ported. This repo uses GitHub-hosted `ubuntu-latest` only.
- `CLAUDE.md:73-78` honesty rules. Ported.
- `CLAUDE.md:89-100` narrowest-first validation ladder. Ported as targeted vitest, then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- `CLAUDE.md:102-106` final report format. Superseded by the override readback, which is stricter.

### BiotraxIQ pstack slice (`BiotraxIQ/tools/pstack-core`)

- `VENDOR.md:3-6` pins upstream `cursor/plugins` at `ccb5507cec1546dc88135c1139c811e6c59115ba`, plugin 0.15.15, path `pstack`, MIT, copyright 2026 Lauren Tan.
- `VENDOR.md:13-24` lists the taken files. The dispatch allowlist matches it except `biotraxiq-overrides.md` and `skills/biotraxiq-mode`, which are excluded here.
- `VENDOR.md:30-31` notes BiotraxIQ ships a local edit of `skills/interrogate/SKILL.md`. That file names BiotraxIQ's `scripts/glm_review_transport.py`. This repo replaces it with a pokedraft-local edit that points at `pokedraft-overrides.md`. Rubric and references stay upstream bytes.
- `biotraxiq-overrides.md:7-16` (Authority), `:18-38` (Review), `:40-69` (Landing), `:71-81` (Models), `:95-110` (Evidence), `:112-120` (Readback) are the shape `pokedraft-overrides.md` follows. Dropped as BiotraxIQ-only: Neon/Alembic migration rules, M4 self-hosted runner, `check_production_exclusive.py`, lane registry, Render served-pair readback, dual-tree `.agents/skills`.
- `skills/biotraxiq-mode/SKILL.md:8-12` sets load order overrides, then poteto-mode, then leaves. `:16-27` maps Cursor-only triggers to skips. Mirrored in `pokedraft-mode`.
- `skills/poteto-mode/SKILL.md:121` requires a todo list opening with the matched playbook's steps verbatim. `:101-113` sets reply style (no long dash, no mid-sentence colon).
- `playbooks/feature.md:5-17` is the eight-step Feature playbook copied into the todo list.
- `playbooks/opening-a-pr.md:9-22` sets title and body rules: Conventional Commits, sections Why/What changed/Scope/Tradeoffs/Blast Radius/Verification, under about 40 lines.
- `playbooks/autonomous-run.md:5-11` requires a checkable exit predicate. Predicate for this lane is the dispatch DONE WHEN list.

### wcdraft core types

- `wcdraft/packages/core/src/rng.ts:43` `cyrb128` string hash, `:78` `sfc32` generator, `:100` `createRng(seed)`, `:253` `compareCodePointStrings`. All arithmetic is 32-bit via `Math.imul` and `>>> 0`, so output is engine-stable. Ported as `src/lib/rng.ts` for the seeded audit sample. The substream machinery (`:159-216`) is not needed yet.
- `wcdraft/packages/core/src/types/formation.ts:43-69` fine `SlotPosition` vocabulary. pokedraft uses the dispatch's coarser role set (GK, CB, FB, WB, DM, CM, AM, WM, W, ST).
- `formation.ts:173-180` `POSITION_COMPATIBILITY_FACTORS` by line: same line 1.00, one line off 0.75, two lines off 0.45, GK to outfield 0.15. `api/compatibility.ts:20-24` folds with MAX over eligible lines. pokedraft adapts this into a role-to-role matrix (see GATE 3 decisions).

### PokéAPI CSVs

All 11 required files returned HTTP 206 on a ranged GET from `https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/` on 2026-10-09: `pokemon`, `pokemon_species`, `pokemon_species_names`, `pokemon_stats`, `pokemon_types`, `pokemon_shapes`, `pokemon_abilities`, `ability_names`, `pokemon_moves`, `move_names`, `pokemon_evolution`.

### Reviewer availability

`ollama run glm-5.3-flash:cloud --think high` answered a probe on 2026-10-09 and echoed the probe token. Review path 1 (GLM 5.3 Flash) is available.

## Decisions

| ts | phase | decision | why | evidence | result |
|---|---|---|---|---|---|
