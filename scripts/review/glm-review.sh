#!/usr/bin/env bash
# Independent merge review by GLM 5.3 Flash on the exact pushed head.
# Usage: scripts/review/glm-review.sh <dispatch.md> <gate-output.log> <out-dir>
# Exit 0 with VERDICT APPROVE, 2 with REQUEST_CHANGES, 1 when the verdict does not count.
set -euo pipefail

dispatch="$1"
gates="$2"
out="$3"
root="$(git rev-parse --show-toplevel)"
cd "$root"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "working tree has tracked changes; review needs a clean head" >&2
  exit 1
fi
git fetch -q origin
head="$(git rev-parse HEAD)"
branch="$(git rev-parse --abbrev-ref HEAD)"
remote="$(git rev-parse "origin/$branch")"
if [ "$head" != "$remote" ]; then
  echo "HEAD $head is not the pushed head $remote" >&2
  exit 1
fi

mkdir -p "$out"
umask 077
canary="CANARY-$(openssl rand -hex 12)"
packet="$out/packet-$head.txt"
reply="$out/reply-$head.txt"

data_paths=(src/data/pokedex.json src/data/scouting.json src/scouting/review)
exclude=(
  ':(exclude)src/data/*.json'
  ':(exclude)src/engine/versions/v*/src'
  ':(exclude)src/engine/versions/v*/scripts'
  ':(exclude)src/scouting/review/*.json'
  ':(exclude)pnpm-lock.yaml'
  ':(exclude)tools/pstack-core/skills/poteto-mode'
  ':(exclude)tools/pstack-core/skills/principle-*'
  ':(exclude)tools/pstack-core/skills/unslop'
  ':(exclude)tools/pstack-core/skills/no-comments'
  ':(exclude)tools/pstack-core/skills/technical-writing'
  ':(exclude)tools/pstack-core/skills/tdd'
  ':(exclude)tools/pstack-core/skills/figure-it-out'
  ':(exclude)tools/pstack-core/skills/benchmark-checklist'
  ':(exclude)tools/pstack-core/skills/show-me-your-work'
  ':(exclude)tools/pstack-core/skills/interrogate/references'
  ':(exclude)tools/pstack-core/LICENSE'
)

{
  cat <<EOF
You are the independent merge reviewer for one pull request. You did not write it.
Review the PR head $head on branch $branch against the dispatch below, which is the contract.

Check, in order:
1. Dispatch compliance: every GATE deliverable and DONE WHEN item present, or honestly reported missing.
2. Correctness of the code in the diff (data build, scouting layers, fit, tests, CI).
3. Determinism: build outputs byte-stable, no time or unseeded randomness in build paths.
4. Honesty: tests assert literal values, no fabricated counts, reports match the gate outputs.
5. Invariants: no em dashes in user-facing copy, no Pokédex flavor text shipped, coefficients in one table.

Generated data files are summarized (stat, sha256, samples) because they are too large to inline.
Vendored upstream skill files are listed in the stat only; they are byte copies.
Retained engine bundles (src/engine/versions/v*/src and /scripts) are frozen copies; the gate
outputs prove their provenance against the commit they were frozen from.

Reply format, exactly:
Line 1: VERDICT: APPROVE   or   VERDICT: REQUEST_CHANGES
Line 2: the canary string from the end of this packet, verbatim.
Then findings, one per line, each prefixed BLOCKER, WARNING, or NIT, with a file path.
REQUEST_CHANGES only for BLOCKER findings.

===== DISPATCH =====
EOF
  cat "$dispatch"
  echo
  echo "===== DIFF STAT (origin/main...HEAD) ====="
  git diff --stat=160 origin/main...HEAD
  echo
  echo "===== DATA ARTIFACTS (summarized) ====="
  for p in "${data_paths[@]}"; do
    find "$p" -type f -name '*.json' | sort | while read -r f; do
      printf '%s  lines=%s  sha256=%s\n' "$f" "$(wc -l < "$f" | tr -d ' ')" "$(shasum -a 256 "$f" | cut -d' ' -f1)"
    done
  done
  echo
  echo "--- sample: pokedex.json lines 2, 7, 130, 816 ---"
  sed -n '2p;7p;130p;816p' src/data/pokedex.json
  echo
  echo "--- sample: scouting.json lines 7, 107, 130, 816, 923 ---"
  sed -n '7p;107p;130p;816p;923p' src/data/scouting.json
  echo
  echo "--- sample: one review entry per generation (first entry) ---"
  for g in 1 2 3 4 5 6 7 8 9; do
    node -e "const f=require('./src/scouting/review/gen-$g.json');console.log(JSON.stringify(f.entries[0]))"
  done
  echo
  echo "===== DIFF (origin/main...HEAD, data and vendored files excluded) ====="
  git diff origin/main...HEAD -- . "${exclude[@]}"
  echo
  echo "===== GATE OUTPUTS ====="
  cat "$gates"
  echo
  echo "===== CANARY ====="
  echo "$canary"
} > "$packet"

echo "packet $packet ($(wc -c < "$packet" | tr -d ' ') bytes) for head $head"
ollama run glm-5.3-flash:cloud --think high < "$packet" > "$reply" 2>&1 || true
clean="$(sed -e 's/\x1b\[[0-9;?]*[a-zA-Z]//g' "$reply")"
answer="$(printf '%s\n' "$clean" | awk 'found{print} /\.\.\.done thinking\./{found=1}')"
[ -z "$answer" ] && answer="$clean"
printf '%s\n' "$answer" > "$out/answer-$head.txt"

if ! printf '%s\n' "$answer" | grep -qF "$canary"; then
  echo "verdict does not count: canary not echoed" >&2
  exit 1
fi
if printf '%s\n' "$answer" | grep -qE '^VERDICT: APPROVE'; then
  echo "VERDICT: APPROVE head=$head canary=ok"
  exit 0
fi
if printf '%s\n' "$answer" | grep -qE '^VERDICT: REQUEST_CHANGES'; then
  echo "VERDICT: REQUEST_CHANGES head=$head canary=ok"
  exit 2
fi
echo "verdict does not count: no VERDICT line" >&2
exit 1
