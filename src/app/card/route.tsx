import { cardFonts } from "@/components/share/card-fonts";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CARD_SIZE, Card, cardModel } from "@/components/share/card";
import { CARD_CACHE_CONTROL, cardImages } from "@/components/share/card-images";
import { canonicalCardQuery } from "@/components/share/card-query";
import { replayAnyVersion } from "@/engine/versions";

export async function GET(request: NextRequest): Promise<Response> {
  const q = request.nextUrl.searchParams;
  const canonical = canonicalCardQuery(q);
  if (canonical === null) {
    return new Response("Bad or missing run token.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (request.nextUrl.search !== `?${canonical}`) {
    return new Response(null, {
      status: 308,
      headers: { location: `/card?${canonical}`, "cache-control": CARD_CACHE_CONTROL },
    });
  }
  const t = q.get("t");
  const source = t ? { t } : { b: q.get("b")! };
  const model = await cardModel(source, replayAnyVersion);
  if (model === null) {
    return new Response("Bad or missing run token.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const images = await cardImages(model, q.get("pack"));
  return new ImageResponse(
    <Card model={model} images={images} mirror={q.get("mirror") !== "0"} />,
    { ...CARD_SIZE, fonts: await cardFonts(), headers: { "cache-control": CARD_CACHE_CONTROL } },
  );
}
