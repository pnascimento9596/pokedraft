// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import { toIsoDate } from "@/engine";

const query = vi.hoisted(() => ({ value: "" }));
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query.value),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function caption(search: string): string {
  query.value = search;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
  render(<LeaderboardScreen serverToday={toIsoDate("2026-10-10")} />);
  return screen.getByText(/Ranked by wins/).textContent ?? "";
}

describe("LeaderboardScreen caption", () => {
  it("warns that every draft setting shares the all-time 8-0 board (catches a caption that hides Open and Classic ranking together)", () => {
    expect(caption("mode=cup8&scope=all")).toBe(
      "8-0 Challenge, all-time, engine v7. Every draft setting shares this board, and each row names its settings. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });

  it("names every engine on the All engines view (catches a caption that claims one engine over mixed rows)", () => {
    expect(caption("mode=cup8&scope=all&engine=all")).toBe(
      "8-0 Challenge, all-time, every engine. Every draft setting shares this board, and each row names its settings. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });

  it("says the same on the all-time 151 board, where Squad First and Position First share one board", () => {
    expect(caption("mode=kanto151&scope=all")).toBe(
      "151 Challenge, all-time, engine v7. Every draft setting shares this board, and each row names its settings. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });

  it("keeps the daily caption as it was, because the daily board takes only Open, Squad First, all regions", () => {
    expect(caption("mode=cup8&scope=daily&date=2026-10-09")).toBe(
      "Daily 8-0 Challenge for Friday, October 9, 2026. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });
});

describe("LeaderboardScreen board and mode controls", () => {
  function pressed(group: string): Record<string, string | null> {
    return Object.fromEntries(
      within(screen.getByRole("group", { name: group }))
        .getAllByRole("button")
        .map((b) => [b.textContent ?? "", b.getAttribute("aria-pressed")]),
    );
  }

  it("uses pressed buttons, not tabs or radios, for controls that only change the URL (catches a tablist with no tab panel and a radiogroup with no arrow keys)", () => {
    caption("mode=kanto151&scope=all");
    expect(document.querySelectorAll('[role="tab"], [role="tablist"]')).toHaveLength(0);
    expect(document.querySelectorAll('[role="radio"], [role="radiogroup"]')).toHaveLength(0);
    expect(pressed("Board")).toEqual({ Daily: "false", "All-time": "true" });
    expect(pressed("Mode")).toEqual({ "8-0 Challenge": "false", "151 Challenge": "true" });
  });

  it("presses Daily on the daily board and shows no mode group there", () => {
    caption("mode=cup8&scope=daily&date=2026-10-09");
    expect(pressed("Board")).toEqual({ Daily: "true", "All-time": "false" });
    expect(screen.queryByRole("group", { name: "Mode" })).toBeNull();
  });

  it("moves to the board a pressed button names", () => {
    query.value = "mode=cup8&scope=daily&date=2026-10-09";
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<LeaderboardScreen serverToday={toIsoDate("2026-10-10")} />);
    fireEvent.click(screen.getByRole("button", { name: "All-time" }));
    expect(replace).toHaveBeenLastCalledWith("/leaderboard?mode=cup8&scope=all", {
      scroll: false,
    });
  });
});
