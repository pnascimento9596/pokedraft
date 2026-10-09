#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
status=0
if ! cmp -s CLAUDE.md AGENTS.md; then
  echo "CLAUDE.md and AGENTS.md differ" >&2
  status=1
fi
if ! cmp -s tools/pstack-core/skills/pokedraft-mode/SKILL.md .claude/skills/pokedraft-mode/SKILL.md; then
  echo "pokedraft-mode SKILL.md copies differ" >&2
  status=1
fi
[ "$status" -eq 0 ] && echo "mirrors identical"
exit "$status"
