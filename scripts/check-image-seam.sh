#!/usr/bin/env bash
# PlayerImage is the only component allowed to picture a creature. Any <img>, next/image,
# background-image or CSS url() elsewhere under src/ fails the build.
set -euo pipefail
cd "$(dirname "$0")/.."
seam="src/components/PlayerImage.tsx"
pattern='<img[[:space:]>]|from "next/image"|background-image|backgroundImage|url\('
hits=$(grep -rnE "$pattern" src --include='*.ts' --include='*.tsx' --include='*.css' | grep -v "^$seam:" || true)
if [ -n "$hits" ]; then
  echo "Image seam violation. Only $seam may render creature imagery:" >&2
  echo "$hits" >&2
  exit 1
fi
echo "image seam clean"
