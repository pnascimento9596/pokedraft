import { describe, expect, it } from "vitest";
import { medianOfThree, mobileMeasurement, summarizeMobile } from "./theme-metrics.mjs";

const REPORT = {
  configSettings: { formFactor: "mobile", throttlingMethod: "simulate" },
  categories: { performance: { score: 0.91 }, accessibility: { score: 1 } },
  audits: {
    "largest-contentful-paint": { numericValue: 2100 },
    "cumulative-layout-shift": { numericValue: 0.125 },
  },
};

describe("production mobile measurement integrity", () => {
  it("takes each metric's median from three runs and preserves a real zero CLS", () => {
    expect(
      summarizeMobile([
        { performance: 91, accessibility: 100, lcpMs: 2200, cls: 0 },
        { performance: 70, accessibility: 95, lcpMs: 3500, cls: 0.125 },
        { performance: 94, accessibility: 100, lcpMs: 1900, cls: 0 },
      ]),
    ).toEqual({ performance: 91, accessibility: 100, lcpMs: 2200, cls: 0 });
  });

  it("extracts mobile scores and measured values without rounding small layout shifts to zero", () => {
    expect(mobileMeasurement(REPORT)).toEqual({
      performance: 91,
      accessibility: 100,
      lcpMs: 2100,
      cls: 0.125,
    });
  });

  it.each([[], [1], [1, 2], [1, 2, 3, 4], [1, 2, NaN]].map((values) => ({ values })))(
    "rejects an incomplete or invalid run set %j",
    ({ values }) => {
      expect(() => medianOfThree(values)).toThrow("Exactly three finite measurements");
    },
  );

  it("rejects a desktop or differently throttled report", () => {
    expect(() =>
      mobileMeasurement({
        ...REPORT,
        configSettings: { formFactor: "desktop", throttlingMethod: "simulate" },
      }),
    ).toThrow("mobile preset");
    expect(() =>
      mobileMeasurement({
        ...REPORT,
        configSettings: { formFactor: "mobile", throttlingMethod: "devtools" },
      }),
    ).toThrow("mobile preset");
  });

  it("rejects a failed Lighthouse run and missing metrics instead of inventing zero", () => {
    expect(() =>
      mobileMeasurement({ ...REPORT, runtimeError: { code: "NO_FCP", message: "no paint" } }),
    ).toThrow("NO_FCP");
    expect(() =>
      mobileMeasurement({ ...REPORT, audits: { ...REPORT.audits, "cumulative-layout-shift": {} } }),
    ).toThrow("did not measure");
    expect(() =>
      mobileMeasurement({
        ...REPORT,
        categories: { ...REPORT.categories, performance: { score: null } },
      }),
    ).toThrow("did not measure");
  });
});
