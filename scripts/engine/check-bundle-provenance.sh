#!/usr/bin/env bash
# Proves a retained bundle is a faithful copy of the commit it was frozen from: every file's
# source hash matches MANIFEST.json at that commit, and the copy differs from its source only
# in rewritten import lines.
# Usage: scripts/engine/check-bundle-provenance.sh <bundle-name> <source-commit>
set -euo pipefail
name="$1"
commit="$2"
dir="src/engine/versions/$name"
fail=0
while IFS=$'\t' read -r rel sha; do
  actual="$(git show "$commit:$rel" | shasum -a 256 | cut -d' ' -f1)"
  if [ "$actual" != "$sha" ]; then
    echo "MISMATCH $rel: manifest $sha, $commit has $actual"
    fail=1
  fi
  if ! diff_out="$(diff <(git show "$commit:$rel") "$dir/$rel")"; then
    other="$(printf '%s\n' "$diff_out" | grep -E '^[<>]' | grep -vE '^[<>] (import|export) .* from "|^[<>] import "|^[<>] } from "' || true)"
    if [ -n "$other" ]; then
      echo "NON-IMPORT CHANGE in $rel:"
      printf '%s\n' "$other"
      fail=1
    fi
    printf '%s\n' "$diff_out" | grep -E '^[<>]' | sed "s|^|  $rel |"
  fi
done < <(node -e "const m=require('./$dir/MANIFEST.json');for(const [k,v] of Object.entries(m.sources))console.log(k+'\t'+v)")

blob_count=0
if node -e "const m=require('./$dir/MANIFEST.json');if(!m.blobs||!Object.keys(m.blobs).length)process.exit(1)" 2>/dev/null; then
  while IFS=$'\t' read -r rel sha; do
    actual="$(git show "$commit:$rel" | shasum -a 256 | cut -d' ' -f1)"
    if [ "$actual" != "$sha" ]; then
      echo "MISMATCH blob $rel: manifest $sha, $commit has $actual"
      fail=1
    fi
    blob_file="src/engine/versions/_blobs/$sha.json"
    if [ ! -f "$blob_file" ]; then
      echo "MISSING blob file $blob_file for $rel"
      fail=1
    else
      blob_sha="$(shasum -a 256 "$blob_file" | cut -d' ' -f1)"
      if [ "$blob_sha" != "$sha" ]; then
        echo "MISMATCH blob content in $blob_file: expected $sha, got $blob_sha"
        fail=1
      fi
    fi
    blob_count=$((blob_count + 1))
  done < <(node -e "const m=require('./$dir/MANIFEST.json');for(const [k,v] of Object.entries(m.blobs||{}))console.log(k+'\t'+v)")
fi

count="$(node -e "console.log(Object.keys(require('./$dir/MANIFEST.json').sources).length)")"
[ "$fail" = 0 ] && echo "provenance ok: $count sources and $blob_count blobs in $dir match $commit; only import lines differ"
exit "$fail"
