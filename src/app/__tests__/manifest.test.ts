import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../manifest";

function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(path.resolve(import.meta.dirname, "../../..", file));
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("web app manifest (catches a home screen install with no app icon or a browser bar)", () => {
  it("manifest has standalone and icons 192, 512, maskable", () => {
    expect(manifest()).toEqual({
      name: "pokedraft",
      short_name: "pokedraft",
      description: "Draft Pokémon into a soccer formation and play a cup.",
      start_url: "/",
      display: "standalone",
      background_color: "#0B1220",
      theme_color: "#0B1220",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });
  });

  it("every manifest icon is a PNG of its stated size, and the apple icon is 180 (catches a missing or misnamed icon file)", () => {
    expect(pngSize("public/icons/icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("public/icons/icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("public/icons/icon-maskable-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("src/app/apple-icon.png")).toEqual({ width: 180, height: 180 });
  });
});
