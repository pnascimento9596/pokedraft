"use client";

import { resolvePack } from "@/images/packs";
import { useImageSettings } from "@/images/settings";

// Credit for the creature art in use, straight from the active pack's pack.json.
export function PackCredit() {
  const pack = resolvePack(null, useImageSettings().pack);
  return (
    <p data-testid="pack-credit">
      Creature art, {pack.label} pack: {pack.author}. License: {pack.license}.
    </p>
  );
}
