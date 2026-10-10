import { z } from "zod";
import raw from "@/data/image-packs.json";

const Range = z.tuple([z.number().int().positive(), z.number().int().positive()]);
const Text = z.string().trim().min(1);

export const PackSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/),
  label: Text,
  style: z.enum(["pixel", "art"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(["png", "webp"]),
  author: Text,
  license: Text,
  source: Text,
  coverage: z.number().int().nonnegative(),
  covered: z.array(Range),
});
export type ImagePack = z.infer<typeof PackSchema>;

const PackListSchema = z
  .object({ default: z.string(), packs: z.array(PackSchema).min(1) })
  .refine((l) => l.packs.some((p) => p.id === l.default), {
    message: "default pack is not in the list",
    path: ["default"],
  });

/** Validates the generated `image-packs.json`; throws when any pack is malformed. */
export function parsePackList(value: unknown): z.infer<typeof PackListSchema> {
  return PackListSchema.parse(value);
}

const LIST = parsePackList(raw);

export const PACKS: readonly ImagePack[] = LIST.packs;
export const DEFAULT_PACK_ID: string = LIST.default;

export function packById(id: string | null | undefined): ImagePack | null {
  return PACKS.find((p) => p.id === id) ?? null;
}

/** The prop wins, then the user's saved pack, then the default. Unknown ids are skipped. */
export function resolvePack(prop?: string | null, user?: string | null): ImagePack {
  return packById(prop) ?? packById(user) ?? packById(DEFAULT_PACK_ID)!;
}

export function hasImage(pack: ImagePack, dexId: number): boolean {
  return pack.covered.some(([from, to]) => dexId >= from && dexId <= to);
}

export function imageFile(pack: ImagePack, dexId: number): string {
  return `${String(dexId).padStart(4, "0")}.${pack.format}`;
}

export function imagePath(pack: ImagePack, dexId: number): string {
  return `/creatures/${pack.id}/${imageFile(pack, dexId)}`;
}

/**
 * Pixel art stays crisp on whole-number ratios. Pick the nearest whole step at or under the box,
 * unless that would shrink the picture below 70% of the box, then use the box size itself.
 */
export function pixelDisplaySize(canvas: number, size: number): number {
  const step =
    size >= canvas
      ? canvas * Math.floor(size / canvas)
      : Math.floor(canvas / Math.ceil(canvas / size));
  return step / size < 0.7 ? size : step;
}
