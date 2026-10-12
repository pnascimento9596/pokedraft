import { readFileSync } from "node:fs";
import path from "node:path";
import { hasImage, imageFile, resolvePack, type ImagePack } from "@/images/packs";
import type { SpeciesId } from "@/engine";
import type { CardModel } from "./card";
import { TOKEN } from "./card-layout";

// Satori cannot fetch the site's own /creatures files on a protected preview, so the card reads
// them from disk and inlines each as a data URI. next.config.ts traces public/creatures into the
// functions that render cards. Satori also draws nothing, and says nothing, for a WebP, so every
// picture is re-encoded as a PNG here. Server only.
//
// Sprites sit inside transparent padding that differs per species, so each picture is trimmed to
// its visible pixels, scaled up, and stood on the bottom of a square CARD_PICTURE canvas. Pixel
// art scales by a whole number with the nearest-neighbour kernel so its edges stay crisp.

const CARD_PICTURE = TOKEN.image;

function readPicture(pack: ImagePack, dexId: number): Buffer | null {
  if (!hasImage(pack, dexId)) return null;
  try {
    return readFileSync(
      path.join(
        /* turbopackIgnore: true */ process.cwd(),
        "public/creatures",
        pack.id,
        imageFile(pack, dexId),
      ),
    );
  } catch {
    return null;
  }
}

const TARGET = CARD_PICTURE - 4;

async function toPng(pack: ImagePack, bytes: Buffer): Promise<Buffer | null> {
  try {
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(bytes).trim().png().toBuffer({ resolveWithObject: true });
    const pixel = pack.style === "pixel";
    const whole = Math.floor(TARGET / Math.max(info.width, info.height));
    const crisp = pixel && whole * Math.max(info.width, info.height) >= 0.8 * TARGET;
    // A pixel sprite that no whole number brings near the target is enlarged one step past it and
    // then fitted down, which stays clean where a fractional nearest-neighbour step would not.
    const step = crisp ? whole : whole + 1;
    const enlarged = pixel
      ? await sharp(data)
          .resize(info.width * step, info.height * step, { kernel: "nearest" })
          .png()
          .toBuffer()
      : data;
    const drawn = await (
      crisp ? sharp(enlarged) : sharp(enlarged).resize(TARGET, TARGET, { fit: "inside" })
    )
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = Math.floor((CARD_PICTURE - drawn.info.width) / 2);
    return await sharp(drawn.data)
      .extend({
        top: CARD_PICTURE - drawn.info.height,
        left,
        right: CARD_PICTURE - drawn.info.width - left,
        bottom: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return null;
  }
}

async function readDataUri(pack: ImagePack, dexId: number): Promise<string | null> {
  const bytes = readPicture(pack, dexId);
  const png = bytes === null ? null : await toPng(pack, bytes);
  return png === null ? null : `data:image/png;base64,${png.toString("base64")}`;
}

// Per warm instance. Both packs together are about 17 MB on disk, so the memo stays bounded.
const memo = new Map<string, Promise<string | null>>();

function dataUri(pack: ImagePack, dexId: number): Promise<string | null> {
  const key = `${pack.id}/${dexId}`;
  let uri = memo.get(key);
  if (uri === undefined) {
    uri = readDataUri(pack, dexId);
    memo.set(key, uri);
  }
  return uri;
}

// A token always draws the same card, and the URL carries the token, pack and mirror flag. Browsers
// keep it a day so a card design change reaches them; the CDN cache is per deployment, so it keeps a year.
export const CARD_CACHE_CONTROL = "public, max-age=86400, s-maxage=31536000";

/** Data URIs for every species on the card. A species without a picture maps to null. */
export async function cardImages(
  model: CardModel,
  packId?: string | null,
): Promise<ReadonlyMap<number, string | null>> {
  const pack = resolvePack(packId);
  const ids = [...new Set(model.starters.filter((id): id is SpeciesId => id !== null))];
  const uris = await Promise.all(ids.map((id) => dataUri(pack, id)));
  return new Map(ids.map((id, i) => [id, uris[i] ?? null]));
}
