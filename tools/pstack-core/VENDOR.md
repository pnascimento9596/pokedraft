# Vendored portable pstack core

Pin: [cursor/plugins](https://github.com/cursor/plugins) commit
`ccb5507cec1546dc88135c1139c811e6c59115ba`, plugin version **0.15.15**, path
`pstack`. License MIT, copyright (c) 2026 Lauren Tan. The upstream `LICENSE`
file is retained at `tools/pstack-core/LICENSE`.

These files were copied from BiotraxIQ's vendored slice
(`BiotraxIQ/tools/pstack-core` at `c6833024577edf1549ebb5ddaf005591618d8f9f`),
not fetched from upstream directly. BiotraxIQ records the upstream pin above.

## Taken (upstream bytes)

- `LICENSE`
- `skills/poteto-mode/SKILL.md` and every file under `skills/poteto-mode/playbooks/`
- every `skills/principle-*` directory
- `skills/unslop`, `skills/no-comments`, `skills/technical-writing`, `skills/tdd`,
  `skills/figure-it-out`, `skills/benchmark-checklist`
- `skills/show-me-your-work` including `scripts/log.sh` and the decision-log template
- `skills/interrogate/references/` (rubric, code-quality review, lead judgment,
  reviewer prompt)

## Local (not upstream bytes)

- `pokedraft-overrides.md`. Wins over every vendored playbook and principle.
- `skills/pokedraft-mode/SKILL.md`. Loads the overrides, then poteto-mode.
  Mirrored byte-identical at `.claude/skills/pokedraft-mode/SKILL.md`.
- `skills/interrogate/SKILL.md`. Local edit. Rubric and references stay. Cursor
  `Task` spawn, model slugs, and BiotraxIQ transport paths stay out.

## Not copied

- BiotraxIQ's `biotraxiq-overrides.md`, `skills/biotraxiq-mode`,
  `check_pstack_vendor_drift.py`, `sync_from_upstream.py`, and `manifest.json`.
- Everything BiotraxIQ already excluded from upstream: Cursor `Task` skills
  (`how`, `architect`, `swarm`, `arena`, `reflect`, `why`), `setup-pstack`,
  `automate-me`, `poteto-mode/scripts/`, `references/bugbot-triage.md`, and
  Cursor packaging. `pokedraft-overrides.md` marks these `skip: not installed`.

Upstream model routing inside the vendored `poteto-mode` bytes is voided by
`pokedraft-overrides.md` "Models", not by editing vendored files.
