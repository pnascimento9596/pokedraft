import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RunTokenError } from "@/engine";
import { replayAnyVersion, tokenVersion } from "..";
import * as v1 from "../v1";
import { A11Y_RUN_V1, GOLDEN_CUP8_V1, GOLDEN_KANTO151_V1 } from "./fixtures";

const sha256 = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");

function bundleDigest(dir: string): string {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
    .sort();
  const h = createHash("sha256");
  for (const f of files)
    h.update(f)
      .update("\0")
      .update(readFileSync(path.join(dir, f)))
      .update("\0");
  return h.digest("hex");
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof RunTokenError) return e.code;
    throw e;
  }
  throw new Error("expected a RunTokenError");
}

describe("retained engine-1 bundle (catches an old shared link replaying differently after the live engine moves)", () => {
  it("still holds the dispatch 2 golden tokens byte for byte", () => {
    expect(sha256(GOLDEN_CUP8_V1)).toBe(
      "f3e0c9c617dcb00878b7ab31d29bcc3f6718ac19b0a713d507a911a4a0bd09a7",
    );
    expect(sha256(GOLDEN_KANTO151_V1)).toBe(
      "86a3fd6d55040d5702ae03edf6842b0b0b18ac3b159f3aff01689a034e8d249c",
    );
  });

  it("replays the cup8 golden byte-identical to dispatch 2", () => {
    const run = v1.replay(GOLDEN_CUP8_V1);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([592, 3, "R16"]);
    expect(sha256(JSON.stringify(run))).toBe(
      "13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998",
    );
  });

  it("replays the kanto151 golden byte-identical to dispatch 2", () => {
    const run = v1.replay(GOLDEN_KANTO151_V1);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([480, 3, "QF"]);
    expect(sha256(JSON.stringify(run))).toBe(
      "2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489",
    );
  });

  it("is frozen: no byte of the bundle changes", () => {
    expect(bundleDigest(path.join(import.meta.dirname, "../v1"))).toBe(
      "2cbcca39eec560ce5969e989c3e3460b39e53092cac2c7640c3d0fd9c8f8ba3a",
    );
  });
});

describe("replayAnyVersion (routes a token to the engine that issued it)", () => {
  it("replays the goldens through the dispatcher with the same bytes and labels the engine", () => {
    const cup8 = replayAnyVersion(GOLDEN_CUP8_V1);
    expect(cup8.engine).toBe("pokedraft-engine-1");
    expect(cup8.bundle).toBe("retained-engine-bundle:v1");
    expect(sha256(JSON.stringify({ draft: cup8.draft, cup: cup8.cup }))).toBe(
      "13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998",
    );
    const kanto = replayAnyVersion(GOLDEN_KANTO151_V1);
    expect(sha256(JSON.stringify({ draft: kanto.draft, cup: kanto.cup }))).toBe(
      "2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489",
    );
  });

  it("replays a real dispatch 5 era shared link", () => {
    const run = replayAnyVersion(A11Y_RUN_V1);
    expect(run.engine).toBe("pokedraft-engine-1");
    expect([run.cup.rating.score, run.cup.wins, run.cup.draws, run.cup.losses]).toEqual([
      845, 8, 0, 0,
    ]);
  });

  it("reads the version from the pd<N>. prefix", () => {
    expect(tokenVersion(GOLDEN_CUP8_V1)).toBe(1);
    expect(tokenVersion("pd12.abc")).toBe(12);
  });

  it("returns the typed unknownVersion error for a version no engine issued", () => {
    expect(errorCode(() => replayAnyVersion("pd99.W1siYyJd"))).toBe("unknownVersion");
    expect(errorCode(() => replayAnyVersion("pd0.W1siYyJd"))).toBe("unknownVersion");
  });

  it("returns the typed malformed error for a token with no version prefix", () => {
    expect(errorCode(() => replayAnyVersion("garbage-not-a-token"))).toBe("malformed");
  });
});
