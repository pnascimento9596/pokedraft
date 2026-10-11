import { readFile } from "node:fs/promises";
import { join } from "node:path";

const WEIGHTS = [400, 600, 700] as const;
const fonts = Promise.all(
  WEIGHTS.map(async (weight) => {
    const bytes = await readFile(join(process.cwd(), `src/design/fonts/Inter-${weight}.ttf`));
    return {
      name: "Inter",
      data: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
      weight,
      style: "normal" as const,
    };
  }),
);

export async function cardFonts() {
  return fonts;
}
