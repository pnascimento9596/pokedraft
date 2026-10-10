#!/usr/bin/env bash
# PlayerImage (with its pure half, PlayerPicture) is the only code allowed to picture a creature. Any <img>, next/image,
# background-image or CSS url() elsewhere under src/ fails the build.
set -euo pipefail
cd "$(dirname "$0")/.."
seams="src/components/PlayerImage.tsx src/components/PlayerPicture.tsx"
pattern='<img[[:space:]>]|from "next/image"|background-image|backgroundImage|url\('
hits=$(grep -rnE "$pattern" src --include='*.ts' --include='*.tsx' --include='*.css' || true)
for seam in $seams; do hits=$(printf '%s\n' "$hits" | grep -v "^$seam:" || true); done
hits=$(printf '%s' "$hits" | sed '/^$/d')
if [ -n "$hits" ]; then
  echo "Image seam violation. Only $seams may render creature imagery:" >&2
  echo "$hits" >&2
  exit 1
fi
echo "image seam clean"
