import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CARD_SIZE, Card, cardModel } from "@/components/share/card";

export function GET(request: NextRequest): Response {
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
  return new ImageResponse(<Card model={model} />, CARD_SIZE);
}
