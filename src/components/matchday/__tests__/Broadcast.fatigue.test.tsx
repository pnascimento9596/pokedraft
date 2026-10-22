// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

afterEach(cleanup);

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Match 0 of the golden cup8 draft under engine 6, with its real lineups per window and chosen
// energies: slot 1 at 65, slot 2 at 64, slot 3 at 55, slot 4 at 54, everyone else at 90.
const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const REAL = cup.matches[0] as PlayedMatch;
const LINEUP = toFullLineup(draft);
const TIMELINE = buildTimeline(REAL, { matchIndex: 0, seed: cup.seed, lineup: LINEUP });
const CHOSEN: Readonly<Record<number, number>> = { 1: 65, 2: 64, 3: 55, 4: 54 };
const MATCH: PlayedMatch = {
  ...REAL,
  windows: (REAL.windows ?? []).map((w) => ({
    ...w,
    energy: w.energy.map((e, slot) => (e === null ? null : (CHOSEN[slot] ?? 90))),
  })),
};

function show(match: PlayedMatch, clock: number, motion = true) {
  render(
    <Broadcast
      match={match}
      timeline={TIMELINE}
      lineup={LINEUP}
      clock={clock}
      now={0}
      fired={{}}
      kicks={0}
      motion={motion}
      speed={1}
    />,
  );
}

const sweating = () =>
  screen.queryAllByTestId(/^pitch-sweat-/).map((el) => el.dataset.testid ?? "");
const flagging = () =>
  screen.queryAllByTestId(/^pitch-stamina-/).map((el) => el.dataset.testid ?? "");

describe("fatigue marks on the pitch (catches tired players looking fresh, and marks on players with no energy)", () => {
  it("shows the sweat pip below 65 and not at 65 (catches an off-by-one threshold)", () => {
    show(MATCH, 30);
    expect(sweating()).toEqual(["pitch-sweat-user-2", "pitch-sweat-user-3", "pitch-sweat-user-4"]);
  });

  it("shows the stamina arc below 55 and not at 55 (catches an off-by-one threshold)", () => {
    show(MATCH, 30);
    expect(flagging()).toEqual(["pitch-stamina-user-4"]);
  });

  it("slows the stride of a player below 65 only (catches a fresh stride on a tired player)", () => {
    show(MATCH, 30);
    const tired = [
      ...screen.getByTestId("broadcast").querySelectorAll<HTMLElement>("[data-tired]"),
    ];
    expect(tired.map((el) => `${el.dataset.side}-${el.dataset.slot}`)).toEqual([
      "user-2",
      "user-3",
      "user-4",
    ]);
  });

  it("shows no fatigue mark without recorded energy (catches made-up energy)", () => {
    show({ ...MATCH, windows: undefined }, 30);
    expect(sweating()).toEqual([]);
    expect(flagging()).toEqual([]);
    cleanup();
    // The first window closes at 5', so before it nobody has a recorded energy.
    show(MATCH, 4);
    expect(sweating()).toEqual([]);
  });
});
