import type { CSSProperties } from "react";
import { pixelDisplaySize, type ImagePack } from "@/images/packs";

// The pure half of the creature picture seam: no hooks and no browser APIs, so server code can
// render it (the satori PNG card) as well as client code. `PlayerImage.tsx` adds the player's
// pack choice on top. scripts/check-image-seam.sh allows creature imagery only in these two files.

type FallbackReason = "missing" | "error";

export function Blank({
  dexId,
  size,
  alt,
  reason,
}: {
  dexId: number;
  size: number;
  alt: string;
  reason: FallbackReason;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      data-dex={dexId}
      data-player-image=""
      data-testid="player-image"
      data-fallback={reason}
      style={{
        display: "flex",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.max(2, Math.round(size / 8)),
        border: "1px solid rgba(128, 140, 132, 0.55)",
        background: "rgba(128, 140, 132, 0.16)",
      }}
    />
  );
}

export interface PictureProps {
  readonly dexId: number;
  readonly size: number;
  readonly alt: string;
  readonly src: string;
  readonly drawn: number;
  readonly pixelated: boolean;
  readonly eager?: boolean;
  readonly mirror?: boolean;
  readonly onError?: () => void;
}

// Pure, so satori can call it directly. The wrapper keeps the box at `size` whatever the
// picture's own square is, and stands the picture on the bottom edge.
export function Picture({
  dexId,
  size,
  alt,
  src,
  drawn,
  pixelated,
  eager,
  mirror,
  onError,
}: PictureProps) {
  const style: CSSProperties = {
    width: drawn,
    height: drawn,
    ...(pixelated ? { imageRendering: "pixelated" } : null),
    ...(mirror ? { transform: "scaleX(-1)" } : null),
  };
  return (
    <div
      data-dex={dexId}
      data-player-image=""
      data-testid="player-image"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the pixels are already sized by the importer */}
      <img
        src={src}
        alt={alt}
        width={drawn}
        height={drawn}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        style={style}
        onError={onError}
      />
    </div>
  );
}

export function drawnSize(pack: ImagePack, size: number): number {
  return pack.style === "pixel" ? pixelDisplaySize(pack.width, size) : size;
}

export interface StaticPlayerImageProps {
  readonly dexId: number;
  readonly size: number;
  readonly alt: string;
  /** A data URI (or URL) for the picture, or null for the blank square. */
  readonly src: string | null;
  /** Flip left to right (right-half tokens face the center). */
  readonly mirror?: boolean;
}

export function StaticPlayerImage({ dexId, size, alt, src, mirror }: StaticPlayerImageProps) {
  if (src === null) return <Blank dexId={dexId} size={size} alt={alt} reason="missing" />;
  return (
    <Picture
      dexId={dexId}
      size={size}
      alt={alt}
      src={src}
      drawn={size}
      pixelated={false}
      eager
      mirror={mirror}
    />
  );
}
