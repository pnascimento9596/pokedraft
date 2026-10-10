import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const determinism = {
  files: ["src/scouting/**/*.ts", "src/lib/**/*.ts", "scripts/data/**/*.{ts,mjs}"],
  rules: {
    "no-restricted-properties": [
      "error",
      { object: "Math", property: "random", message: "Use createRng from src/lib/rng.ts." },
      { object: "Date", property: "now", message: "Build outputs must not depend on time." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "NewExpression[callee.name='Date']",
        message: "Build outputs must not depend on time.",
      },
    ],
  },
};

const ENGINE_MESSAGE =
  "Engine determinism: src/engine is pure. Use the seeded RNG in src/engine/rng.ts and pass time in as data.";
const TRANSCENDENTAL_MESSAGE =
  "Engine determinism: Math.exp, Math.log and Math.pow can differ across JS engines in the last bits. Use arithmetic or a lookup table.";

const engineDeterminism = {
  files: ["src/engine/**/*.ts"],
  rules: {
    "no-restricted-globals": [
      "error",
      ...["Date", "crypto", "performance", "window", "document", "navigator", "localStorage"].map(
        (name) => ({ name, message: ENGINE_MESSAGE }),
      ),
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "MemberExpression[object.name='Math'][property.name='random']",
        message: ENGINE_MESSAGE,
      },
      ...["exp", "log", "pow"].map((fn) => ({
        selector: `MemberExpression[object.name='Math'][property.name='${fn}']`,
        message: TRANSCENDENTAL_MESSAGE,
      })),
      {
        selector: "CallExpression[callee.property.name='localeCompare']",
        message: "Engine determinism: compare strings by code point, not locale.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  determinism,
  engineDeterminism,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/data/.cache/**",
    "scripts/calibration/out/**",
    "tools/**",
  ]),
]);

export default eslintConfig;
