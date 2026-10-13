import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NAV_ICONS, NavIcon } from "../nav-icons";

describe("shared navigation families", () => {
  it("keeps the page and navigation icon in the same palette family", () => {
    expect(Object.entries(NAV_ICONS).map(([family, entry]) => [family, entry.color])).toEqual([
      ["play", "var(--viz-1)"],
      ["daily", "var(--viz-2)"],
      ["leaderboard", "var(--viz-4)"],
      ["history", "var(--viz-6)"],
      ["help", "var(--viz-7)"],
    ]);
    expect(renderToStaticMarkup(<NavIcon family="daily" />)).toContain("lucide-calendar-days");
    expect(NAV_ICONS.play.href).toBe("/");
    expect(NAV_ICONS.help.href).toBe("/how-to-play");
  });
});
