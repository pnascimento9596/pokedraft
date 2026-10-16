import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PINS_PATH, renderPins } from "./render-pins";

describe("e2e pins", () => {
  it("e2e/pins.ts is what the live engine generates (catches an engine change that leaves the browser pins stale)", async () => {
    expect(readFileSync(PINS_PATH, "utf8")).toBe(await renderPins());
  });
});
