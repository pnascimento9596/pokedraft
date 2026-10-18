import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { distance, simulate, type Rgb } from "../../src/design/color-distance";
import { hexRgb, palette } from "./theme-contrast.mjs";

export { distance, simulate };
export type { Vision } from "../../src/design/color-distance";

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
