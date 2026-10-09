# Dispatch 1. Foundation and scouting

Prereq: none. Paste everything below into a fresh Claude Code session (Opus 5.5) opened in an empty working folder.

---

You are the lane owner for dispatch 1 of `pokedraft`. It's a private, non-commercial fan web game for one friend group. Players draft Pokémon into a soccer formation, get a Team Score, and play a cup. This dispatch builds the repository, the engineering workflow, CI, the Pokédex data, and the soccer scouting ratings for all 1,025 species. The scouting ratings are the most important input to the whole game. Treat them as the core deliverable.

## Authority (full-autonomy grant)

This dispatch is your authorization to create the GitHub repo `pnascimento9596/pokedraft` (public), create branches, commit, push, open PRs, run the review, and squash-merge on PASS. You don't need to ask before any of that. Stop and report only on these:
- Credential exposure.
- Force-push to `main`.
- Deleting anything outside this repo.
- New paid spend.
- An OAuth or sign-in prompt that only the human can complete. If you hit one, say exactly what to click and wait.

Every other fork is yours to decide. Record each decision in the decision log.

## GATE 0. Recon (read-only, before any write)

1. Shallow-clone `pnascimento9596/wcdraft` and `pnascimento9596/BiotraxIQ` into a scratch directory outside the new repo. BiotraxIQ is private and `gh` has access.
2. Read `wcdraft/CLAUDE.md`. Then read `BiotraxIQ/tools/pstack-core/VENDOR.md`, `BiotraxIQ/tools/pstack-core/biotraxiq-overrides.md`, `BiotraxIQ/tools/pstack-core/skills/biotraxiq-mode/SKILL.md`, and `BiotraxIQ/tools/pstack-core/skills/poteto-mode/SKILL.md`. Also read the poteto-mode playbooks `feature.md`, `opening-a-pr.md` and `autonomous-run.md`.
3. Read `wcdraft/packages/core/src/rng.ts` and `wcdraft/packages/core/src/types/formation.ts`.
4. Confirm the PokéAPI CSVs resolve from `https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/`. You need `pokemon.csv`, `pokemon_species.csv`, `pokemon_species_names.csv`, `pokemon_stats.csv`, `pokemon_types.csv`, `pokemon_shapes.csv`, `pokemon_abilities.csv`, `ability_names.csv`, `pokemon_moves.csv`, `move_names.csv` and `pokemon_evolution.csv`.

Write the recon findings into `docs/decisions/dispatch-1.md` (file:line cites for anything you'll rely on).

## GATE 1. Repo and workflow bootstrap

Create the repo and work on branch `feat/foundation`.

**Stack.** Use Next.js (latest stable, App Router, TypeScript strict, `src/` dir) with pnpm, Vitest, ESLint and Prettier. It's a single app: no monorepo and no Turborepo.

**Workflow files.** Port the wcdraft and BiotraxIQ discipline in a lighter form:
- `tools/pstack-core/`. Copy the upstream-vendored files from BiotraxIQ: `LICENSE`, `skills/poteto-mode/` (with playbooks), every `skills/principle-*`, `unslop`, `no-comments`, `technical-writing`, `tdd`, `figure-it-out`, `benchmark-checklist`, `show-me-your-work`, and `interrogate`. Do NOT copy `biotraxiq-overrides.md`, `skills/biotraxiq-mode`, the drift checker or `manifest.json`. Rewrite `VENDOR.md` to name the upstream pin and say it was copied from BiotraxIQ's vendored slice.
- `tools/pstack-core/pokedraft-overrides.md`. Its rules win over every vendored playbook:
  - **Authority.** The dispatch file is the contract and the autonomy grant. GATE 0 runs before playbook step 1. A skipped playbook step is listed as `skip: <reason>`. The dispatch authorizes landing on PASS and, where it says so, deploying. Don't pause for deploy confirmation. Pause only on the stop list in the dispatch.
  - **Review.** The implementer never self-reviews. The merge receipt comes from the exact PR head SHA, in this order:
    1. If `ollama` is reachable and `glm-5.3-flash:cloud` runs, use GLM 5.3 Flash as the reviewer. Run `ollama run glm-5.3-flash:cloud --think high` with a review packet on stdin. The packet holds the dispatch, `git diff origin/main...HEAD`, and the gate command outputs. The verdict counts only if it says APPROVE or REQUEST_CHANGES and echoes a random canary string you put in the packet.
    2. Otherwise use a fresh `pokedraft-mode` subagent. It gets only the dispatch, the PR number and the head SHA. It checks out that head in a clean clone, re-executes every gate command, applies the `interrogate` rubric, and returns PASS or FAIL with findings. A diff read alone does not qualify.
    Record which reviewer ran. Use at most 2 review rounds per head; fix-forward and re-review. After 3 fix rounds without PASS, stop and report. Any commit after PASS voids the receipt.
  - **Landing.** One PR per dispatch off `origin/main`. Squash merge with `gh pr merge <n> --squash --match-head-commit <reviewed sha>`. Never use `--auto` and never force-push. Rebase before review, because a rebase voids receipts. Use conventional commits. Stage with explicit paths; never `git add -A`, `-u` or `.`. Never `git stash`.
  - **CI.** Use GitHub-hosted `ubuntu-latest` only. The repo is public, so minutes are free. Don't use self-hosted runners.
  - **Models.** The dispatch's model runs everything. Subagents use the `pokedraft-mode` agent. Cursor-only skills (`how`, `architect`, `swarm`, `arena`, `reflect`, `deslop`, `control-ui`, `control-cli`, `create-skill`) are `skip: not installed`. Parallel fan-out uses plain subagents over disjoint files.
  - **Evidence.**
    - Never fabricate a test count, measurement, review verdict, or merge/deploy status. Anything not run is listed as NOT RUN.
    - A guard test proves RED then GREEN by sequencing: commit the failing test before the fix.
    - A test names the bug it catches and asserts literal expected values. It never builds the expected value with the code under test.
    - UI claims are proven in a real browser.
  - **Readback.** The final reply leads with the outcome. Then it gives:
    - the PR URL, squash SHA, reviewed head SHA, and reviewer identity;
    - gates run, with real counts;
    - what changed;
    - the NOT RUN list;
    - risks and carryovers;
    - decisions taken, citing the principles that shaped them.
- `tools/pstack-core/skills/pokedraft-mode/SKILL.md`. Load order: (1) `pokedraft-overrides.md` in full, (2) `poteto-mode/SKILL.md` in full, (3) leaf skills as applied. Mirror it byte-identical to `.claude/skills/pokedraft-mode/SKILL.md`.
- `.claude/agents/pokedraft-mode.md`. A subagent definition that reads the skill above first, `model: inherit`.
- `CLAUDE.md` and a byte-identical `AGENTS.md`, under 120 lines. Include:
  - the stack and the layout;
  - a `Merge = ship` banner, for once Vercel is linked;
  - the pointer to `pokedraft-mode`;
  - risk tiers adapted from wcdraft. Engine/data/scouting/leaderboard/deploy are Red: reviewer re-executes gates. UI is Yellow: same reviewer flow, but lighter scope.
  - the validation ladder (narrowest first, then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`);
  - the honesty rules;
  - the standing invariants: determinism, golden tests for any engine or data change, and "PlayerImage is the only image seam";
  - the final report format.
- `STATE.md`. Measured ground truth, updated in the same PR as every merge.
- `.github/workflows/ci.yml`. Runs on PR and main: install, lint, typecheck, test, build, plus a check that `CLAUDE.md` equals `AGENTS.md` and that the two `pokedraft-mode` skill copies are identical.

From GATE 2 on, work under `pokedraft-mode`. Open the todo list with the Feature playbook steps verbatim and keep the decision log via `show-me-your-work` at `docs/decisions/dispatch-1.md`.

## GATE 2. Pokédex data (deterministic build lever)

Write `scripts/data/build-pokedex.mjs`. It fetches the CSVs, caches them under `scripts/data/.cache/` (gitignored), and writes `src/data/pokedex.json`. Keep species 1..1025, default form only (`pokemon.is_default=1`).

Fields per species:
- id, name (English), genus (English);
- gen, region;
- types[1..2];
- hp, atk, def, spa, spd, spe;
- heightDm, weightHg;
- shape (identifier);
- abilities[] (English names, flag the hidden one);
- legendary, mythical, isBaby;
- evoChainId and evoStage (1, 2 or 3, from `evolves_from_species_id` depth);
- kickMoves[], from a committed curated list in `scripts/data/move-traits.json` mapping move identifiers to soccer traits. Seed the list with kicking moves (`double-kick`, `jump-kick`, `high-jump-kick`, `rolling-kick`, `low-kick`, `blaze-kick`, `triple-kick`, `trop-kick`, `pyro-ball`, `thunderous-kick`, `axe-kick`, `triple-axel`) and reflex or protection moves (`protect`, `detect`, `quick-guard`, `wide-guard`, `kings-shield`, `spiky-shield`, `baneful-bunker`). Add any others you can justify, with the reason in the file.

Determinism: re-running the script on the cached CSVs produces byte-identical JSON. Pokédex flavor text is not ingested and nothing from it ships.

Tests:
- 1,025 entries;
- gen counts exactly 151, 100, 135, 107, 156, 72, 88, 96, 120;
- no missing stats;
- Mewtwo legendary, Mew mythical, Pichu baby;
- Cinderace knows `pyro-ball`;
- Magikarp's shape is `fish`.

## GATE 3. Soccer scouting model (the core deliverable)

The goal is an honest, defensible soccer profile for every species. It's built from game data plus reasoned judgment, and it's reproducible.

**Layer 1. Deterministic attribute baseline** (`src/scouting/attributes.ts`, pure). Map each species to soccer attributes on 1..99:
- Outfield: PAC, ACC, SHO, PAS, VIS, DRI, TEC, DEF, TAK, AER, PHY, STA.
- Goalkeeping: DIV, HAN, REF, GKP (positioning), KIC.

Inputs and what they feed:
- Percentile-normalized base stats. Spe feeds pace. Atk and SpA feed shooting power and technique. SpA feeds passing and vision. Def and SpD feed defending. HP feeds stamina.
- Height and weight. These feed aerial ability, physicality, and an agility penalty for extreme weight.
- Shape. `upright`, `humanoid` and `legs` kick naturally. `arms` suits goalkeeping. `fish`, `ball`, `blob` and `squiggle` take footwork penalties. `wings` and `bug-wings` feed aerial ability.
- Abilities. Commit a curated `src/scouting/ability-traits.json`, e.g. Speed Boost and Quick Feet for pace, Huge Power for shot power, Intimidate for tackling, Levitate for aerial ability, Sturdy for the keeper, Compound Eyes and Keen Eye for vision. Give one line of reasoning per entry.
- Kick and reflex moves.
- Type. Small, capped nudges only.

Every coefficient lives in one typed table. No magic numbers in logic.

**Layer 2. Per-species scouting review.** Fan out 9 subagents, one per generation, each writing only `src/scouting/review/gen-<n>.json`. Each subagent gets:
- the Layer 1 baseline for its generation;
- the species fields;
- this rubric.

For every species in its generation, the subagent reasons about how that creature would actually play soccer: body plan, size, speed, limbs, temperament from genus and abilities, signature fighting style, and well-known franchise identity. It outputs:
- `adjustments` for at most 6 attributes, each bounded to ±12;
- `bestRoles` (top 3 of GK, CB, FB, WB, DM, CM, AM, WM, W, ST);
- `worstRoles` (2);
- `strengths` and `weaknesses` (2 to 4 each, from a closed tag vocabulary you define in `src/scouting/tags.ts`);
- `rationale` (one or two sentences that cite the specific fields that drove the call).

No invented facts. If the data doesn't support a call, make no adjustment. The schema is validated by Zod. Every species appears exactly once across the 9 files.

**Layer 3. Role fit** (`src/scouting/fit.ts`). `fit(species, role)` returns 0..100 from a weighted attribute blend per role (keepers use only the GK attributes plus AER and PHY). Out-of-position play uses a compatibility matrix adapted from wcdraft's compatibility idea. Precompute a `src/data/scouting.json` artifact holding final attributes, fit per role, tags, and rationale. A build script regenerates it deterministically from layers 1 and 2.

**Sanity panel** (`src/scouting/__tests__/panel.test.ts`). These are 30+ ordering assertions that encode design intent. Label them as intent, not ground truth. Examples:
- Cinderace is top 2% at ST.
- Hitmonlee, Hitmontop and Sirfetch'd rate as strong strikers or wingers.
- Snorlax, Wailord-class bodies and Steel walls favor GK or CB over W.
- Magikarp and Wishiwashi-Solo sit in the bottom 5% outfield.
- Jolteon, Ninjask and Regieleki are top 1% PAC.
- Alakazam and Gardevoir-class rate high VIS.
- Pichu sits below Raichu everywhere.
- Every species has at least one role at fit ≥ 25.

If an assertion fails, fix the model or the review, not the assertion. If you conclude an assertion is wrong, change it in a separate commit with the reason in the decision log.

**Spot audit.** A fresh reviewer subagent samples 60 random species plus the 20 highest and 20 lowest by overall fit. It reads their rationale against the data and writes `docs/reports/scouting-audit.md` with agree or disagree verdicts. Every disagreement is resolved or logged before the PR opens.

**Distribution report** (`docs/reports/scouting-distribution.md`): histograms per role, the top 10 per role, and the adjustment magnitude distribution per gen, so no generation was reviewed harsher than another. Report the measured numbers.

## GATE 4. Tests, review, land

Run the targeted tests, then the full ladder. Open the PR per `opening-a-pr.md`, using `gh` and no Origin. Get the independent review receipt, fix-forward, and squash-merge pinned to the reviewed SHA. Update `STATE.md` in the PR: species count, scouting artifact hash, panel pass count, reviewer identity.

## DONE WHEN

- `main` contains the repo, the workflow files, CI green, `pokedex.json`, `scouting.json`, the 9 review files, and both reports.
- The panel passes and the audit disagreements are resolved.
- The readback follows the overrides' format.

No em dashes in any user-facing copy. Do not copy code, CSS, data or images from all22pokemon.com.
