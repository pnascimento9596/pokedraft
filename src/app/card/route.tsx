import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CARD_SIZE, Card, cardModel } from "@/components/share/card";
import { cardImages } from "@/components/share/card-images";

export async function GET(request: NextRequest): Promise<Response> {
  const q = request.nextUrl.searchParams;
  const t = q.get("t");
  const b = q.get("b");
  const model = t !== null ? cardModel({ t }) : b !== null ? cardModel({ b }) : null;
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
