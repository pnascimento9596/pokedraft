import { LEGACY_CARD } from "@/design/card-tokens";
import { ImageResponse } from "next/og";
import { CARD_SIZE, Card, runCardModel } from "@/components/share/card";
import { CARD_CACHE_CONTROL, cardImages } from "@/components/share/card-images";
import { loadRun } from "./run";

export const alt = "pokedraft run card";
export const size = CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = loadRun(token);
  if (run === null) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: LEGACY_CARD.canvas,
          color: LEGACY_CARD.ink,
          fontSize: 48,
        }}
      >
        pokedraft: broken run link
      </div>,
      { ...size, headers: { "cache-control": "public, max-age=3600" } },
    );
  }
  const model = runCardModel(run);
  return new ImageResponse(<Card model={model} images={await cardImages(model)} />, {
    ...size,
    headers: { "cache-control": CARD_CACHE_CONTROL },
  });
}
