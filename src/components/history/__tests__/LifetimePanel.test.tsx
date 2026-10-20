// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { RunRecord } from "@/ui/runs";
import { LifetimePanel } from "../LifetimePanel";

const older: RunRecord = {
  token: "pd5.older",
  bucket: "cup8:open",
  friendly: false,
  formation: "4-3-3",
  score: 820,
  wins: 8,
  draws: 0,
  losses: 0,
  finish: "champion",
  flawless: true,
  at: "2026-10-14T12:00:00Z",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function metric(label: string): string | null {
  return (
    within(screen.getByRole("region", { name: "Lifetime totals" })).getByText(label)
      .nextElementSibling?.textContent ?? null
  );
}

it("labels totals backfilled from saved history and the runs without stored goals", () => {
  localStorage.setItem("pokedraft:history:v1", JSON.stringify([older]));
  render(<LifetimePanel />);
  expect(screen.getByTestId("lifetime-backfill").textContent).toBe(
    "Includes your last 1 saved run from before lifetime tracking.",
  );
  expect(screen.getByTestId("lifetime-goal-coverage").textContent).toBe(
    "Goals cover 0 of 1 runs. Older saved runs did not store goals.",
  );
  expect(metric("Runs completed")).toBe("1");
  expect(metric("Cups won")).toBe("1");
  expect(metric("Matches W-D-L")).toBe("8-0-0");
  expect(metric("Goals for and against")).toBe("Not yet");
  expect(
    within(screen.getByRole("region", { name: "Best finish by mode" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual([
    "8-0 Challenge, Open Champions1 run",
    "8-0 Challenge, Classic No runs yet0 runs",
    "151 Challenge No runs yet0 runs",
    "Friendly (not ranked) No runs yet0 runs",
  ]);
});

it("rejects a malformed backup file with a clear message and keeps the totals", async () => {
  render(<LifetimePanel />);
  const file = new File(["{not json"], "backup.json", { type: "application/json" });
  fireEvent.change(screen.getByTestId("backup-file"), { target: { files: [file] } });
  await waitFor(() =>
    expect(screen.getByTestId("backup-notice").textContent).toBe(
      "This file is not a pokedraft backup. It is not valid JSON.",
    ),
  );
  expect(metric("Runs completed")).toBe("0");
  expect(screen.queryByTestId("lifetime-backfill")).toBeNull();
});

it("shows six achievement tiles with the earned date, Not yet and the formation progress (catches a missing or invented earn)", () => {
  const newer: RunRecord = {
    ...older,
    token: "pd6.newer",
    formation: "3-5-2",
    flawless: false,
    wins: 7,
    losses: 1,
    at: "2026-10-21T12:00:00Z",
    achievements: ["giant-killer"],
  };
  localStorage.setItem("pokedraft:history:v1", JSON.stringify([newer, older]));
  render(<LifetimePanel />);
  const grid = screen.getByRole("region", { name: "Achievements" });
  expect(
    within(grid)
      .getAllByRole("listitem")
      .map((item) => [item.textContent, item.getAttribute("data-earned")]),
  ).toEqual([
    ["First FlawlessEarned 14 October 2026", "true"],
    ["Hat-trick heroNot yet", "false"],
    ["Champion with every formationNot yet2 of 8", "false"],
    ["151 championNot yet", "false"],
    ["ComebackNot yet", "false"],
    ["Giant killerEarned 21 October 2026", "true"],
  ]);
  expect(
    within(grid)
      .getAllByText(/count runs played from/)
      .map((p) => p.textContent),
  ).toEqual(["Hat-trick hero, Comeback and Giant killer count runs played from 20 October 2026."]);
});
