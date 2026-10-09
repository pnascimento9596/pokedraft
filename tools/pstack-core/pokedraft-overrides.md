# pokedraft overrides for portable pstack (v0.15.15)

These rules win over any vendored playbook or principle they contradict. Every
harness loads them through `tools/pstack-core/skills/pokedraft-mode/SKILL.md`.

## Authority

- The dispatch file is the contract and the autonomy grant. Playbook steps run
  inside the dispatch's gates. A playbook never re-scopes a dispatch outcome.
- GATE 0 recon runs before playbook step 1, always.
- A playbook step you skip stays listed as `skip: <reason>`.
- The dispatch authorizes landing on PASS and, where it says so, deploying. Do
  not pause for deploy confirmation. Pause only on the dispatch's stop list.

## Review

- The implementer never self-reviews.
- The merge receipt comes from the exact PR head SHA, from the first available
  reviewer in this order:
  1. GLM 5.3 Flash, when `ollama` is reachable and `glm-5.3-flash:cloud` runs.
     Run `ollama run glm-5.3-flash:cloud --think high` with a review packet on
     stdin. The packet holds the dispatch, `git diff origin/main...HEAD`, and
     the gate command outputs. The verdict counts only if it says APPROVE or
     REQUEST_CHANGES and echoes a random canary string placed in the packet.
  2. Otherwise a fresh `pokedraft-mode` subagent. It gets only the dispatch,
     the PR number, and the head SHA. It checks out that head in a clean clone,
     re-executes every gate command, applies the `interrogate` rubric, and
     returns PASS or FAIL with findings. A diff read alone does not qualify.
- Record which reviewer ran.
- At most 2 review rounds per head. Fix forward and re-review. After 3 fix
  rounds without PASS, stop and report.
- Any commit after PASS voids the receipt.

## Landing

- One PR per dispatch off `origin/main`.
- Squash merge with `gh pr merge <n> --squash --match-head-commit <reviewed sha>`.
- Never use `--auto`. Never force-push.
- Rebase before review, because a rebase voids receipts.
- Conventional commits.
- Stage explicit paths. Never `git add -A`, `-u`, or `.`. Never `git stash`.
- The forge is GitHub through `gh`. Do not resolve or use Origin. No Graphite.

## CI

- GitHub-hosted `ubuntu-latest` only. The repo is public, so minutes are free.
- No self-hosted runners.

## Models

- The dispatch's model runs everything. Upstream model routing and every
  `/setup-pstack` role line are void.
- Subagents use the `pokedraft-mode` agent (`.claude/agents/pokedraft-mode.md`),
  not `poteto-agent`. Subagents inherit nothing, so each brief carries its full
  scope.
- `how`, `architect`, `swarm`, `arena`, `reflect`, `deslop`, `control-ui`,
  `control-cli`, and `create-skill` are `skip: not installed`.
- Parallel fan-out uses plain subagents over disjoint files.

## Evidence

- Never fabricate a test count, measurement, review verdict, or merge or deploy
  status. Anything not run is listed as NOT RUN.
- A guard test proves RED then GREEN by sequencing. Commit the failing test
  before the fix.
- A test names the bug it catches and asserts literal expected values. It never
  builds the expected value with the code under test.
- UI claims are proven in a real browser.

## Readback

The final reply leads with the outcome. Then it gives:

- the PR URL, squash SHA, reviewed head SHA, and reviewer identity;
- gates run, with real counts;
- what changed;
- the NOT RUN list;
- risks and carryovers;
- decisions taken, citing the principles that shaped them.
