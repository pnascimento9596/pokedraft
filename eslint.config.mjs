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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  determinism,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/data/.cache/**",
    "tools/**",
  ]),
]);

export default eslintConfig;
