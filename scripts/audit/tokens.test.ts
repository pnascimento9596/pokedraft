import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeToken } from "@/engine/token";
import {
  GOLDEN_CUP8_TOKEN_SHA256,
  POST_SETTINGS,
  botCup8Token,
  describeRun,
  goldenCup8Token,
  sha256,
} from "./tokens.mjs";

describe("the pinned share link", () => {
  it("hashes to the golden digest of the engine tests", () => {
    expect(sha256(goldenCup8Token())).toBe(GOLDEN_CUP8_TOKEN_SHA256);
    expect(GOLDEN_CUP8_TOKEN_SHA256).toBe(
      "4061400329787171d0fdaa5f266477efe57c0d106a458c72f1605b0fb05baeb8",
    );
  });

  it("replays to the record the production page shows", () => {
    expect(describeRun(goldenCup8Token())).toEqual({ score: 593, record: "3-0-2", finish: "R16" });
  });

  it("is the engine-3 share link still stored in fixtures.json, with the same record", () => {
    const fixtures = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
    // The fixture is the deployed pd3 link; it replays through the retained v3 bundle.
    expect(fixtures.shareRun.token).toMatch(/^pd3\./);
    expect(fixtures.shareRun.tokenSha256).toBe(
      "8b62814e23eb70225707d31c2dfcb6118ce067e537d65652376487c5d6f24d54",
    );
    expect(fixtures.shareRun.expected).toEqual({ score: 593, record: "3-0-2", finish: "R16" });
    // The same draft, cut by the current engine, replays to the identical record.
    expect(describeRun(goldenCup8Token())).toEqual(fixtures.shareRun.expected);
  });
});

describe("tokens for the POST and card timings", () => {
  it("are complete cup8 drafts with the non-daily settings", () => {
    const token = botCup8Token("audit-test-1");
    const decoded = decodeToken(token);
    expect(decoded.seed).toBe("audit-test-1");
    expect(decoded.settings).toEqual(POST_SETTINGS);
    const run = describeRun(token);
    expect(run.record).toMatch(/^\d+-\d+-\d+$/);
    expect(run.score).toBeGreaterThan(0);
  });

  it("differ for different seeds and repeat for the same seed", () => {
    expect(botCup8Token("audit-test-1")).toBe(botCup8Token("audit-test-1"));
    expect(botCup8Token("audit-test-1")).not.toBe(botCup8Token("audit-test-2"));
  });
});
