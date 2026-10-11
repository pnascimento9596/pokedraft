import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Rgb = readonly [number, number, number];

export function hexRgb(hex: string): Rgb {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`Expected a six-digit palette color: ${hex}`);
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as unknown as Rgb;
}

function luminance(rgb: Rgb): number {
  return rgb
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
}

function mix(a: Rgb, b: Rgb, fraction: number): Rgb {
  return a.map((value, index) => value * fraction + b[index]! * (1 - fraction)) as unknown as Rgb;
}

function declarations(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]),
  );
}

export function palette(css: string, theme: "light" | "dark"): Record<string, string> {
  const light = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map((match) => declarations(match[1]!));
  const dark = [...css.matchAll(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/g)].map((match) =>
    declarations(match[1]!),
  );
  return Object.assign({}, ...light, ...(theme === "dark" ? dark : []));
}

function resolve(tokens: Record<string, string>, name: string, visited: string[] = []): Rgb {
  if (visited.includes(name)) throw new Error(`Circular palette role ${name}`);
  const value = tokens[name];
  if (!value) throw new Error(`Missing palette role ${name}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(tokens, reference[1]!, [...visited, name]) : hexRgb(value);
}

export function checkContrast(css: string) {
  const rows: { theme: string; role: string; surface: string; ratio: number; minimum: number }[] =
    [];
  for (const theme of ["light", "dark"] as const) {
    const tokens = palette(css, theme);
    const add = (
      role: string,
      surface: string,
      minimum: number,
      fg = resolve(tokens, role),
      bg = resolve(tokens, surface),
    ) => {
      rows.push({ theme, role, surface, ratio: contrastRatio(fg, bg), minimum });
    };
    for (const role of ["--text", "--text-soft", "--text-muted", "--text-faint", "--link"])
      for (const surface of ["--canvas", "--surface", "--surface-emphasis", "--surface-sunken"])
        add(role, surface, 4.5);
    for (const surface of ["--accent", "--accent-hover"]) add("--accent-fg", surface, 4.5);
    add("--ok-text", "--ok-bg", 4.5);
    for (const surface of ["--info-bg", "--warn-bg"]) add("--text-soft", surface, 4.5);
    add(
      "--risk-text",
      "--surface",
      4.5,
      resolve(tokens, "--risk-text"),
      mix(resolve(tokens, "--risk-mark"), resolve(tokens, "--surface"), 0.16),
    );
    for (let index = 1; index <= 7; index++) add(`--viz-${index}`, "--surface", 3);
    add("--risk-mark", "--surface", 3);
    for (const role of ["--border-control", "--focus", "--action-border"])
      add(role, "--surface", 3);
    for (const role of Object.keys(tokens).filter((name) => /^--type-[a-z]+$/.test(name))) {
      add(role, "--surface", 3);
      add(
        role,
        "tinted type pill",
        4.5,
        resolve(tokens, role),
        mix(resolve(tokens, role), resolve(tokens, "--surface"), 0.16),
      );
      for (const fraction of [0.14, 0.18])
        add(
          role,
          `type pill ${fraction}`,
          4.5,
          resolve(tokens, role),
          mix(resolve(tokens, role), resolve(tokens, "--surface"), fraction),
        );
    }
    add("--pitch-line", "--pitch", 3);
    add("--pitch-line", "--pitch-stripe", 3);
    for (const background of ["--surface", "--surface-emphasis", "--surface-sunken"])
      add("--text", background, 4.5);
    for (const fraction of [0.16, theme === "light" ? 0.78 : 0.48])
      add(
        "--text",
        `viz-8 heat fill ${fraction}`,
        4.5,
        resolve(tokens, "--text"),
        mix(resolve(tokens, "--viz-8"), resolve(tokens, "--surface"), fraction),
      );
    const step =
      luminance(resolve(tokens, "--pitch-stripe")) / luminance(resolve(tokens, "--pitch")) - 1;
    if (step < 0.04 || step > 0.06)
      throw new Error(`${theme} pitch stripe luminance step ${step} is outside 4 to 6 percent`);
  }
  return { rows, failures: rows.filter((row) => row.ratio < row.minimum) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8");
  const report = checkContrast(css);
  const lowest = new Map<string, (typeof report.rows)[number]>();
  for (const row of report.rows)
    if (!lowest.has(row.role) || row.ratio < lowest.get(row.role)!.ratio) lowest.set(row.role, row);
  console.log(JSON.stringify({ lowest: [...lowest.values()], failures: report.failures }, null, 2));
  if (report.failures.length) process.exitCode = 1;
}
