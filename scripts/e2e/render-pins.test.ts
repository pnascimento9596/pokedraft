import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, RUN_TOKEN_VERSION } from "@/engine/types";
import { PINS_PATH, renderPins } from "./render-pins";

function e2eSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return e2eSources(path);
    return /\.tsx?$/.test(entry.name) && path !== PINS_PATH ? [path] : [];
  });
}

describe("e2e pins", () => {
  it("e2e/pins.ts is what the live engine generates (catches an engine change that leaves the browser pins stale)", async () => {
    expect(readFileSync(PINS_PATH, "utf8")).toBe(await renderPins());
  });

  it("no e2e source outside e2e/pins.ts spells the live token prefix, builds one with pd${, or names the live engine (catches specs that keep testing a frozen bundle after an engine bump)", () => {
    // "pd6." in a token, "pd6\\." in a regex source, "pd6?" in a share link.
    const livePrefix = new RegExp(`pd${RUN_TOKEN_VERSION}\\\\*[.?]`);
    const offenders = e2eSources("e2e").flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          livePrefix.test(line) || line.includes("pd${") || line.includes(ENGINE_VERSION)
            ? [`${file}:${index + 1}`]
            : [],
        ),
    );
    expect(offenders).toEqual([]);
  });
});
