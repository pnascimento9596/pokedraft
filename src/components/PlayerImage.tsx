"use client";

import { useState } from "react";
import { hasImage, imagePath, resolvePack } from "@/images/packs";
import { readSettings, useImageSettings } from "@/images/settings";
import { Blank, Picture, drawnSize } from "./PlayerPicture";

// The player's picture. It follows the pack the player chose (settings), so it needs React state
// and lives in client trees. `StaticPlayerImage` in PlayerPicture.tsx is the hook-free twin.

export interface PlayerImageProps {
  readonly dexId: number;
  readonly size: number;
  readonly alt: string;
  /** Pack id. Without it the player's pack is used, then the default pack. */
  readonly pack?: string;
  /** Skip lazy loading. The wheel and the export need their pictures at once. */
  readonly eager?: boolean;
}

export function PlayerImage({ dexId, size, alt, pack, eager }: PlayerImageProps) {
  const chosen = resolvePack(pack, useImageSettings().pack);
  const [failed, setFailed] = useState<string | null>(null);
  if (!hasImage(chosen, dexId))
    return <Blank dexId={dexId} size={size} alt={alt} reason="missing" />;
  const src = imagePath(chosen, dexId);
  if (failed === src) return <Blank dexId={dexId} size={size} alt={alt} reason="error" />;
  return (
    <Picture
      dexId={dexId}
      size={size}
      alt={alt}
      src={src}
      drawn={drawnSize(chosen, size)}
      pixelated={chosen.style === "pixel"}
      eager={eager}
      onError={() => setFailed(src)}
    />
  );
}

/**
 * Starts loading and decoding the pictures for these ids so a spin never lands on one that has
 * not arrived. Resolves when they are ready (or failed). Browsers without `decode` resolve at once.
 */
export function preloadCreatures(dexIds: readonly number[], pack?: string): Promise<void> {
  if (typeof Image === "undefined" || !("decode" in Image.prototype)) return Promise.resolve();
  const chosen = resolvePack(pack, readSettings().pack);
  const jobs = [...new Set(dexIds)]
    .filter((id) => hasImage(chosen, id))
    .map((id) => {
      const img = new Image();
      img.decoding = "async";
      img.src = imagePath(chosen, id);
      return img.decode().catch(() => undefined);
    });
  return Promise.all(jobs).then(() => undefined);
}
