export type Rgb = readonly [number, number, number];
export type Vision = "normal" | "protanopia" | "deuteranopia";

export const VISIONS: readonly Vision[] = ["normal", "protanopia", "deuteranopia"];

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

/** Machado 2009 at severity 1.0, in linear sRGB. */
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

/** Oklab Euclidean distance scaled by 100. */
export function distance(a: Rgb, b: Rgb): number {
  const x = oklab(a),
    y = oklab(b);
  return Math.hypot(...x.map((value, index) => value - y[index]!)) * 100;
}

function rgbOf(hex: string): Rgb {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as unknown as Rgb;
}

/** How far apart two six-digit colours look to the eye that confuses them most. */
export function kitDistance(a: string, b: string): number {
  return Math.min(
    ...VISIONS.map((vision) => distance(simulate(rgbOf(a), vision), simulate(rgbOf(b), vision))),
  );
}
