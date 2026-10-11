// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import { toIsoDate } from "@/engine";

const query = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
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
      "8-0 Challenge, all-time. Every draft setting shares this board, and each row names its settings. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });

  it("says the same on the all-time 151 board, where Squad First and Position First share one board", () => {
    expect(caption("mode=kanto151&scope=all")).toBe(
      "151 Challenge, all-time. Every draft setting shares this board, and each row names its settings. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });

  it("keeps the daily caption as it was, because the daily board takes only Open, Squad First, all regions", () => {
    expect(caption("mode=cup8&scope=daily&date=2026-10-09")).toBe(
      "Daily 8-0 Challenge for Friday, October 9, 2026. Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top 50.",
    );
  });
});
