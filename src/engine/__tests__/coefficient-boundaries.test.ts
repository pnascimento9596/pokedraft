import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

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

const OWNERS = new Set(["coefficients.ts", "coefficients-v7.ts"]);

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

describe("engine 7 candidate import boundary (catches the candidate reaching client code)", () => {
  const eslint = new ESLint({ cwd: ROOT });
  const IMPORT = `import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";\nexport const x = ENGINE_COEFFICIENTS_V7;\n`;
  const RELATIVE = `import { ENGINE_COEFFICIENTS_V7 } from "../../engine/coefficients-v7";\nexport const x = ENGINE_COEFFICIENTS_V7;\n`;
  const restricted = async (code: string, filePath: string) =>
    (await eslint.lintText(code, { filePath: path.join(ROOT, filePath) }))[0]!.messages
      .filter((m) => m.ruleId === "no-restricted-imports")
      .map((m) => m.line);

  it.each([
    ["src/ui/manager/x.ts", IMPORT],
    ["src/components/run/X.tsx", IMPORT],
    ["src/app/x/page.tsx", IMPORT],
    ["src/ui/matchday/x.ts", RELATIVE],
  ])("refuses the import in %s", { timeout: 60_000 }, async (file, code) => {
    expect(await restricted(code, file)).toEqual([1]);
  });

  it.each([
    "scripts/calibration/x.mts",
    "src/engine/__tests__/x.test.ts",
    "src/components/run/__tests__/x.test.tsx",
  ])("allows it in %s", { timeout: 60_000 }, async (file) => {
    expect(await restricted(IMPORT, file)).toEqual([]);
  });
});
