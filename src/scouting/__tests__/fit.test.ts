import { describe, expect, it } from "vitest";
import { COEFFICIENTS } from "../coefficients";
import { fit, roleCompat } from "../fit";
import { ROLES, type Attributes } from "../types";

const flat = (v: number) =>
  Object.fromEntries(
    [
      "PAC",
      "ACC",
      "SHO",
      "PAS",
      "VIS",
      "DRI",
      "TEC",
      "DEF",
      "TAK",
      "AER",
      "PHY",
      "STA",
      "DIV",
      "HAN",
      "REF",
      "GKP",
      "KIC",
    ].map((a) => [a, v]),
  ) as Attributes;

describe("role weights", () => {
  it("sum to 1 for every role, so no role blend is silently inflated", () => {
    for (const r of ROLES) {
      const sum = Object.values(COEFFICIENTS.roleWeights[r]).reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 1000)).toBe(1000);
    }
  });

  it("keep the keeper blend to GK attributes plus AER and PHY", () => {
    expect(Object.keys(COEFFICIENTS.roleWeights.GK).sort()).toEqual([
      "AER",
      "DIV",
      "GKP",
      "HAN",
      "KIC",
      "PHY",
      "REF",
    ]);
  });
});

describe("roleCompat", () => {
  it("is symmetric, so playing A at B costs the same as B at A", () => {
    for (const a of ROLES) for (const b of ROLES) expect(roleCompat(a, b)).toBe(roleCompat(b, a));
  });

  it("uses the adapted wcdraft ladder", () => {
    expect([
      roleCompat("CB", "CB"),
      roleCompat("CB", "FB"),
      roleCompat("CB", "CM"),
      roleCompat("CB", "ST"),
      roleCompat("GK", "CB"),
      roleCompat("FB", "WB"),
    ]).toEqual([1, 0.95, 0.85, 0.7, 0.5, 0.98]);
  });
});

describe("fit", () => {
  it("scales a flat-60 species to 60 in its natural role and 30 in goal", () => {
    expect(fit(flat(60), ["ST"], "ST")).toBe(60);
    expect(fit(flat(60), ["ST"], "GK")).toBe(30);
  });

  it("takes the best familiarity across natural roles", () => {
    expect(fit(flat(80), ["ST", "CB"], "DM")).toBe(74);
  });
});
