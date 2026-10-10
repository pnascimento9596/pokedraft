import { ImageResponse } from "next/og";
import { CARD_SIZE, Card, cardModel } from "@/components/share/card";

export const alt = "pokedraft run card";
export const size = CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const model = cardModel({ t: token });
  if (model === null) {
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
  return new ImageResponse(<Card model={model} />, size);
}
