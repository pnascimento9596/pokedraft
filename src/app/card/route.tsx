import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CARD_SIZE, Card, cardModel } from "@/components/share/card";
import { cardImages } from "@/components/share/card-images";
import { replayAnyVersion } from "@/engine/versions";

export async function GET(request: NextRequest): Promise<Response> {
  const q = request.nextUrl.searchParams;
  const t = q.get("t");
  const b = q.get("b");
  const source = t !== null ? { t } : b !== null ? { b } : null;
  const model = source === null ? null : cardModel(source, replayAnyVersion);
  if (model === null) {
    return new Response("Bad or missing run token.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const images = await cardImages(model, q.get("pack"));
  return new ImageResponse(
    <Card model={model} images={images} mirror={q.get("mirror") !== "0"} />,
    CARD_SIZE,
  );
}
