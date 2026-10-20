import type { EngineRng } from "@/engine/rng";

const Z95 = 1.96;

export interface Proportion {
  readonly count: number;
  readonly n: number;
  readonly p: number;
  readonly lo: number;
  readonly hi: number;
}

export interface Interval {
  readonly value: number;
  readonly lo: number;
  readonly hi: number;
  readonly method: string;
}

/** k of n with its 95% Wilson score interval. */
export function wilson(k: number, n: number): Proportion {
  if (n === 0) return { count: k, n, p: Number.NaN, lo: Number.NaN, hi: Number.NaN };
  const p = k / n;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { count: k, n, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/**
 * a.p minus b.p with Newcombe's hybrid score interval (method 10), built from the two Wilson
 * intervals. It treats the arms as independent, so on paired samples it is conservative.
 */
export function difference(a: Proportion, b: Proportion): Interval {
  const d = a.p - b.p;
  return {
    value: d,
    lo: d - Math.sqrt((a.p - a.lo) ** 2 + (b.hi - b.p) ** 2),
    hi: d + Math.sqrt((a.hi - a.p) ** 2 + (b.p - b.lo) ** 2),
    method: "newcombe-hybrid-score",
  };
}

export function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** The sample mean with a 95% normal-approximation interval. */
export function meanInterval(values: readonly number[]): Interval {
  const m = mean(values);
  const n = values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const half = n > 1 ? (Z95 * sd) / Math.sqrt(n) : Number.NaN;
  return { value: m, lo: m - half, hi: m + half, method: "normal" };
}

/**
 * A 95% percentile bootstrap interval for a statistic over units (resampled with replacement).
 * The caller passes a seeded rng, so the interval is reproducible.
 */
export function bootstrap<T>(
  units: readonly T[],
  statistic: (sample: readonly T[]) => number,
  rng: EngineRng,
  resamples: number,
): Interval {
  const values: number[] = [];
  for (let r = 0; r < resamples; r++) {
    const sample = Array.from({ length: units.length }, () => units[rng.int(units.length)]!);
    values.push(statistic(sample));
  }
  values.sort((a, b) => a - b);
  const at = (q: number) =>
    values[Math.min(resamples - 1, Math.max(0, Math.floor(q * resamples)))]!;
  return {
    value: statistic(units),
    lo: at(0.025),
    hi: at(0.975),
    method: `bootstrap-percentile-${resamples}`,
  };
}

/** Nearest-rank quartile cut points (25th, 50th, 75th) of the values. */
export function quartileCuts(values: readonly number[]): readonly [number, number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)]!;
  return [at(0.25), at(0.5), at(0.75)];
}

/** Quartile index 0 to 3: values at or below a cut fall into that cut's quartile. */
export function quartileOf(value: number, cuts: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (value <= cuts[0]) return 0;
  if (value <= cuts[1]) return 1;
  if (value <= cuts[2]) return 2;
  return 3;
}
