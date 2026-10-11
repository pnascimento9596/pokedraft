import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const tokens = readFileSync("src/design/tokens.css", "utf8");

describe("Inter font contract", () => {
  it("loads one family with the required weights, swap and Next's matched fallback", () => {
    expect(layout).toContain('import { Inter } from "next/font/google"');
    expect(layout).toContain('weight: ["400", "600", "700"]');
    expect(layout).toContain('display: "swap"');
    expect(layout).toContain("adjustFontFallback: true");
    expect(layout).not.toMatch(/Big_Shoulders|Barlow|font-shoulders|font-barlow/);
  });

  it("uses the same Inter stack for body text and headings", () => {
    expect(tokens).toContain("--font-display: var(--font-inter), Arial, sans-serif");
    expect(tokens).toContain("--font-body: var(--font-inter), Arial, sans-serif");
  });
});
