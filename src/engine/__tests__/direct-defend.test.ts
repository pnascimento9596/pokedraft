import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V8 } from "../coefficients-v8";
import { loadCoefficients } from "../../../scripts/calibration/coeffs";

describe("defend against direct style edge (Row 8c)", () => {
  it("keeps engine 7 live value 0.655 for directDefendOwn in live coefficients", () => {
    expect(ENGINE_COEFFICIENTS.manager.directDefendOwn).toBe(0.655);
    expect(ENGINE_COEFFICIENTS.manager.styleEdges.direct.defend).toEqual([0.655, 0.4825]);
  });

  it("exports candidate ENGINE_COEFFICIENTS_V8 with candidate directDefendOwn", () => {
    expect(ENGINE_COEFFICIENTS_V8.manager.directDefendOwn).toBe(0.95);
    expect(ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct.defend).toEqual([0.95, 0.7]);
  });

  it("loads ENGINE_COEFFICIENTS_V8 via loadCoefficients('v8')", () => {
    expect(loadCoefficients("v8")).toBe(ENGINE_COEFFICIENTS_V8);
  });
});
