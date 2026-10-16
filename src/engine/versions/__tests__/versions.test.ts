import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@/engine";
import { scriptedToken } from "@/leaderboard/server/__tests__/fixtures";
import { replayAnyVersion, retainedTokenVersions, tokenVersion } from "..";
import { RETAINED_TOKEN_VERSIONS } from "../label";
import * as v1 from "../v1";
import * as v2 from "../v2";
import * as v3 from "../v3";
import * as v4 from "../v4";
import * as v5 from "../v5";
import { fromLegacy, type LegacyCupResult, type LegacyV3CupResult } from "../legacy";
import { buildLadder as v1Ladder } from "../v1/src/engine/opponents";
import { buildLadder as v2Ladder } from "../v2/src/engine/opponents";
import { buildLadder as v3Ladder } from "../v3/src/engine/opponents";
import {
  A11Y_RUN_V1,
  GOLDEN_CUP8_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V4,
  GOLDEN_KANTO151_V1,
  GOLDEN_KANTO151_V2,
  GOLDEN_KANTO151_V4,
  GOLDEN_CUP8_V5,
  GOLDEN_KANTO151_V5,
} from "./fixtures";

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

describe("retained engine-2 bundle (catches a dispatch 6 PR 6B run replaying differently)", () => {
  it("replays the engine-2 goldens byte-identical to PR 6B", () => {
    const cup8 = v2.replay(GOLDEN_CUP8_V2);
    expect([cup8.cup.rating.score, cup8.cup.wins, cup8.cup.finish]).toEqual([593, 3, "R16"]);
    expect(sha256(GOLDEN_CUP8_V2)).toBe(
      "19d825f1e323eca01da9c3a92fd02428bfd0b7549e622a1ed6b4d34efe0f4107",
    );
    expect(sha256(JSON.stringify(cup8))).toBe(
      "20e343f8bc4ac7414f1edfc9b56901533b84a27b1ae4deba5989824a9f0b684b",
    );
    const kanto = v2.replay(GOLDEN_KANTO151_V2);
    expect([kanto.cup.rating.score, kanto.cup.wins, kanto.cup.finish]).toEqual([480, 3, "QF"]);
    expect(sha256(GOLDEN_KANTO151_V2)).toBe(
      "36035c63e7778a21d7b3a2d1c842bae057f7aacf43424b1be2ce0d965725de8e",
    );
    expect(sha256(JSON.stringify(kanto))).toBe(
      "f050e3ff1848e655cc534d6d7c78015370b7ed7d21c00fe6878c66c3744ccf47",
    );
  });

  it("routes pd2. tokens to the v2 bundle", async () => {
    const run = await replayAnyVersion(GOLDEN_CUP8_V2);
    expect([run.engine, run.bundle]).toEqual(["pokedraft-engine-2", "retained-engine-bundle:v2"]);
  });

  it("is frozen: no byte of the bundle changes", () => {
    expect(bundleDigest(path.join(import.meta.dirname, "../v2"))).toBe(
      "00c62f652808895871ea37e9306401f92ab14d38f999c4774876325783dbcd96",
    );
  });
});

describe("retained engine-3 bundle (catches a platform-overhaul run replaying differently after engine 4 moves in)", () => {
  it("replays the engine-3 golden cup8 run with its exact scores and record", () => {
    const run = v3.replay(GOLDEN_CUP8_V3);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([593, 3, "R16"]);
    expect([run.cup.wins, run.cup.draws, run.cup.losses]).toEqual([3, 0, 2]);
    expect(sha256(JSON.stringify(run))).toBe(
      "07bfee8296298a5c0d7b7878e813811548b1e8a3a74b1cfd899f0680f0d5db95",
    );
  });

  it("routes pd3. tokens to the v3 bundle, not the live engine", async () => {
    const run = await replayAnyVersion(GOLDEN_CUP8_V3);
    expect([run.engine, run.bundle, run.current]).toEqual([
      "pokedraft-engine-3",
      "retained-engine-bundle:v3",
      false,
    ]);
  });

  it("is frozen: no byte of the bundle changes", () => {
    expect(bundleDigest(path.join(import.meta.dirname, "../v3"))).toBe(
      "78d81201170bb56551c56c6486dca4ec4eca8fdd65261530b5155e2d8398f009",
    );
  });
});

describe("retained engine-4 bundle (catches a pre-save run replaying differently after engine 5 moves in)", () => {
  it("replays the engine-4 goldens byte-identical to the engine-4 live goldens at bb2fd16", () => {
    expect(sha256(GOLDEN_CUP8_V4)).toBe(
      "4061400329787171d0fdaa5f266477efe57c0d106a458c72f1605b0fb05baeb8",
    );
    const cup8 = v4.replay(GOLDEN_CUP8_V4);
    expect([cup8.cup.rating.score, cup8.cup.wins, cup8.cup.draws, cup8.cup.losses]).toEqual([
      593, 3, 0, 2,
    ]);
    expect(sha256(JSON.stringify(cup8))).toBe(
      "8520e109891a53af4b291690e21ac405c1af5471ff9a39b157918ba21264e611",
    );
    expect(sha256(GOLDEN_KANTO151_V4)).toBe(
      "9865c0f6b27c3d5d00ed6d129c2b1e7b9b49acf59e4921eeedeb71a9aa0fc6b6",
    );
    const kanto = v4.replay(GOLDEN_KANTO151_V4);
    expect([kanto.cup.rating.score, kanto.cup.wins, kanto.cup.finish]).toEqual([480, 0, "group"]);
    expect(sha256(JSON.stringify(kanto))).toBe(
      "1da7e5609fcd0c0a8d6a32f9856c0b91f4a21a584dac19b119bbffc2656cf795",
    );
  });

  it("routes pd4. tokens to the v4 bundle with no recorded saves", async () => {
    const run = await replayAnyVersion(GOLDEN_CUP8_V4);
    expect([run.engine, run.bundle, run.current]).toEqual([
      "pokedraft-engine-4",
      "retained-engine-bundle:v4",
      false,
    ]);
    expect(run.cup).toEqual(v4.replay(GOLDEN_CUP8_V4).cup);
    expect(run.cup.matches.filter((m) => "saves" in m)).toEqual([]);
  });

  it("is frozen: no byte of the bundle changes", () => {
    expect(bundleDigest(path.join(import.meta.dirname, "../v4"))).toBe(
      "dc448ff8df08e3f122b52c9ec1289c3dbdb5ff21d5535e08eb5f4e8ef21abbfb",
    );
  });
});

describe("retained engine-5 bundle (catches a pre-manager run replaying differently after engine 6 moves in)", () => {
  it("replays the engine-5 goldens byte-identical to the engine-5 live goldens at 6053928", () => {
    expect(sha256(GOLDEN_CUP8_V5)).toBe(
      "d3a15998448b19a8e7f8489363d4514de2547a1bdac4a1891524de09f3253b25",
    );
    const cup8 = v5.replay(GOLDEN_CUP8_V5);
    expect([cup8.cup.rating.score, cup8.cup.wins, cup8.cup.finish]).toEqual([593, 3, "R16"]);
    expect(sha256(JSON.stringify(cup8))).toBe(
      "d3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a",
    );
    expect(sha256(GOLDEN_KANTO151_V5)).toBe(
      "a4a679846ef8515ef6c0e2d0a001e324e080a33db0e0d0a9ff5cb4559bf50fbe",
    );
    const kanto = v5.replay(GOLDEN_KANTO151_V5);
    expect([kanto.cup.rating.score, kanto.cup.wins, kanto.cup.finish]).toEqual([480, 0, "group"]);
    expect(sha256(JSON.stringify(kanto))).toBe(
      "d4d1db9bd84cbd39eae072a86791a76864a16f96db5844c5be67df7c1ab2a95a",
    );
  });

  it("routes pd5. tokens to the v5 bundle with saves and no manager incidents", async () => {
    const run = await replayAnyVersion(GOLDEN_CUP8_V5);
    expect([run.engine, run.bundle, run.current]).toEqual([
      "pokedraft-engine-5",
      "retained-engine-bundle:v5",
      false,
    ]);
    expect(run.cup).toEqual(v5.replay(GOLDEN_CUP8_V5).cup);
    expect(run.cup.matches.filter((m) => "incidents" in m)).toEqual([]);
    expect(run.cup.matches.some((m) => m.status === "played" && (m.saves?.length ?? 0) > 0)).toBe(
      true,
    );
  });

  it("is frozen: no byte of the bundle changes", () => {
    expect(bundleDigest(path.join(import.meta.dirname, "../v5"))).toBe(
      "cd69715e61910e64474cb5efd64b888974234b6837b2ac5bc8a6aae8d0084ede",
    );
  });
});

describe("replayAnyVersion (routes a token to the engine that issued it)", () => {
  it("replays the goldens through the dispatcher: the bundle's own bytes, adapted to today's shape", async () => {
    for (const [token, bundle, ladder, engine] of [
      [GOLDEN_CUP8_V1, v1, v1Ladder, "pokedraft-engine-1"],
      [GOLDEN_KANTO151_V1, v1, v1Ladder, "pokedraft-engine-1"],
      [GOLDEN_CUP8_V2, v2, v2Ladder, "pokedraft-engine-2"],
      [GOLDEN_CUP8_V3, v3, v3Ladder, "pokedraft-engine-3"],
    ] as const) {
      const run = await replayAnyVersion(token);
      const raw = bundle.replay(token);
      expect([run.engine, run.bundle]).toEqual([engine, bundle.BUNDLE_MARKER]);
      expect(run.draft).toEqual(raw.draft);
      expect(run.cup).toEqual(
        bundle === v3
          ? fromLegacy(raw.cup as unknown as LegacyV3CupResult, ladder, 3)
          : fromLegacy(raw.cup as unknown as LegacyCupResult, ladder),
      );
    }
    // The raw replays are still the dispatch 2 goldens byte for byte.
    expect(sha256(JSON.stringify(v1.replay(GOLDEN_CUP8_V1)))).toBe(
      "13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998",
    );
    expect(sha256(JSON.stringify(v1.replay(GOLDEN_KANTO151_V1)))).toBe(
      "2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489",
    );
  });

  it("replays a real dispatch 5 era shared link as an older engine", async () => {
    const run = await replayAnyVersion(A11Y_RUN_V1);
    expect([run.engine, run.current]).toEqual(["pokedraft-engine-1", false]);
    expect([run.cup.rating.score, run.cup.wins, run.cup.draws, run.cup.losses]).toEqual([
      845, 8, 0, 0,
    ]);
  });

  it("replays a live-engine token on the live engine", async () => {
    const run = await replayAnyVersion(
      scriptedToken({ mode: "kanto151", formation: "4-4-2", order: "squadFirst" }, "live-seed"),
    );
    expect([run.engine, run.current, run.bundle]).toEqual([ENGINE_VERSION, true, null]);
  });

  it("lists the same retained versions the proxy lets through", () => {
    expect(retainedTokenVersions()).toEqual([...RETAINED_TOKEN_VERSIONS]);
  });

  it("reads the version from the pd<N>. prefix", () => {
    expect(tokenVersion(GOLDEN_CUP8_V1)).toBe(1);
    expect(tokenVersion("pd12.abc")).toBe(12);
  });

  it("returns the typed unknownVersion error for a version no engine issued", async () => {
    await expect(replayAnyVersion("pd99.W1siYyJd")).rejects.toMatchObject({
      code: "unknownVersion",
    });
    await expect(replayAnyVersion("pd0.W1siYyJd")).rejects.toMatchObject({
      code: "unknownVersion",
    });
  });

  it("returns the typed malformed error for a token with no version prefix", async () => {
    await expect(replayAnyVersion("garbage-not-a-token")).rejects.toMatchObject({
      code: "malformed",
    });
  });
});
