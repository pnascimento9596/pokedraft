import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const tokens = readFileSync("src/design/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const loader = readFileSync("src/design/fonts/inter.ts", "utf8");
const provenance = JSON.parse(readFileSync("src/design/fonts/web-provenance.json", "utf8")) as {
  files: {
    file: string;
    subset: string;
    weights: number[];
    unicodeRange: string;
    sha256: string;
  }[];
};

describe("Inter font contract", () => {
  it("self-hosts Inter so the build never fetches Google Fonts (catches the hosted next/font/google build failure)", () => {
    for (const source of [layout, loader]) expect(source).not.toMatch(/from "next\/font\/google"/);
    expect(layout).toContain('import { Inter } from "@/design/fonts/inter"');
    expect(layout).toContain("className={Inter.variable}");
    expect(loader).toContain('import localFont from "next/font/local"');
    expect(loader).toContain('variable: "--font-inter"');
    expect(loader).toContain('display: "swap"');
    expect(layout).not.toMatch(/Big_Shoulders|Barlow|font-shoulders|font-barlow/);
  });

  it("declares every Google subset at 400, 600 and 700 with its own unicode-range, preloading latin only", () => {
    const calls = loader.split("localFont(").slice(1);
    const declared = calls.map((call) => ({
      files: [...call.matchAll(/path: "\.\/(inter-[a-z-]+\.woff2)", weight: "(\d+)"/g)].map(
        ([, file, weight]) => `${file}@${weight}`,
      ),
      range: /prop: "unicode-range",\s*value:\s*"([^"]+)"/.exec(call)?.[1],
      preload: !call.includes("preload: false"),
    }));
    expect(declared.map((d) => d.files.join(" "))).toEqual(
      provenance.files.map((f) => f.weights.map((w) => `${f.file}@${w}`).join(" ")),
    );
    expect(declared.map((d) => d.range)).toEqual(provenance.files.map((f) => f.unicodeRange));
    expect(declared.map((d) => d.preload)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(provenance.files.map((f) => f.subset)).toEqual([
      "cyrillic-ext",
      "cyrillic",
      "greek-ext",
      "greek",
      "vietnamese",
      "latin-ext",
      "latin",
    ]);
  });

  it("commits the exact woff2 bytes Google served", () => {
    expect(
      provenance.files.map(
        (f) =>
          `${f.file} ${
            createHash("sha256")
              .update(readFileSync(`src/design/fonts/${f.file}`))
              .digest("hex") === f.sha256
          }`,
      ),
    ).toEqual(provenance.files.map((f) => `${f.file} true`));
    expect(provenance.files.find((f) => f.subset === "latin")?.sha256).toBe(
      "c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4",
    );
  });

  it("keeps the fallback metrics next/font/google shipped (catches a reflow before Inter loads)", () => {
    expect(loader).toContain('fallback: ["Inter Fallback"]');
    expect(globals).toContain(`@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  ascent-override: 90.44%;
  descent-override: 22.52%;
  line-gap-override: 0%;
  size-adjust: 107.12%;
}`);
  });

  it("uses the same Inter stack for body text and headings", () => {
    expect(tokens).toContain("--font-display: var(--font-inter), Arial, sans-serif");
    expect(tokens).toContain("--font-body: var(--font-inter), Arial, sans-serif");
  });
});
