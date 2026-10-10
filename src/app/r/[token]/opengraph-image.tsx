import { ImageResponse } from "next/og";
import { CARD_SIZE, Card, runCardModel } from "@/components/share/card";
import { cardImages } from "@/components/share/card-images";
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
          background: "#08130e",
          color: "#eef6f0",
          fontSize: 48,
        }}
      >
        pokedraft: broken run link
      </div>,
      size,
    );
  }
  const model = runCardModel(run);
  return new ImageResponse(<Card model={model} images={await cardImages(model)} />, size);
}
