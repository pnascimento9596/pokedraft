import { describe, expect, it } from "vitest";
import { speciesById } from "@/engine";
import { getSlotSuitability } from "../suitability";

describe("getSlotSuitability", () => {
  it("rates Charmander on 4-3-3: wings recommended, CB/GK bad, midfield ok", () => {
    const charmander = speciesById(4);
    // 4-3-3: 0: GK, 1: LB, 2: LCB, 3: RCB, 4: RB, 5: CDM, 6: LCM, 7: RCM, 8: LW, 9: ST, 10: RW
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 0 })).toBe("bad"); // GK
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 2 })).toBe("bad"); // LCB
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 8 })).toBe(
      "recommended",
    ); // LW
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 10 })).toBe(
      "recommended",
    ); // RW
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 9 })).toBe("ok"); // ST
    expect(getSlotSuitability(charmander, "4-3-3", { kind: "starter", index: 6 })).toBe("ok"); // LCM
  });

  it("rates Snorlax on 4-3-3: GK and CB recommended, wingers bad", () => {
    const snorlax = speciesById(143);
    expect(getSlotSuitability(snorlax, "4-3-3", { kind: "starter", index: 0 })).toBe("recommended"); // GK
    expect(getSlotSuitability(snorlax, "4-3-3", { kind: "starter", index: 2 })).toBe("recommended"); // LCB
    expect(getSlotSuitability(snorlax, "4-3-3", { kind: "starter", index: 8 })).toBe("bad"); // LW
    expect(getSlotSuitability(snorlax, "4-3-3", { kind: "starter", index: 9 })).toBe("ok"); // ST
  });

  it("returns ok for bench slots", () => {
    const bulbasaur = speciesById(1);
    expect(getSlotSuitability(bulbasaur, "4-3-3", { kind: "bench", index: 0 })).toBe("ok");
    expect(getSlotSuitability(bulbasaur, "4-3-3", { kind: "bench", index: 4 })).toBe("ok");
  });
});
