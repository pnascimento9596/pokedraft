import { describe, expect, it } from "vitest";
import { FORMATIONS, formationById } from "../formations";
import { FORMATION_IDS } from "../types";

const WCDRAFT_4_3_3 = [
  ["4-3-3.CDM", "4-3-3.LB"],
  ["4-3-3.CDM", "4-3-3.LCB"],
  ["4-3-3.CDM", "4-3-3.LCM"],
  ["4-3-3.CDM", "4-3-3.LW"],
  ["4-3-3.CDM", "4-3-3.RB"],
  ["4-3-3.CDM", "4-3-3.RCB"],
  ["4-3-3.CDM", "4-3-3.RCM"],
  ["4-3-3.CDM", "4-3-3.RW"],
  ["4-3-3.CDM", "4-3-3.ST"],
  ["4-3-3.GK", "4-3-3.LB"],
  ["4-3-3.GK", "4-3-3.LCB"],
  ["4-3-3.GK", "4-3-3.RB"],
  ["4-3-3.GK", "4-3-3.RCB"],
  ["4-3-3.LB", "4-3-3.LCB"],
  ["4-3-3.LB", "4-3-3.LCM"],
  ["4-3-3.LB", "4-3-3.RCM"],
  ["4-3-3.LCB", "4-3-3.LCM"],
  ["4-3-3.LCB", "4-3-3.RCB"],
  ["4-3-3.LCB", "4-3-3.RCM"],
  ["4-3-3.LCM", "4-3-3.LW"],
  ["4-3-3.LCM", "4-3-3.RB"],
  ["4-3-3.LCM", "4-3-3.RCB"],
  ["4-3-3.LCM", "4-3-3.RCM"],
  ["4-3-3.LCM", "4-3-3.RW"],
  ["4-3-3.LCM", "4-3-3.ST"],
  ["4-3-3.LW", "4-3-3.RCM"],
  ["4-3-3.LW", "4-3-3.ST"],
  ["4-3-3.RB", "4-3-3.RCB"],
  ["4-3-3.RB", "4-3-3.RCM"],
  ["4-3-3.RCB", "4-3-3.RCM"],
  ["4-3-3.RCM", "4-3-3.RW"],
  ["4-3-3.RCM", "4-3-3.ST"],
  ["4-3-3.RW", "4-3-3.ST"],
];

const WCDRAFT_3_5_2 = [
  ["3-5-2.CB", "3-5-2.CM"],
  ["3-5-2.CB", "3-5-2.GK"],
  ["3-5-2.CB", "3-5-2.LCB"],
  ["3-5-2.CB", "3-5-2.LCM"],
  ["3-5-2.CB", "3-5-2.RCB"],
  ["3-5-2.CB", "3-5-2.RCM"],
  ["3-5-2.CM", "3-5-2.LCB"],
  ["3-5-2.CM", "3-5-2.LCM"],
  ["3-5-2.CM", "3-5-2.LF"],
  ["3-5-2.CM", "3-5-2.LWB"],
  ["3-5-2.CM", "3-5-2.RCB"],
  ["3-5-2.CM", "3-5-2.RCM"],
  ["3-5-2.CM", "3-5-2.RF"],
  ["3-5-2.CM", "3-5-2.RWB"],
  ["3-5-2.GK", "3-5-2.LCB"],
  ["3-5-2.GK", "3-5-2.LWB"],
  ["3-5-2.GK", "3-5-2.RCB"],
  ["3-5-2.GK", "3-5-2.RWB"],
  ["3-5-2.LCB", "3-5-2.LCM"],
  ["3-5-2.LCB", "3-5-2.LWB"],
  ["3-5-2.LCB", "3-5-2.RCB"],
  ["3-5-2.LCB", "3-5-2.RCM"],
  ["3-5-2.LCM", "3-5-2.LF"],
  ["3-5-2.LCM", "3-5-2.LWB"],
  ["3-5-2.LCM", "3-5-2.RCB"],
  ["3-5-2.LCM", "3-5-2.RCM"],
  ["3-5-2.LCM", "3-5-2.RF"],
  ["3-5-2.LCM", "3-5-2.RWB"],
  ["3-5-2.LF", "3-5-2.RCM"],
  ["3-5-2.LF", "3-5-2.RF"],
  ["3-5-2.LWB", "3-5-2.RCM"],
  ["3-5-2.RCB", "3-5-2.RCM"],
  ["3-5-2.RCB", "3-5-2.RWB"],
  ["3-5-2.RCM", "3-5-2.RF"],
  ["3-5-2.RCM", "3-5-2.RWB"],
];

describe("formation templates", () => {
  it.each(FORMATION_IDS)("%s has 11 uniquely ided slots, one GK, distinct pitch points", (id) => {
    const f = FORMATIONS[id];
    expect(f.id).toBe(id);
    expect(f.slots).toHaveLength(11);
    expect(new Set(f.slots.map((s) => s.id)).size).toBe(11);
    expect(f.slots.every((s) => s.id === `${id}.${s.label}`)).toBe(true);
    expect(f.slots.filter((s) => s.role === "GK")).toHaveLength(1);
    expect(new Set(f.slots.map((s) => `${s.x},${s.y}`)).size).toBe(11);
  });

  it.each(FORMATION_IDS)("%s is mirror-symmetric with channel matching side of pitch", (id) => {
    const slots = FORMATIONS[id].slots;
    for (const s of slots) {
      const mirror = slots.find((m) => m.x === 100 - s.x && m.y === s.y);
      expect(mirror, `${s.id} has a mirror`).toBeDefined();
      expect(mirror!.role).toBe(s.role);
      if (s.channel === "L") expect(s.x).toBeLessThan(50);
      if (s.channel === "R") expect(s.x).toBeGreaterThan(50);
    }
  });

  it("maps wcdraft positions onto scouting roles and lines", () => {
    const roles = (id: (typeof FORMATION_IDS)[number]) =>
      FORMATIONS[id].slots.map((s) => `${s.label}:${s.role}:${s.line}`);
    expect(roles("4-2-3-1")).toEqual([
      "GK:GK:GK",
      "LB:FB:DEF",
      "LCB:CB:DEF",
      "RCB:CB:DEF",
      "RB:FB:DEF",
      "LDM:DM:MID",
      "RDM:DM:MID",
      "LAM:AM:MID",
      "CAM:AM:MID",
      "RAM:AM:MID",
      "ST:ST:ATT",
    ]);
    expect(roles("3-5-2")).toEqual([
      "GK:GK:GK",
      "LCB:CB:DEF",
      "CB:CB:DEF",
      "RCB:CB:DEF",
      "LWB:WB:DEF",
      "LCM:CM:MID",
      "CM:CM:MID",
      "RCM:CM:MID",
      "RWB:WB:DEF",
      "LF:ST:ATT",
      "RF:ST:ATT",
    ]);
    expect(roles("4-4-2").slice(5)).toEqual([
      "LM:WM:MID",
      "LCM:CM:MID",
      "RCM:CM:MID",
      "RM:WM:MID",
      "LF:ST:ATT",
      "RF:ST:ATT",
    ]);
    expect(roles("4-3-3").slice(8)).toEqual(["LW:W:ATT", "ST:ST:ATT", "RW:W:ATT"]);
  });

  it("formationById returns the template and rejects unknown ids", () => {
    expect(formationById("5-3-2").slots[1].label).toBe("LWB");
    expect(() => formationById("4-5-1")).toThrow(RangeError);
  });
});

describe("adjacency matches wcdraft's formation-adjacency golden", () => {
  it("has wcdraft's edge count per formation", () => {
    expect(
      Object.fromEntries(FORMATION_IDS.map((id) => [id, FORMATIONS[id].adjacency.length])),
    ).toEqual({
      "4-3-3": 33,
      "4-4-2": 33,
      "4-2-3-1": 35,
      "4-1-4-1": 35,
      "3-5-2": 35,
      "3-4-3": 29,
      "3-4-2-1": 35,
      "5-3-2": 35,
    });
  });

  it("4-3-3 edges equal the wcdraft fixture", () => {
    expect(FORMATIONS["4-3-3"].adjacency).toEqual(WCDRAFT_4_3_3);
  });

  it("3-5-2 edges equal the wcdraft fixture (wing-backs sit in the back line)", () => {
    expect(FORMATIONS["3-5-2"].adjacency).toEqual(WCDRAFT_3_5_2);
  });

  it("does not link the two full-backs across the back four", () => {
    const keys = FORMATIONS["4-4-2"].adjacency.map(([a, b]) => `${a} ${b}`);
    expect(keys).toContain("4-4-2.LB 4-4-2.LCB");
    expect(keys).not.toContain("4-4-2.LB 4-4-2.RB");
  });
});
