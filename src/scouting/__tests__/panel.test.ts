// Sanity panel. These assertions encode DESIGN INTENT for how the scouting model should
// rank species. They are not ground truth about Pokémon. When one fails, fix the model
// (coefficients, Layer 1) or the review (Layer 2), not the assertion. Changing an
// assertion takes its own commit with the reason in docs/decisions.
import { describe, expect, it } from "vitest";
import { SCOUTING, type ScoutingRecord } from "../scouting-data";
import { OUTFIELD_ROLES, ROLES, type Attr, type Role } from "../types";

const N = SCOUTING.length;
const byName = new Map(SCOUTING.map((s) => [s.name, s]));
const sp = (name: string): ScoutingRecord => {
  const s = byName.get(name);
  if (!s) throw new Error(`unknown species ${name}`);
  return s;
};

type Metric = (s: ScoutingRecord) => number;
const attr =
  (a: Attr): Metric =>
  (s) =>
    s.attrs[a];
const role =
  (r: Role): Metric =>
  (s) =>
    s.fits[r];
const outfield: Metric = (s) => Math.max(...OUTFIELD_ROLES.map((r) => s.fits[r]));
const overall: Metric = (s) => Math.max(...ROLES.map((r) => s.fits[r]));

// Top p of the population: fewer than ceil(p * N) species score strictly higher.
const inTop = (name: string, m: Metric, p: number) =>
  SCOUTING.filter((o) => m(o) > m(sp(name))).length < Math.ceil(p * N);
const inBottom = (name: string, m: Metric, p: number) =>
  SCOUTING.filter((o) => m(o) < m(sp(name))).length < Math.ceil(p * N);
const median = (m: Metric) => {
  const v = SCOUTING.map(m).sort((a, b) => a - b);
  return v[Math.floor(N / 2)]!;
};

describe("sanity panel (design intent, not ground truth)", () => {
  it("Cinderace is top 2% at ST", () => {
    expect(inTop("Cinderace", role("ST"), 0.02)).toBe(true);
  });

  it("Hitmonlee is top 10 percent at ST or W", () => {
    expect(inTop("Hitmonlee", role("ST"), 0.1) || inTop("Hitmonlee", role("W"), 0.1)).toBe(true);
  });

  // "Strong striker" for these two was set to top 20 percent at ST by the owner after the
  // measured model placed them at 17.5 and 19.6 percent. See docs/decisions/dispatch-1.md.
  it.each(["Hitmontop", "Sirfetch’d"])("%s is top 20 percent at ST", (name) => {
    expect(inTop(name, role("ST"), 0.2)).toBe(true);
  });

  it.each(["Blaziken", "Lucario", "Zeraora"])("%s is top 5% at ST or W", (name) => {
    expect(inTop(name, role("ST"), 0.05) || inTop(name, role("W"), 0.05)).toBe(true);
  });

  it("Inteleon is top 10% at ST", () => {
    expect(inTop("Inteleon", role("ST"), 0.1)).toBe(true);
  });

  it.each([
    "Snorlax",
    "Wailord",
    "Copperajah",
    "Avalugg",
    "Steelix",
    "Aggron",
    "Bastiodon",
    "Registeel",
    "Probopass",
  ])("%s favors GK or CB over W", (name) => {
    const s = sp(name);
    expect(Math.max(s.fits.GK, s.fits.CB)).toBeGreaterThan(s.fits.W);
  });

  it.each(["Magikarp", "Wishiwashi"])("%s sits in the bottom 5 percent outfield", (name) => {
    expect(inBottom(name, outfield, 0.05)).toBe(true);
  });

  it.each(["Jolteon", "Ninjask", "Regieleki"])("%s is top 1 percent PAC", (name) => {
    expect(inTop(name, attr("PAC"), 0.01)).toBe(true);
  });

  it("Zeraora is top 3% PAC", () => {
    expect(inTop("Zeraora", attr("PAC"), 0.03)).toBe(true);
  });

  it.each(["Alakazam", "Gardevoir"])("%s is top 3 percent VIS", (name) => {
    expect(inTop(name, attr("VIS"), 0.03)).toBe(true);
  });

  it.each([
    ["Pichu", "Raichu"],
    ["Scorbunny", "Cinderace"],
    ["Magikarp", "Gyarados"],
  ])("%s sits below %s in every role", (lo, hi) => {
    for (const r of ROLES) expect(sp(lo).fits[r]).toBeLessThan(sp(hi).fits[r]);
  });

  it("every species has at least one role at fit >= 25", () => {
    expect(SCOUTING.filter((s) => overall(s) < 25).map((s) => s.name)).toEqual([]);
  });

  it("Shuckle is bottom 2% PAC and Slowpoke bottom 10% PAC", () => {
    expect([
      inBottom("Shuckle", attr("PAC"), 0.02),
      inBottom("Slowpoke", attr("PAC"), 0.1),
    ]).toEqual([true, true]);
  });

  it.each(["Chansey", "Blissey"])("%s is top 2 percent STA", (name) => {
    expect(inTop(name, attr("STA"), 0.02)).toBe(true);
  });

  it("Shedinja is bottom 1% STA", () => {
    expect(inBottom("Shedinja", attr("STA"), 0.01)).toBe(true);
  });

  it("Rayquaza is top 2% AER and Dragonite top 5% AER", () => {
    expect([inTop("Rayquaza", attr("AER"), 0.02), inTop("Dragonite", attr("AER"), 0.05)]).toEqual([
      true,
      true,
    ]);
  });

  it("Tyranitar is top 3% PHY", () => {
    expect(inTop("Tyranitar", attr("PHY"), 0.03)).toBe(true);
  });

  it("Electrode is top 10% PAC but below median DRI, because a ball has no feet", () => {
    expect([
      inTop("Electrode", attr("PAC"), 0.1),
      sp("Electrode").attrs.DRI < median(attr("DRI")),
    ]).toEqual([true, true]);
  });

  it.each(["Onix", "Gyarados", "Milotic"])("limbless %s sits below median DRI", (name) => {
    expect(sp(name).attrs.DRI).toBeLessThan(median(attr("DRI")));
  });

  it("Ditto is bottom 10% overall and Mewtwo top 5% overall", () => {
    expect([inBottom("Ditto", overall, 0.1), inTop("Mewtwo", overall, 0.05)]).toEqual([true, true]);
  });

  it("Aegislash is top 10% at GK", () => {
    expect(inTop("Aegislash", role("GK"), 0.1)).toBe(true);
  });

  it("the review's first best role is among the species' three highest fits for at least 95% of species", () => {
    const agree = SCOUTING.filter((s) => {
      const third = [...ROLES].map((r) => s.fits[r]).sort((a, b) => b - a)[2]!;
      return s.fits[s.bestRoles[0]] >= third;
    }).length;
    expect(agree / N).toBeGreaterThanOrEqual(0.95);
  });
});
