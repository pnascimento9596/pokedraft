import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { ENGINE_VERSION, FORMATION_IDS, type FormationId } from "@/engine/types";
import { BOT_NAMES, type BotName } from "./bots";
import { loadCoefficients } from "./coeffs";
import { DEFAULT_BOTS, PROBE_MODES, runProbe, type ProbeMode } from "./probe-modes";

const { values: args } = parseArgs({
  options: {
    probe: { type: "string", default: "manager" },
    n: { type: "string", default: "200" },
    seeds: { type: "string" },
    bot: { type: "string" },
    formation: { type: "string", default: "4-3-3" },
    coeffs: { type: "string" },
    out: { type: "string" },
  },
});

const mode = args.probe as ProbeMode;
if (!PROBE_MODES.includes(mode))
  throw new RangeError(`--probe must be one of ${PROBE_MODES.join(", ")}, got ${args.probe}`);
if (!(FORMATION_IDS as readonly string[]).includes(args.formation))
  throw new RangeError(`--formation must be one of ${FORMATION_IDS.join(", ")}`);
const positive = (name: string, raw: string) => {
  const v = Number(raw);
  if (!Number.isSafeInteger(v) || v < 1)
    throw new RangeError(`--${name} must be a positive integer, got ${raw}`);
  return v;
};
const bots =
  args.bot === undefined
    ? DEFAULT_BOTS[mode]
    : args.bot.split(",").map((b) => {
        if (!(BOT_NAMES as readonly string[]).includes(b))
          throw new RangeError(`--bot must name ${BOT_NAMES.join(", ")}, got ${b}`);
        return b as BotName;
      });

const out = args.out ?? `scripts/calibration/out/probe-${mode}.json`;
const started = performance.now();
const report = {
  engine: ENGINE_VERSION,
  coeffsPath: args.coeffs ?? null,
  ...runProbe(mode, {
    n: positive("n", args.n),
    seeds: positive("seeds", args.seeds ?? (mode === "luck" ? "40" : "1")),
    bots,
    formation: args.formation as FormationId,
    c: loadCoefficients(args.coeffs),
  }),
};
const json = `${JSON.stringify(report, null, 1)}\n`;
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, json);
process.stdout.write(json);
process.stderr.write(
  `probe ${mode}: ${out} sha256 ${createHash("sha256").update(json).digest("hex")} wall ${((performance.now() - started) / 1000).toFixed(1)}s\n`,
);
