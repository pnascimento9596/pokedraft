import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hexRgb, palette } from "./theme-contrast.mjs";

type Rgb = readonly [number, number, number];
export type Vision = "normal" | "protanopia" | "deuteranopia";
const matrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;
const linear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const encode = (channel: number) =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;

export function simulate(rgb: Rgb, vision: Vision): Rgb {
  if (vision === "normal") return rgb;
  const values = rgb.map((channel) => linear(channel / 255));
  return matrices[vision].map((row) =>
    Math.max(
      0,
      Math.min(
        255,
        encode(
          Math.max(
            0,
            Math.min(
              1,
              row.reduce((sum, value, index) => sum + value * values[index]!, 0),
            ),
          ),
        ) * 255,
      ),
    ),
  ) as unknown as Rgb;
}

function oklab(rgb: Rgb): Rgb {
  const [r, g, b] = rgb.map((channel) => linear(channel / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function distance(a: Rgb, b: Rgb): number {
  const x = oklab(a),
    y = oklab(b);
  return Math.hypot(...x.map((value, index) => value - y[index]!)) * 100;
}

export function typeSeparation(css: string) {
  const rows = [];
  for (const theme of ["light", "dark"] as const) {
    const tokens = palette(css, theme);
    const types = Object.entries(tokens).filter(([role]) => /^--type-[a-z]+$/.test(role));
    if (types.length !== 18) throw new Error(`Expected 18 labeled types, found ${types.length}`);
    for (const vision of ["normal", "protanopia", "deuteranopia"] as const) {
      const pairs = [];
      for (let a = 0; a < types.length; a++)
        for (let b = a + 1; b < types.length; b++) {
          pairs.push({
            a: types[a]![0],
            b: types[b]![0],
            deltaEOK100: distance(
              simulate(hexRgb(types[a]![1]), vision),
              simulate(hexRgb(types[b]![1]), vision),
            ),
          });
        }
      pairs.sort((a, b) => a.deltaEOK100 - b.deltaEOK100);
      rows.push({ theme, vision, closest: pairs.slice(0, 5), minimum: pairs[0]!.deltaEOK100 });
    }
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8");
  const output = process.env.CVD_OUTPUT ?? "output/dispatch-8/cvd";
  mkdirSync(output, { recursive: true });
  const report = {
    source: "https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html",
    method: "Machado 2009, severity 1.0, linear sRGB; Oklab Euclidean distance scaled by 100",
    rows: typeSeparation(css),
  };
  writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  const color = (rgb: Rgb) => `rgb(${rgb.map((value) => Math.round(value)).join(",")})`;
  let content = "";
  for (const [themeIndex, theme] of (["light", "dark"] as const).entries()) {
    const tokens = palette(css, theme);
    const types = Object.entries(tokens).filter(([role]) => /^--type-[a-z]+$/.test(role));
    const surface = hexRgb(tokens["--surface"]!);
    for (const [index, vision] of (["normal", "protanopia", "deuteranopia"] as const).entries()) {
      const y = (themeIndex * 3 + index) * 104;
      content += `<rect x="0" y="${y}" width="1440" height="104" fill="${color(simulate(surface, vision))}"/><text x="16" y="${y + 25}" fill="${color(simulate(hexRgb(tokens["--text"]!), vision))}">${theme} / ${vision}</text>`;
      for (const [position, [role, hex]] of types.entries()) {
        const foreground = hexRgb(hex);
        const background = foreground.map(
          (value, channel) => value * 0.16 + surface[channel]! * 0.84,
        ) as unknown as Rgb;
        content += `<rect x="${position * 80 + 4}" y="${y + 40}" width="72" height="36" rx="18" fill="${color(simulate(background, vision))}" stroke="${color(simulate(foreground, vision))}"/><text x="${position * 80 + 40}" y="${y + 62}" text-anchor="middle" fill="${color(simulate(foreground, vision))}" font-size="11" font-weight="600">${role.replace("--type-", "")}</text>`;
      }
    }
  }
  writeFileSync(
    path.join(output, "type-palette.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="624" viewBox="0 0 1440 624"><g font-family="Inter,Arial,sans-serif" font-size="15">${content}</g></svg>\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.rows.some((row) => row.minimum < 4)) process.exitCode = 1;
}
