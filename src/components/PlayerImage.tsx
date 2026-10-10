export interface PlayerImageProps {
  readonly dexId: number;
  readonly size: number;
  readonly alt: string;
}

// The only place a creature picture may ever render. It draws a blank neutral square today;
// inline styles keep it valid both in the DOM and in the satori PNG renderer.
export function PlayerImage({ dexId, size, alt }: PlayerImageProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      data-dex={dexId}
      data-player-image=""
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
