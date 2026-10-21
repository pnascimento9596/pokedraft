import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { loadCoefficients } from "./coeffs";

describe("--coeffs (catches calibration comparing a hand-kept copy of the engine 7 numbers)", () => {
  it("resolves v7 to the candidate module itself", () => {
    expect(loadCoefficients("v7")).toBe(ENGINE_COEFFICIENTS_V7);
    expect(loadCoefficients("v7").takers.freeKickWeight).toBe(1.5);
  });

  it("keeps the live coefficients with no flag", () => {
    expect(loadCoefficients(undefined)).toBe(ENGINE_COEFFICIENTS);
    expect(loadCoefficients(undefined).takers.freeKickWeight).toBe(1.5);
  });

  it("still deep-merges a patch file and refuses an unknown key", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "coeffs-"));
    const patch = path.join(dir, "patch.json");
    writeFileSync(patch, JSON.stringify({ manager: { autoSubEnergy: 70 } }));
    const merged = loadCoefficients(patch);
    expect(merged.manager.autoSubEnergy).toBe(70);
    expect(merged.manager.maxSubs).toBe(5);
    writeFileSync(patch, JSON.stringify({ manager: { splitManged: true } }));
    expect(() => loadCoefficients(patch)).toThrow(
      "--coeffs .manager.splitManged: unknown coefficient",
    );
  });
});
