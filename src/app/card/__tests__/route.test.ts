import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { FORMATIONS } from "@/engine";
import { GET } from "@/app/card/route";
import { tokenImageRect } from "@/components/share/card";

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";
const PARTIAL_BUILDER =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXV1d";

async function png(url: string) {
  const res = await GET(new NextRequest(url));
  const bytes = new Uint8Array(await res.arrayBuffer());
  const view = new DataView(bytes.buffer);
  return {
    status: res.status,
    type: res.headers.get("content-type"),
    signature: [...bytes.slice(0, 8)],
    width: bytes.length > 24 ? view.getUint32(16) : null,
    height: bytes.length > 24 ? view.getUint32(20) : null,
  };
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

describe("GET /card", () => {
  it("renders a run token as a real 1200x630 PNG so Download image and the OG preview are not blank or mis-sized", async () => {
    const out = await png(`http://localhost/card?t=${FLAWLESS}`);
    expect(out).toEqual({
      status: 200,
      type: "image/png",
      signature: PNG_SIGNATURE,
      width: 1200,
      height: 630,
    });
  }, 30_000);

  it("renders an incomplete builder lineup instead of rejecting it", async () => {
    const out = await png(`http://localhost/card?b=${PARTIAL_BUILDER}`);
    expect([out.status, out.type, out.width, out.height]).toEqual([200, "image/png", 1200, 630]);
  }, 30_000);

  it("answers 400 with text for a garbage token instead of a 500 or a broken image", async () => {
    const res = await GET(new NextRequest("http://localhost/card?t=pd1.garbage"));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Bad or missing run token.");
  });

  // Pixels in a slot's picture box that differ clearly from the pitch beside it.
  async function creaturePixels(url: string, slotIndex: number): Promise<number> {
    const res = await GET(new NextRequest(url));
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i]!, data[i + 1]!, data[i + 2]!];
    };
    const r = tokenImageRect(FORMATIONS["4-3-3"].slots[slotIndex]!);
    const bg = px(r.left - 3, r.top + 26);
    let count = 0;
    for (let y = r.top; y < r.top + r.size; y++) {
      for (let x = r.left; x < r.left + r.size; x++) {
        if (px(x, y).some((c, k) => Math.abs(c - bg[k]!) > 40)) count++;
      }
    }
    return count;
  }

  it.each(["pokeapi-pixel", "pokeapi-art"])(
    "draws real creature pixels from the %s pack, not an empty square",
    async (pack) => {
      // Slot 9 holds Dex 573 in the flawless run. An empty square would leave the box at pitch colour.
      expect(
        await creaturePixels(`http://localhost/card?t=${FLAWLESS}&pack=${pack}`, 9),
      ).toBeGreaterThan(300);
    },
    30_000,
  );

  it("falls back to the default pack for an unknown pack id instead of failing", async () => {
    expect(
      await creaturePixels(`http://localhost/card?t=${FLAWLESS}&pack=nope`, 9),
    ).toBeGreaterThan(300);
  }, 30_000);
});
