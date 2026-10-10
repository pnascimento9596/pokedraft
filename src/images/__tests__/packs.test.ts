// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PACK_ID,
  PACKS,
  hasImage,
  imagePath,
  packById,
  parsePackList,
  pixelDisplaySize,
  resolvePack,
} from "../packs";
import { readSettings, writeSettings, subscribe } from "../settings";

beforeEach(() => localStorage.clear());

describe("pack list", () => {
  it("ships the pixel pack as the default, then the art pack", () => {
    expect(DEFAULT_PACK_ID).toBe("pokeapi-pixel");
    expect(PACKS.map((p) => [p.id, p.style, p.format])).toEqual([
      ["pokeapi-pixel", "pixel", "png"],
      ["pokeapi-art", "art", "webp"],
    ]);
  });

  it("rejects a pack with an empty author or license, and a default that is not listed", () => {
    const pack = {
      id: "x",
      label: "X",
      style: "pixel",
      width: 8,
      height: 8,
      format: "png",
      author: "A",
      license: "L",
      source: "S",
      coverage: 1,
      covered: [[1, 1]],
    };
    expect(parsePackList({ default: "x", packs: [pack] }).default).toBe("x");
    expect(() => parsePackList({ default: "x", packs: [{ ...pack, author: " " }] })).toThrow();
    expect(() => parsePackList({ default: "x", packs: [{ ...pack, license: "" }] })).toThrow();
    expect(() => parsePackList({ default: "nope", packs: [pack] })).toThrow();
  });
});

describe("resolvePack", () => {
  it("prefers the prop, then the user's pack, then the default", () => {
    expect(resolvePack("pokeapi-art", "pokeapi-pixel").id).toBe("pokeapi-art");
    expect(resolvePack(undefined, "pokeapi-art").id).toBe("pokeapi-art");
    expect(resolvePack(undefined, null).id).toBe("pokeapi-pixel");
  });
  it("skips an unknown pack id instead of failing", () => {
    expect(resolvePack("gone", "pokeapi-art").id).toBe("pokeapi-art");
    expect(resolvePack("gone", "also-gone").id).toBe("pokeapi-pixel");
  });
});

describe("hasImage and imagePath", () => {
  const pixel = packById("pokeapi-pixel")!;
  it("covers every Dex id from 1 to 1025 and nothing else", () => {
    expect(hasImage(pixel, 1)).toBe(true);
    expect(hasImage(pixel, 1025)).toBe(true);
    expect(hasImage(pixel, 0)).toBe(false);
    expect(hasImage(pixel, 1026)).toBe(false);
  });
  it("zero pads the id and uses the pack format", () => {
    expect(imagePath(pixel, 25)).toBe("/creatures/pokeapi-pixel/0025.png");
    expect(imagePath(packById("pokeapi-art")!, 1025)).toBe("/creatures/pokeapi-art/1025.webp");
  });
});

describe("pixelDisplaySize", () => {
  it("steps by whole numbers when that stays close to the box", () => {
    expect(pixelDisplaySize(96, 32)).toBe(32);
    expect(pixelDisplaySize(96, 36)).toBe(32);
    expect(pixelDisplaySize(96, 52)).toBe(48);
    expect(pixelDisplaySize(96, 192)).toBe(192);
    expect(pixelDisplaySize(96, 100)).toBe(96);
  });
  it("falls back to the box size when an integer step would shrink it too far", () => {
    expect(pixelDisplaySize(96, 72)).toBe(72);
  });
});

describe("image settings", () => {
  it("defaults to no chosen pack and mirroring on", () => {
    expect(readSettings()).toEqual({ pack: null, mirror: true });
  });
  it("persists a choice and notifies subscribers", () => {
    const seen = vi.fn();
    const off = subscribe(seen);
    writeSettings({ pack: "pokeapi-art" });
    writeSettings({ mirror: false });
    off();
    writeSettings({ mirror: true });
    expect(seen).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem("pokedraft:images")!)).toEqual({
      pack: "pokeapi-art",
      mirror: true,
    });
  });
  it("ignores corrupted storage and survives a storage that throws", () => {
    localStorage.setItem("pokedraft:images", "{not json");
    expect(readSettings()).toEqual({ pack: null, mirror: true });
    localStorage.setItem("pokedraft:images", JSON.stringify({ pack: 7, mirror: "yes" }));
    expect(readSettings()).toEqual({ pack: null, mirror: true });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeSettings({ pack: "pokeapi-art" })).not.toThrow();
    vi.restoreAllMocks();
  });
});
