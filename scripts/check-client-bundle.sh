#!/usr/bin/env bash
# Retained engine bundles are server-only. After `pnpm build`, no client chunk may hold one.
set -euo pipefail
marker='retained-engine-bundle:'
[ -d .next/static ] && [ -d .next/server ] || { echo "no build output; run pnpm build first" >&2; exit 1; }
if grep -rl "$marker" .next/static; then
  echo "a retained engine bundle shipped in the client chunks listed above" >&2
  exit 1
fi
# The marker has to survive the server build, or its absence from the client proves nothing.
if ! grep -rlq "$marker" .next/server; then
  echo "marker $marker is missing from the server build; the check cannot see the bundle" >&2
  exit 1
fi
echo "client bundle holds no retained engine bundle; server build holds $(grep -rl "$marker" .next/server | wc -l | tr -d ' ') files with it"
