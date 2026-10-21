import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const VERSIONS_DIR = path.resolve(import.meta.dirname, "..");
const BLOBS_DIR = path.join(VERSIONS_DIR, "_blobs");

const EXPECTED_BLOBS = [
  "01f6314fad9c713cafeb0ef4f3dccbced1ef8297c8dba8d8aba4f95d1e0b5851",
  "5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775",
  "5f4b34e37a1fa78c1c4dafe65cc3dafce5e0532f8f982474898a7187ebe4d74d",
  "9f771c3ad5f68097321551d188f1b0071d7d53cbceb22da217ee29b9d85d4e8e",
  "acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1",
  "b9f7408470383de37d3a64150700d9d49e3287495a2bc73df6aec3ffc05028ed",
  "f41cdbd61a96bcffbe698c3f4b1d906a1411c473ef863c8931516e849072c39c",
].sort();

describe("content-addressed engine blobs (Row 8a)", () => {
  it("stores deduplicated JSON data in _blobs directory", () => {
    expect(existsSync(BLOBS_DIR)).toBe(true);
    const blobs = readdirSync(BLOBS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(blobs).toEqual(EXPECTED_BLOBS);
    for (const hash of blobs) {
      const content = readFileSync(path.join(BLOBS_DIR, `${hash}.json`));
      const actualHash = createHash("sha256").update(content).digest("hex");
      expect(actualHash).toBe(hash);
    }
  });

  it("manifests in v1 to v6 record blobs mapping and no duplicate JSON in bundle dirs", () => {
    for (const v of ["v1", "v2", "v3", "v4", "v5", "v6"]) {
      const dir = path.join(VERSIONS_DIR, v);
      const manifestPath = path.join(dir, "MANIFEST.json");
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        name: string;
        sources: Record<string, string>;
        blobs?: Record<string, string>;
      };
      expect(manifest.blobs).toBeDefined();
      expect(Object.keys(manifest.blobs ?? {}).sort()).toEqual([
        "scripts/data/move-traits.json",
        "src/data/pokedex.json",
        "src/data/scouting.json",
        "src/data/type-chart.json",
      ]);
      const versionFiles = readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map((e) => e.name);
      expect(versionFiles).toEqual(["MANIFEST.json"]);
    }
  });
});
