---
name: pokedraft-mode
description: Use for pokedraft dispatch lanes and any pokedraft engineering task. Load tools/pstack-core/pokedraft-overrides.md first. Those rules win. Then follow vendored poteto-mode.
---

# pokedraft mode

## Load order

1. Read `tools/pstack-core/pokedraft-overrides.md` in full. Those rules win over every vendored playbook and principle.
2. Read `tools/pstack-core/skills/poteto-mode/SKILL.md` in full, including its Principles index.
3. Open a leaf under `tools/pstack-core/skills/` whenever you apply a named principle or a portable skill (`unslop`, `no-comments`, `technical-writing`, `tdd`, `figure-it-out`, `show-me-your-work`, `interrogate`, `benchmark-checklist`).

Paths are repository-relative from the pokedraft root.

## Trigger overrides the portable core cannot carry

The vendored poteto-mode index names Cursor-only skills this tree does not vendor. Do not look them up outside this repository. Do not spawn Cursor `Task` model slugs.

- **how.** GATE 0 first-person recon with `file:line` cites.
- **architect.** Skip unless the dispatch names an open design fork. Write `architect skipped: dispatch fixed the design`.
- **swarm / arena.** Skip. Parallel fan-out uses plain `pokedraft-mode` subagents over disjoint files.
- **interrogate.** Follow `tools/pstack-core/skills/interrogate/SKILL.md`. The fallback reviewer applies its rubric.
- **deslop / control-ui / control-cli / create-skill / reflect.** `skip: not installed`.
- **Models / poteto-agent.** The overrides' Models section wins. Spawn the `pokedraft-mode` agent.
- **Shipping / Graphite / Origin.** Land per the overrides. Squash merge pinned to the reviewed head. `gh` only.

Then execute the matched playbook under `tools/pstack-core/skills/poteto-mode/playbooks/`.
