// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeToken } from "@/engine/token";
import { dailySeed, toIsoDate } from "@/engine/rng";
import { dailySettings } from "@/leaderboard/daily";
import { DEFAULT_PANEL } from "@/ui/settings";
import { DailyScreen } from "../DailyScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/daily",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/leaderboard/useToday", () => ({
  useToday: () => toIsoDate("2026-10-14"),
}));
vi.mock("@/components/wheel/sound", () => ({ unlockAudio: vi.fn() }));
vi.mock("@/ui/focus", () => ({ focusHeading: vi.fn() }));
vi.mock("@/components/run/LiveRun", async () => ({
  restoreRun: (await import("@/components/run/savedRun")).restoreRun,
  LiveRun: ({
    settings,
    seed,
    initial,
  }: {
    settings: { formation: string };
    seed: string;
    initial: unknown;
  }) => (
    <div data-testid="active-daily">
      {settings.formation}|{seed}|{initial === null ? "new" : "restored"}
    </div>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("Daily formation", () => {
  it("changes formation inline without changing today's seed or home and challenge storage", async () => {
    const panel = JSON.stringify({ ...DEFAULT_PANEL, formation: "3-5-2" });
    localStorage.setItem("pokedraft:panel", panel);
    localStorage.setItem("pokedraft.run.cup8", "another challenge");
    sessionStorage.setItem("pokedraft.run.builder", "another builder");
    render(<DailyScreen />);
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("3-5-2");
    fireEvent.change(screen.getByLabelText("Formation"), { target: { value: "4-4-2" } });
    fireEvent.click(screen.getByTestId("run-start"));
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).disabled).toBe(true);
    expect((await screen.findByTestId("active-daily")).textContent).toBe(
      "4-4-2|pokedraft:daily:v1:c57ec62d9264c6789a96daa6e522615f|new",
    );
    expect(screen.queryByLabelText("Formation")).toBeNull();
    expect(localStorage.getItem("pokedraft:panel")).toBe(panel);
    expect(localStorage.getItem("pokedraft.run.cup8")).toBe("another challenge");
    expect(sessionStorage.getItem("pokedraft.run.builder")).toBe("another builder");
  });

  it.each(["session", "checkpoint"])(
    "restores the saved Daily formation from its %s instead of silently abandoning it for the home formation",
    async (source) => {
      const token = encodeToken({
        v: 6,
        settings: dailySettings("5-3-2"),
        seed: dailySeed(toIsoDate("2026-10-14")),
        actions: [],
      });
      const saved = JSON.stringify({ screen: "draft", token, daily: "2026-10-14" });
      (source === "session" ? sessionStorage : localStorage).setItem("pokedraft.run.daily", saved);
      render(<DailyScreen />);
      await waitFor(() => {
        expect(screen.getByTestId("active-daily").textContent).toBe(
          "5-3-2|pokedraft:daily:v1:c57ec62d9264c6789a96daa6e522615f|restored",
        );
      });
      expect(screen.queryByLabelText("Formation")).toBeNull();
      expect(localStorage.getItem("pokedraft:panel")).toBeNull();
    },
  );

  it("ignores cleared and damaged snapshots without overwriting them while choosing formation", () => {
    sessionStorage.setItem("pokedraft.run.daily", "cleared");
    localStorage.setItem("pokedraft.run.daily", "damaged");
    render(<DailyScreen />);
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("4-3-3");
    fireEvent.change(screen.getByLabelText("Formation"), { target: { value: "4-2-3-1" } });
    expect(sessionStorage.getItem("pokedraft.run.daily")).toBe("cleared");
    expect(localStorage.getItem("pokedraft.run.daily")).toBe("damaged");
  });
});
