import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPackList } from "./lib.mjs";
import { checkPacks } from "./check-packs.mjs";

const PACK = {
  id: "demo",
  label: "Demo",
  style: "pixel",
  width: 8,
  height: 8,
  format: "png",
  author: "Someone",
  license: "CC0",
  source: "somewhere",
  coverage: 2,
};

describe("checkPacks", () => {
  let root = "";
  const write = (rel: string, body: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  };
  const good = (pack: object = PACK) => {
    write("public/creatures/demo/pack.json", JSON.stringify(pack));
    write("public/creatures/demo/0001.png", "x");
    write("public/creatures/demo/0025.png", "x");
    write(
      "src/data/image-packs.json",
      `${JSON.stringify(buildPackList([{ pack: PACK, ids: [1, 25] }]), null, 2)}\n`,
    );
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "check-packs-"));
    mkdirSync(path.join(root, "src/data"), { recursive: true });
    cpSync("src/data/pokedex.json", path.join(root, "src/data/pokedex.json"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("accepts a sound pack", () => {
    good();
    expect(checkPacks(root)).toEqual([]);
  });

  it("rejects a pack with an empty author, so credit can never be dropped", () => {
    good({ ...PACK, author: "  " });
    expect(checkPacks(root)).toContain(
      "public/creatures/demo/pack.json: author must be non-empty text",
    );
  });

  it("rejects a missing license, a stray file, and a coverage count that lies", () => {
    good({ ...PACK, license: "", coverage: 3 });
    write("public/creatures/demo/readme.txt", "x");
    expect(checkPacks(root)).toEqual([
      "public/creatures/demo/pack.json: license must be non-empty text",
      "public/creatures/demo/readme.txt: not a <dexId>.png file",
      "public/creatures/demo/pack.json: coverage 3 but 2 image files",
    ]);
  });

  it("rejects an image file whose id is not in the Dex", () => {
    good();
    write("public/creatures/demo/9999.png", "x");
    expect(checkPacks(root)).toContain("public/creatures/demo/9999.png: 9999 is not a Dex id");
  });

  it("rejects a hand-edited pack list", () => {
    good();
    const list = JSON.parse(readFileSync(path.join(root, "src/data/image-packs.json"), "utf8"));
    list.packs[0].covered = [[1, 2]];
    write("src/data/image-packs.json", `${JSON.stringify(list, null, 2)}\n`);
    expect(checkPacks(root)).toEqual([
      "src/data/image-packs.json does not match the pack folders; rerun the importer",
    ]);
  });

  it("passes on the real repo packs", () => {
    expect(checkPacks()).toEqual([]);
  });
});
