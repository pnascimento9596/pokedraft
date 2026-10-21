import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { ENGINE_COEFFICIENTS_V8 } from "../coefficients-v8";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const ENGINE = path.join(ROOT, "src/engine");

function engineSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory())
      return e.name === "__tests__" || e.name === "versions" ? [] : engineSources(full);
    return e.name.endsWith(".ts") ? [full] : [];
  });
}

const OWNERS = new Set(["coefficients.ts", "coefficients-v7.ts", "coefficients-v8.ts"]);

/** Every line outside the coefficient modules that reads the coefficient objects directly. */
function moduleScopeReads(): string[] {
  return engineSources(ENGINE)
    .filter((file) => !OWNERS.has(path.basename(file)))
    .flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => {
          const rest = line
            .replace(/^\s*(import|export)\s.*\bfrom\s.*$/, "")
            .replace(/^\s*(ENGINE_COEFFICIENTS|type EngineCoefficients),?$/, "")
            .replace(/:\s*EngineCoefficients\s*=\s*ENGINE_COEFFICIENTS\b(?!_)/g, "");
          return /\bENGINE_COEFFICIENTS/.test(rest)
            ? [`${path.relative(ENGINE, file)}:${i + 1} ${line.trim()}`]
            : [];
        }),
    );
}

describe("engine coefficient reads (catches a module-scope read that ignores the injected c)", () => {
  it("reads ENGINE_COEFFICIENTS only as a default parameter outside the coefficient modules", () => {
    expect(moduleScopeReads()).toEqual([]);
  });
});

describe("engine candidate import boundary (catches candidates reaching client code)", () => {
  const eslint = new ESLint({ cwd: ROOT });
  const IMPORT_V7 = `import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";\nexport const x = ENGINE_COEFFICIENTS_V7;\n`;
  const RELATIVE_V7 = `import { ENGINE_COEFFICIENTS_V7 } from "../../engine/coefficients-v7";\nexport const x = ENGINE_COEFFICIENTS_V7;\n`;
  const IMPORT_V8 = `import { ENGINE_COEFFICIENTS_V8 } from "@/engine/coefficients-v8";\nexport const x = ENGINE_COEFFICIENTS_V8;\n`;
  const restricted = async (code: string, filePath: string) =>
    (await eslint.lintText(code, { filePath: path.join(ROOT, filePath) }))[0]!.messages
      .filter((m) => m.ruleId === "no-restricted-imports")
      .map((m) => m.line);

  it.each([
    ["src/ui/manager/x.ts", IMPORT_V7],
    ["src/components/run/X.tsx", IMPORT_V7],
    ["src/app/x/page.tsx", IMPORT_V7],
    ["src/ui/matchday/x.ts", RELATIVE_V7],
    ["src/ui/manager/x.ts", IMPORT_V8],
    ["src/components/run/X.tsx", IMPORT_V8],
    ["src/app/x/page.tsx", IMPORT_V8],
  ])("refuses the import in %s", { timeout: 60_000 }, async (file, code) => {
    expect(await restricted(code, file)).toEqual([1]);
  });

  it.each([
    "scripts/calibration/x.mts",
    "src/engine/__tests__/x.test.ts",
    "src/components/run/__tests__/x.test.tsx",
  ])("allows it in %s", { timeout: 60_000 }, async (file) => {
    expect(await restricted(IMPORT_V7, file)).toEqual([]);
    expect(await restricted(IMPORT_V8, file)).toEqual([]);
  });
});

describe("engine 7 candidate (catches a V7 tweak leaking into the live engine coefficients)", () => {
  it("shares no nested object with ENGINE_COEFFICIENTS", () => {
    const live = JSON.stringify(ENGINE_COEFFICIENTS);
    const saved = ENGINE_COEFFICIENTS_V7.team.synergy.edgeCap;
    try {
      ENGINE_COEFFICIENTS_V7.team.synergy.edgeCap = 9;
      ENGINE_COEFFICIENTS_V7.match.chances.regulation = 99;
      ENGINE_COEFFICIENTS_V7.manager.tactics.attack = [9, 9];
      expect(ENGINE_COEFFICIENTS.team.synergy.edgeCap).toBe(1);
      expect(ENGINE_COEFFICIENTS.match.chances.regulation).toBe(50);
      expect(ENGINE_COEFFICIENTS.manager.tactics.attack).toEqual([1.25, 1.3]);
    } finally {
      ENGINE_COEFFICIENTS_V7.team.synergy.edgeCap = saved;
      ENGINE_COEFFICIENTS_V7.match.chances.regulation = 50;
      ENGINE_COEFFICIENTS_V7.manager.tactics.attack = [1.25, 1.3];
      ENGINE_COEFFICIENTS.team.synergy.edgeCap = 1;
      ENGINE_COEFFICIENTS.match.chances.regulation = 50;
      ENGINE_COEFFICIENTS.manager.tactics.attack = [1.25, 1.3];
    }
    expect(JSON.stringify(ENGINE_COEFFICIENTS)).toBe(live);
  });
});

describe("engine 8 candidate (catches a V8 tweak leaking into live coefficients)", () => {
  it("shares no nested object with ENGINE_COEFFICIENTS", () => {
    const live = JSON.stringify(ENGINE_COEFFICIENTS);
    const saved = ENGINE_COEFFICIENTS_V8.team.synergy.edgeCap;
    try {
      ENGINE_COEFFICIENTS_V8.team.synergy.edgeCap = 9;
      ENGINE_COEFFICIENTS_V8.manager.directDefendOwn = 9;
      expect(ENGINE_COEFFICIENTS.team.synergy.edgeCap).toBe(1);
      expect(ENGINE_COEFFICIENTS.manager.directDefendOwn).toBe(0.655);
    } finally {
      ENGINE_COEFFICIENTS_V8.team.synergy.edgeCap = saved;
      ENGINE_COEFFICIENTS_V8.manager.directDefendOwn = 0.95;
      ENGINE_COEFFICIENTS.team.synergy.edgeCap = 1;
      ENGINE_COEFFICIENTS.manager.directDefendOwn = 0.655;
    }
    expect(JSON.stringify(ENGINE_COEFFICIENTS)).toBe(live);
  });
});
