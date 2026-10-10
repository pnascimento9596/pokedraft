import { readFileSync } from "node:fs";
import path from "node:path";
import { hasImage, imageFile, resolvePack, type ImagePack } from "@/images/packs";
import type { SpeciesId } from "@/engine";
import type { CardModel } from "./card";

// Satori cannot fetch the site's own /creatures files on a protected preview, so the card reads
// them from disk and inlines each as a data URI. next.config.ts traces public/creatures into the
// functions that render cards. Satori also draws nothing, and says nothing, for a WebP, so WebP
// packs are re-encoded as small PNGs here. Server only.

const CARD_PICTURE = 104; // twice the 52px token, so the card stays sharp

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

async function toPng(pack: ImagePack, bytes: Buffer): Promise<Buffer | null> {
  if (pack.format === "png") return bytes;
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(bytes)
      .resize(CARD_PICTURE, CARD_PICTURE, { fit: "inside" })
      .png()
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

// A token always draws the same card, and the URL carries the token, pack and mirror flag.
export const CARD_CACHE_CONTROL = "public, max-age=31536000, immutable";

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
