import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { convertProb } from "../match";

// The literals are 0.93 and 0.57 as the doubles 0.75 + 0.18 and 0.75 - 0.18 round them.
describe("engine 7 shootout band (catches V7 kicks keeping engine 6's 0.1 band)", () => {
  it("a +100 edge converts at 0.93 and a -100 edge at 0.57", () => {
    expect(convertProb(100, ENGINE_COEFFICIENTS_V7)).toBe(0.9299999999999999);
    expect(convertProb(-100, ENGINE_COEFFICIENTS_V7)).toBe(0.5700000000000001);
  });

  it("an edge past 100 either way stays clamped at 0.93 and 0.57", () => {
    expect(convertProb(150, ENGINE_COEFFICIENTS_V7)).toBe(0.9299999999999999);
    expect(convertProb(-150, ENGINE_COEFFICIENTS_V7)).toBe(0.5700000000000001);
  });

  it("a +50 edge converts at 0.84", () => {
    expect(convertProb(50, ENGINE_COEFFICIENTS_V7)).toBe(0.84);
  });
});

// Regression guard, no RED: behaviour already correct.
describe("engine 6 shootout band (catches the V7 band reaching the live engine)", () => {
  it("+100 converts at 0.85, -100 at 0.65 and an even kick at 0.75", () => {
    expect(convertProb(100, ENGINE_COEFFICIENTS)).toBe(0.85);
    expect(convertProb(-100, ENGINE_COEFFICIENTS)).toBe(0.65);
    expect(convertProb(0, ENGINE_COEFFICIENTS)).toBe(0.75);
  });
});
