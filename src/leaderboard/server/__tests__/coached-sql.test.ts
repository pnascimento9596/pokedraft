import { describe, expect, it } from "vitest";
import { coachedSqlFor } from "../store";

describe("coachedSqlFor refuses a version it would splice into SQL unsafely (catches sql.raw becoming an injection surface)", () => {
  it.each([
    ["a fraction", 1.5, "1.5"],
    ["zero", 0, "0"],
    ["a negative", -6, "-6"],
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
    ["an injection-shaped string", "6.%' OR true OR token LIKE '", "6.%' OR true OR token LIKE '"],
  ])("throws on %s", (_name, version, shown) => {
    expect(() => coachedSqlFor([6, version as number])).toThrow(
      `coachedSql token versions must be positive integers, got ${shown}`,
    );
  });

  it("builds for positive integer versions", () => {
    expect(() => coachedSqlFor([6])).not.toThrow();
    expect(() => coachedSqlFor([5, 6, 7])).not.toThrow();
  });
});
