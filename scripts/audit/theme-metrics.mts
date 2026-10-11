export interface MobileMeasurement {
  performance: number;
  accessibility: number;
  lcpMs: number;
  cls: number;
}

interface LighthouseReport {
  runtimeError?: { code: string; message: string };
  configSettings: { formFactor: string; throttlingMethod: string };
  categories: { performance: { score: number | null }; accessibility: { score: number | null } };
  audits: {
    "largest-contentful-paint": { numericValue?: number };
    "cumulative-layout-shift": { numericValue?: number };
  };
}

export function mobileMeasurement(report: LighthouseReport): MobileMeasurement {
  if (report.runtimeError) throw new Error(`Lighthouse failed: ${report.runtimeError.code}`);
  if (
    report.configSettings.formFactor !== "mobile" ||
    report.configSettings.throttlingMethod !== "simulate"
  ) {
    throw new Error("Expected the mobile preset with simulated throttling");
  }
  const scores = [report.categories.performance.score, report.categories.accessibility.score];
  const metrics = [
    report.audits["largest-contentful-paint"].numericValue,
    report.audits["cumulative-layout-shift"].numericValue,
  ];
  if (
    scores.some((value) => value === null || !Number.isFinite(value)) ||
    metrics.some((value) => value === undefined || !Number.isFinite(value))
  ) {
    throw new Error("Lighthouse did not measure every required score and metric");
  }
  return {
    performance: scores[0]! * 100,
    accessibility: scores[1]! * 100,
    lcpMs: metrics[0]!,
    cls: metrics[1]!,
  };
}

export function medianOfThree(values: readonly number[]): number {
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Exactly three finite measurements are required");
  }
  return [...values].sort((a, b) => a - b)[1]!;
}

export function summarizeMobile(runs: readonly MobileMeasurement[]): MobileMeasurement {
  if (runs.length !== 3) throw new Error("Exactly three successful mobile runs are required");
  return {
    performance: medianOfThree(runs.map((run) => run.performance)),
    accessibility: medianOfThree(runs.map((run) => run.accessibility)),
    lcpMs: medianOfThree(runs.map((run) => run.lcpMs)),
    cls: medianOfThree(runs.map((run) => run.cls)),
  };
}
