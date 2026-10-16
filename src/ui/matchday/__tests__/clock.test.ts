import { describe, expect, it } from "vitest";
import type { FullLineup, Incident, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, advanceClock, nextStop, stopsFor } from "../clock";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const LINEUP = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(id),
  bench: [21, 22, 23, 24, 25].map(id),
} as unknown as FullLineup;

function match(incidents: Incident[], windows = true): PlayedMatch {
  return {
    status: "played",
    incidents,
    windows: windows ? [] : undefined,
    absences: [],
  } as unknown as PlayedMatch;
}

describe("PACE (catches a live match that runs at the quick pace or the reverse)", () => {
  it("plays a live half in 25 s, an extra-time half in 8 s and a kick in 1.2 s", () => {
    expect(PACE.live.regulation * 45).toBe(25_000);
    expect(Math.round(PACE.live.regulation * 5)).toBe(2_778);
    expect(PACE.live.extraTime * 15).toBeCloseTo(8_000, 6);
    expect(PACE.live.kick).toBe(1_200);
  });

  it("plays a quick match in about 5 s", () => {
    expect(PACE.quick.regulation * 90 + PACE.quick.extraTime * 30).toBeCloseTo(5_300, 6);
  });
});

describe("advanceClock (catches a clock that runs past a stop or ignores 2x)", () => {
  it("runs one live window in about 2.8 s, twice as far at 2x", () => {
    expect(advanceClock(0, 25_000 / 9, PACE.live, 1, 90)).toBeCloseTo(5, 9);
    expect(advanceClock(0, 25_000 / 9, PACE.live, 2, 90)).toBeCloseTo(10, 9);
  });

  it("never passes the limit", () => {
    expect(advanceClock(40, 60_000, PACE.live, 2, 45)).toBe(45);
  });

  it("switches to the extra-time rate at 90", () => {
    expect(
      advanceClock(89, PACE.live.regulation + PACE.live.extraTime * 2, PACE.live, 1, 120),
    ).toBeCloseTo(92, 9);
  });
});

describe("stopsFor (catches manager mode that skips an injury prompt or stops a retained match)", () => {
  const injured: Incident[] = [
    { kind: "injury", side: "user", minute: 45, slot: 4, player: id(5) },
    {
      kind: "sub",
      side: "user",
      minute: 45,
      slot: 4,
      out: id(5),
      in: id(21),
      reason: "injury",
      by: "auto",
    },
    { kind: "injury", side: "user", minute: 70, slot: 6, player: id(7) },
  ];

  it("stops at kickoff, the injury at 45 before the half-time whistle, and each later injury", () => {
    expect(stopsFor(match(injured), LINEUP).map((s) => s.key)).toEqual([
      "kickoff",
      "injury:45:4",
      "halftime",
      "injury:70:6",
    ]);
  });

  it("finds the next unanswered stop", () => {
    const stops = stopsFor(match(injured), LINEUP);
    expect(nextStop(stops, new Set(["kickoff", "injury:45:4"]), 0)?.key).toBe("halftime");
    expect(nextStop(stops, new Set(), 46)?.key).toBe("injury:70:6");
    expect(nextStop(stops, new Set(), 71)).toBeNull();
  });

  it("never stops a match with no windows", () => {
    expect(stopsFor(match(injured, false), LINEUP)).toEqual([]);
  });
});
