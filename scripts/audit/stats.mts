// Pure helpers for the audit tools. No I/O, no clocks, no globals. Every function has a literal
// expected-value test in stats.test.ts.
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

export const PERCENTILE_METHOD =
  "linear interpolation between the closest ranks (type 7, the NumPy and Excel default)";

export interface Summary {
  readonly n: number;
  readonly min: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  readonly mean: number;
}

function sorted(values: readonly number[]): number[] {
  if (values.length === 0) throw new RangeError("at least one value is required");
  if (values.some((v) => !Number.isFinite(v))) throw new RangeError("values must be finite");
  return [...values].sort((a, b) => a - b);
}

export function percentile(values: readonly number[], p: number): number {
  if (!(p >= 0 && p <= 100)) throw new RangeError("p must be between 0 and 100");
  const s = sorted(values);
  const rank = (p / 100) * (s.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return s[lo]! + (s[hi]! - s[lo]!) * (rank - lo);
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

export function mean(values: readonly number[]): number {
  const s = sorted(values);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

export function summarize(values: readonly number[]): Summary {
  const s = sorted(values);
  return {
    n: s.length,
    min: s[0]!,
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    max: s[s.length - 1]!,
    mean: mean(s),
  };
}

// Signed percent difference of `measured` against `reference`.
export function pctDiff(measured: number, reference: number): number {
  if (reference === 0) throw new RangeError("reference must not be zero");
  return ((measured - reference) / reference) * 100;
}

export function gzipBytes(data: string | Uint8Array, level = 6): number {
  return gzipSync(data, { level }).length;
}

export function brotliBytes(data: string | Uint8Array, quality = 11): number {
  return brotliCompressSync(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: quality },
  }).length;
}

// Decimal units (1 kB = 1000 bytes), the same base Chrome DevTools and Next.js print.
export function formatBytes(n: number): string {
  if (n < 1000) return `${Math.round(n)} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)} kB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}

export function formatMs(ms: number, digits = 0): string {
  return `${ms.toFixed(digits)} ms`;
}

export function formatSeconds(ms: number, digits = 2): string {
  return `${(ms / 1000).toFixed(digits)} s`;
}

export type Align = "l" | "r";

function cell(value: string | number): string {
  return String(value).replaceAll("|", "\\|");
}

export function markdownTable(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
  align: readonly Align[] = [],
): string {
  const line = (cells: readonly (string | number)[]) => `| ${cells.map(cell).join(" | ")} |`;
  const rule = headers.map((_, i) => (align[i] === "r" ? "---:" : "---"));
  return [line(headers), `| ${rule.join(" | ")} |`, ...rows.map(line)].join("\n");
}
