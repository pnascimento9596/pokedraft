import { describe, expect, it } from "vitest";
import type { CupResult } from "@/engine";
import { replayAnyVersion } from "@/engine/versions";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { runFingerprint } from "../fingerprint";
import { GOLDEN_CUP8_V6 } from "./fixtures";

// Each hex is sha256 of the pdfp1 preimage, derived outside this code by a Python script from the
// replay's JSON (docs/decisions/leaderboard-fingerprint.md lists both preimages).
const PD6_HEX = "65b48b2583b51d6e3121cf09ba4055e050bd75375d0b893ae784360daa78271c";
const PD3_HEX = "b3fb64d5a68dfcc25c4dc1b2d9598dd9e330c080500fca67c4da3daafbe79da3";

describe("runFingerprint (catches two identical runs stored under different fingerprints)", () => {
  it("hashes the golden pd6 run to its literal pdfp1 fingerprint", async () => {
    const { draft, cup } = await replayAnyVersion(GOLDEN_CUP8_V6);
    expect(runFingerprint(draft, cup)).toBe(PD6_HEX);
  });

  it("hashes the golden pd3 run through its retained bundle to its literal pdfp1 fingerprint", async () => {
    const { draft, cup, bundle } = await replayAnyVersion(GOLDEN_CUP8_V3);
    expect(bundle).toBe("retained-engine-bundle:v3");
    expect(runFingerprint(draft, cup)).toBe(PD3_HEX);
  });

  it("ignores shootout kicks, so penalty order cannot split one result in two", async () => {
    const { draft, cup } = await replayAnyVersion(GOLDEN_CUP8_V6);
    const noKicks: CupResult = {
      ...cup,
      matches: cup.matches.map((m) => (m.status === "played" ? { ...m, shootout: null } : m)),
    };
    expect(cup.matches.filter((m) => m.status === "played" && m.shootout !== null)).toHaveLength(1);
    expect(runFingerprint(draft, noKicks)).toBe(PD6_HEX);
  });

  it("changes when the same species sit in other slots (catches a squad hashed as a set)", async () => {
    const { draft, cup } = await replayAnyVersion(GOLDEN_CUP8_V6);
    const [a, b, ...rest] = draft.lineup.starters;
    const starters = [b, a, ...rest] as unknown as typeof draft.lineup.starters;
    const swapped = { ...draft, lineup: { ...draft.lineup, starters } };
    expect(runFingerprint(swapped, cup)).not.toBe(PD6_HEX);
  });
});
