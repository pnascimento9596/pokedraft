import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  artPlan,
  bottomAlign,
  buildPackList,
  dexStem,
  mapFiles,
  opaqueBounds,
  parseMapCsv,
  pixelPlan,
  toRanges,
} from "./lib.mjs";

const DEX = [
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 25, name: "Pikachu" },
  { id: 122, name: "Mr. Mime" },
  { id: 1025, name: "Pecharunt" },
];

describe("dexStem", () => {
  it("zero pads to four digits", () => {
    expect(dexStem(25)).toBe("0025");
    expect(dexStem(1025)).toBe("1025");
  });
});

describe("mapFiles", () => {
  it("maps numeric names directly, with or without padding", () => {
    const { mapped, unmatched, rejected } = mapFiles(["1.png", "0025.png"], DEX);
    expect([...mapped].map(([id, v]) => [id, v.file, v.via])).toEqual([
      [1, "1.png", "number"],
      [25, "0025.png", "number"],
    ]);
    expect(unmatched).toEqual([]);
    expect(rejected).toEqual([]);
  });

  it("maps an exact English name, case-insensitively, and nothing fuzzier", () => {
    const { mapped, unmatched } = mapFiles(
      ["pikachu.png", "Mr. Mime.webp", "pikachu-cosplay.png"],
      DEX,
    );
    expect([...mapped.keys()]).toEqual([25, 122]);
    expect(unmatched).toEqual([
      { file: "pikachu-cosplay.png", reason: "name is not an exact English species name" },
    ]);
  });

  it("reports ids outside the Dex and non-images instead of guessing", () => {
    const { mapped, unmatched } = mapFiles(["0.png", "10001.png", "notes.txt", "4.png"], DEX);
    expect([...mapped.keys()]).toEqual([4]);
    expect(unmatched.map((u) => [u.file, u.reason])).toEqual([
      ["0.png", "id 0 is not in the Dex"],
      ["10001.png", "id 10001 is not in the Dex"],
      ["notes.txt", "not an image file"],
    ]);
  });

  it("lets a CSV row win over the file name, and the CSV id must exist", () => {
    const csv = parseMapCsv("file,id\nweird-name.png,25\nghost.png,9999\n");
    const { mapped, unmatched } = mapFiles(["weird-name.png", "ghost.png", "1.png"], DEX, csv);
    expect([...mapped].map(([id, v]) => [id, v.file, v.via])).toEqual([
      [1, "1.png", "number"],
      [25, "weird-name.png", "csv"],
    ]);
    expect(unmatched).toEqual([{ file: "ghost.png", reason: "id 9999 is not in the Dex" }]);
  });

  it("rejects both files when two map to the same id", () => {
    const { mapped, rejected } = mapFiles(["25.png", "pikachu.png"], DEX);
    expect(mapped.size).toBe(0);
    expect(rejected).toEqual([
      { file: "25.png", reason: "duplicate: 25.png, pikachu.png all map to 25" },
      { file: "pikachu.png", reason: "duplicate: 25.png, pikachu.png all map to 25" },
    ]);
  });
});

describe("parseMapCsv", () => {
  it("skips the header, blanks and comments", () => {
    expect([...parseMapCsv('filename,dexId\n# note\n\na.png,1\n"b c.png",4\n')]).toEqual([
      ["a.png", 1],
      ["b c.png", 4],
    ]);
  });
  it("throws on a non-numeric id and on a repeated file", () => {
    expect(() => parseMapCsv("a.png,x")).toThrow("not a number");
    expect(() => parseMapCsv("a.png,1\na.png,2")).toThrow("twice");
  });
});

describe("toRanges and buildPackList", () => {
  it("collapses ids into inclusive ranges", () => {
    expect(toRanges([5, 1, 2, 3, 9, 3])).toEqual([
      [1, 3],
      [5, 5],
      [9, 9],
    ]);
  });
  it("lists pixel packs first and defaults to the first", () => {
    const art = { id: "a-art", style: "art" } as const;
    const pix = { id: "z-pix", style: "pixel" } as const;
    const doc = buildPackList([
      { pack: art, ids: [1, 2] },
      { pack: pix, ids: [3] },
    ]);
    expect(doc.default).toBe("z-pix");
    expect(doc.packs.map((p: { id: string }) => p.id)).toEqual(["z-pix", "a-art"]);
    expect(doc.packs[1].covered).toEqual([[1, 2]]);
  });
});

describe("opaqueBounds and plans", () => {
  it("finds the opaque box and null for an empty image", () => {
    const px = new Uint8Array(4 * 4 * 4);
    px[(1 * 4 + 2) * 4 + 3] = 255;
    px[(2 * 4 + 1) * 4 + 3] = 255;
    expect(opaqueBounds(px, 4, 4)).toEqual({ left: 1, top: 1, width: 2, height: 2 });
    expect(opaqueBounds(new Uint8Array(16), 2, 2)).toBeNull();
  });
  it("uses the biggest integer scale under the target for pixel art", () => {
    expect(pixelPlan(30, 96)).toEqual({ scale: 3, canvas: 90 });
    expect(pixelPlan(96, 96)).toEqual({ scale: 1, canvas: 96 });
    expect(pixelPlan(120, 96)).toEqual({ scale: 1, canvas: 120 });
  });
  it("keeps one shared scale for art and never upscales", () => {
    expect(artPlan(475, 256)).toEqual({ scale: 256 / 475, canvas: 256 });
    expect(artPlan(100, 256)).toEqual({ scale: 1, canvas: 100 });
  });
  it("stands the creature on the bottom edge, centered", () => {
    expect(bottomAlign(96, 40, 30)).toEqual({ left: 28, top: 66 });
  });
});

describe("import-pack on a 5-image fixture", () => {
  let work = "";
  const run = (out: string, extra: string[] = []) =>
    execFileSync(
      "node",
      [
        "scripts/images/import-pack.mjs",
        "--src",
        path.join(work, "src"),
        "--pack",
        "fixture",
        "--style",
        "pixel",
        "--label",
        "Fixture",
        "--author",
        "Test Author",
        "--license",
        "CC0 test",
        ...extra,
      ],
      { cwd: process.cwd(), env: { ...process.env, IMPORT_PACK_OUT: out }, encoding: "utf8" },
    );
  const digestTree = (root: string) => {
    const lines: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else {
          const sum = createHash("sha256").update(readFileSync(full)).digest("hex");
          lines.push(`${path.relative(root, full)} ${sum}`);
        }
      }
    };
    walk(root);
    return lines;
  };

  beforeAll(async () => {
    work = mkdtempSync(path.join(tmpdir(), "pack-fixture-"));
    mkdirSync(path.join(work, "src"));
    const sprite = (w: number, h: number, rgb: [number, number, number]) =>
      sharp({
        create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([
          {
            input: {
              create: {
                width: w,
                height: h,
                channels: 4,
                background: { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 },
              },
            },
            left: 5,
            top: 4,
          },
        ])
        .png()
        .toBuffer();
    writeFileSync(path.join(work, "src/1.png"), await sprite(10, 12, [200, 30, 30]));
    writeFileSync(path.join(work, "src/0004.png"), await sprite(6, 6, [30, 200, 30]));
    writeFileSync(path.join(work, "src/pikachu.png"), await sprite(8, 14, [230, 220, 20]));
    writeFileSync(path.join(work, "src/1025.png"), await sprite(12, 8, [120, 40, 160]));
    writeFileSync(path.join(work, "src/pikachu-cosplay.png"), await sprite(4, 4, [1, 2, 3]));
  });
  afterAll(() => rmSync(work, { recursive: true, force: true }));

  it("writes identical bytes on a second run, and reports the unmatched file", async () => {
    const outA = path.join(work, "a");
    const outB = path.join(work, "b");
    const log = run(outA);
    run(outB);
    expect(digestTree(outA)).toEqual(digestTree(outB));
    expect(log).toContain("covered 4/1025");
    expect(log).toContain("unmatched 1, rejected 0");

    const pack = JSON.parse(
      readFileSync(path.join(outA, "public/creatures/fixture/pack.json"), "utf8"),
    );
    expect(pack).toEqual({
      id: "fixture",
      label: "Fixture",
      style: "pixel",
      width: 84,
      height: 84,
      format: "png",
      author: "Test Author",
      license: "CC0 test",
      source: "src",
      coverage: 4,
    });
    expect(readdirSync(path.join(outA, "public/creatures/fixture")).sort()).toEqual([
      "0001.png",
      "0004.png",
      "0025.png",
      "1025.png",
      "pack.json",
    ]);
    const list = JSON.parse(readFileSync(path.join(outA, "src/data/image-packs.json"), "utf8"));
    expect(list.default).toBe("fixture");
    expect(list.packs[0].covered).toEqual([
      [1, 1],
      [4, 4],
      [25, 25],
      [1025, 1025],
    ]);

    // Biggest trimmed edge is 14px, so the integer scale is floor(96 / 14) = 6 and the shared canvas 84px.
    const meta = await sharp(path.join(outA, "public/creatures/fixture/0004.png")).metadata();
    expect([meta.width, meta.height]).toEqual([84, 84]);
    const { data } = await sharp(path.join(outA, "public/creatures/fixture/0004.png"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bounds = opaqueBounds(data, 84, 84);
    expect(bounds!.top + bounds!.height).toBe(84);
  });
});
