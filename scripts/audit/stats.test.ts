import { describe, expect, it } from "vitest";
import {
  brotliBytes,
  formatBytes,
  formatMs,
  formatSeconds,
  gzipBytes,
  markdownTable,
  mean,
  median,
  pctDiff,
  percentile,
  summarize,
} from "./stats.mjs";

describe("median", () => {
  it("takes the middle value of an odd count, whatever the input order", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("averages the two middle values of an even count", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("does not reorder the caller's array", () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toEqual([3, 1, 2]);
  });

  it("refuses an empty list instead of returning NaN", () => {
    expect(() => median([])).toThrow(RangeError);
  });

  it("refuses NaN, which would silently poison a table cell", () => {
    expect(() => median([1, Number.NaN, 3])).toThrow(RangeError);
  });
});

describe("percentile (linear interpolation, type 7)", () => {
  it("returns the extremes at 0 and 100", () => {
    expect(percentile([10, 20, 30, 40], 0)).toBe(10);
    expect(percentile([10, 20, 30, 40], 100)).toBe(40);
  });

  it("interpolates between ranks: p95 of 1..10 is 9.55", () => {
    const one2ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(one2ten, 95)).toBeCloseTo(9.55, 10);
  });

  it("p95 of 30 sequential requests is 28.55, not the nearest-rank 29", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(percentile(thirty, 95)).toBeCloseTo(28.55, 10);
  });

  it("is order independent", () => {
    expect(percentile([40, 10, 30, 20], 50)).toBe(25);
  });

  it("rejects p outside 0 to 100", () => {
    expect(() => percentile([1, 2], 101)).toThrow(RangeError);
    expect(() => percentile([1, 2], -1)).toThrow(RangeError);
  });
});

describe("summarize", () => {
  it("reports n, min, p50, p95, max and mean for four samples", () => {
    const s = summarize([40, 10, 30, 20]);
    expect(s.n).toBe(4);
    expect(s.min).toBe(10);
    expect(s.p50).toBe(25);
    expect(s.p95).toBeCloseTo(38.5, 10);
    expect(s.max).toBe(40);
    expect(s.mean).toBe(25);
  });

  it("gives a single sample for every statistic", () => {
    expect(summarize([7])).toEqual({ n: 1, min: 7, p50: 7, p95: 7, max: 7, mean: 7 });
  });
});

describe("mean", () => {
  it("is the arithmetic mean", () => {
    expect(mean([1, 2, 6])).toBe(3);
  });
});

describe("pctDiff", () => {
  it("is signed relative to the reference", () => {
    expect(pctDiff(105, 100)).toBe(5);
    expect(pctDiff(95, 100)).toBe(-5);
  });

  it("refuses a zero reference", () => {
    expect(() => pctDiff(1, 0)).toThrow(RangeError);
  });
});

describe("compressed sizes", () => {
  it("gzipBytes counts the gzip container: an empty input is 20 bytes, not 0", () => {
    expect(gzipBytes("")).toBe(20);
  });

  it("brotliBytes counts the brotli stream: an empty input is 1 byte, not 0", () => {
    expect(brotliBytes("")).toBe(1);
  });

  it("compresses a 1000-byte run of one character to well under 40 bytes", () => {
    expect(gzipBytes("a".repeat(1000))).toBeLessThan(40);
    expect(brotliBytes("a".repeat(1000))).toBeLessThan(20);
  });

  it("honours the level argument: the cheapest level is larger than the best level", () => {
    const text = Array.from({ length: 2000 }, (_, i) => (i * i) % 977).join(",");
    expect(gzipBytes(text, 1)).toBeGreaterThan(gzipBytes(text, 9));
    expect(brotliBytes(text, 4)).toBeGreaterThan(brotliBytes(text, 11));
  });
});

describe("formatting", () => {
  it("prints decimal byte units", () => {
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1000)).toBe("1.0 kB");
    expect(formatBytes(112594)).toBe("112.6 kB");
    expect(formatBytes(1329334)).toBe("1.33 MB");
  });

  it("prints milliseconds and seconds", () => {
    expect(formatMs(49.5)).toBe("50 ms");
    expect(formatMs(14.784, 1)).toBe("14.8 ms");
    expect(formatSeconds(2782.3)).toBe("2.78 s");
    expect(formatSeconds(3800, 1)).toBe("3.8 s");
  });
});

describe("markdownTable", () => {
  it("renders a header, an alignment rule and rows", () => {
    const table = markdownTable(
      ["Route", "LCP"],
      [
        ["/", "2.78 s"],
        ["/play", "2.6 s"],
      ],
      ["l", "r"],
    );
    expect(table).toBe(
      ["| Route | LCP |", "| --- | ---: |", "| / | 2.78 s |", "| /play | 2.6 s |"].join("\n"),
    );
  });

  it("escapes a pipe so a cell cannot split into two columns", () => {
    expect(markdownTable(["a"], [["x|y"]])).toBe("| a |\n| --- |\n| x\\|y |");
  });
});
