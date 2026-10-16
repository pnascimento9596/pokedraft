// Writes e2e/pins.ts from the live engine, or with --check exits 1 when the committed file is
// stale. Deterministic: the same engine and data give the same bytes.
//   pnpm e2e:pins
//   pnpm e2e:pins --check
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { PINS_PATH, renderPins } from "./render-pins";

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
const next = await renderPins();
if (values.check) {
  const current = await readFile(PINS_PATH, "utf8").catch(() => null);
  if (current !== next) {
    console.error(`${PINS_PATH} is stale. Run pnpm e2e:pins and commit the result.`);
    process.exit(1);
  }
  console.log(`${PINS_PATH} is current`);
} else {
  await writeFile(PINS_PATH, next);
  console.log(`wrote ${PINS_PATH}`);
}
