import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { SpeciesId } from "@/engine";
import { cardImages } from "../card-images";
import type { CardModel } from "../card";

const HEADLINE: CardModel["headline"] = { kind: "lineup", score: null };

async function opaqueBox(pack: string, dex: number) {
  const model: CardModel = {
    formation: "4-3-3",
    starters: [dex as SpeciesId, ...Array<null>(10).fill(null)],
    headline: HEADLINE,
  };
  const uri = (await cardImages(model, pack)).get(dex)!;
  const { data, info } = await sharp(Buffer.from(uri.split(",")[1]!, "base64"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let [minX, minY, maxX, maxY] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3]! > 40) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    width: info.width,
    height: info.height,
    minY,
    maxY,
    longest: Math.max(maxX - minX + 1, maxY - minY + 1),
  };
}

describe("card pictures", () => {
  it.each([573, 630, 893, 468, 200])(
    "fills a 120 px square with Dex %i's visible pixels, standing on the bottom edge (the 96 px canvas padding made sprites look tiny)",
    async (dex) => {
      const box = await opaqueBox("pokeapi-pixel", dex);
      expect([box.width, box.height, box.maxY]).toEqual([120, 120, 119]);
      expect(box.longest).toBeGreaterThanOrEqual(92);
      expect(box.longest).toBeLessThanOrEqual(120);
    },
  );

  it("fits official artwork into the same 120 px square without distortion or clipping", async () => {
    const box = await opaqueBox("pokeapi-art", 630);
    expect([box.width, box.height]).toEqual([120, 120]);
    expect(box.longest).toBeGreaterThanOrEqual(110);
    expect(box.longest).toBeLessThanOrEqual(116);
  });
});
