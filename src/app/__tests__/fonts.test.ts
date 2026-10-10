import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("Big Shoulders fallback", () => {
  it("declares a metric-matched local fallback face, because next/font has no metrics for the renamed family and the page jumps when the display font loads", () => {
    const face = /@font-face\s*{[^}]*font-family:\s*"Big Shoulders Fallback"[^}]*}/.exec(css)?.[0];
    expect(face).toBeDefined();
    expect(face).toMatch(/src:\s*local\("Arial Bold"\)/);
    expect(face).toMatch(/size-adjust:\s*78\.13%/);
    expect(face).toMatch(/ascent-override:\s*125\.94%/);
    expect(face).toMatch(/descent-override:\s*27\.26%/);
    expect(face).toMatch(/line-gap-override:\s*0%/);
  });

  it("puts the fallback right after the real font in the display stack", () => {
    expect(css).toMatch(/--font-display:\s*var\(--font-shoulders\),\s*"Big Shoulders Fallback",/);
  });
});
