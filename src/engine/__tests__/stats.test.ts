import { describe, expect, it } from "vitest";
import { awards, type PlayerTally } from "../stats";
import type { SpeciesId } from "../types";

function tally(
  species: number,
  goals: number,
  assists: number,
  appearances: number,
  cleanSheetPoints = 0,
  quality = 0.5,
): PlayerTally {
  return { species: species as SpeciesId, goals, assists, appearances, cleanSheetPoints, quality };
}

describe("awards", () => {
  it("breaks a Golden Boot tie on assists, then fewer appearances, then species id", () => {
    const result = awards([
      tally(30, 3, 1, 8),
      tally(20, 3, 2, 8),
      tally(10, 3, 2, 7),
      tally(5, 3, 2, 7),
      tally(40, 2, 9, 8),
    ]);
    expect(result.goldenBoot).toEqual({ species: 5, goals: 3, assists: 2, appearances: 7 });
  });

  it("breaks a top assister tie on goals, then fewer appearances, then species id", () => {
    const result = awards([
      tally(30, 0, 4, 8),
      tally(20, 1, 4, 8),
      tally(11, 1, 4, 6),
      tally(12, 1, 4, 6),
    ]);
    expect(result.topAssister).toEqual({ species: 11, goals: 1, assists: 4, appearances: 6 });
  });

  it("gives no Golden Boot or assist award when nobody scored or assisted, but always a player", () => {
    const result = awards([tally(7, 0, 0, 8, 4, 0.9), tally(3, 0, 0, 8, 2, 0.95)]);
    expect(result).toEqual({
      goldenBoot: null,
      topAssister: null,
      playerOfTournament: { species: 7, goals: 0, assists: 0, appearances: 8 },
    });
  });

  it("weighs goals 3, assists 2 and clean-sheet points 1 each for player of the tournament", () => {
    const result = awards([
      tally(1, 2, 0, 8),
      tally(2, 0, 3, 8),
      tally(3, 0, 0, 8, 7),
      tally(4, 1, 1, 8, 1),
    ]);
    expect(result.playerOfTournament.species).toBe(3);
  });

  it("breaks a player of the tournament tie on slot quality, then species id", () => {
    const result = awards([
      tally(9, 2, 0, 8, 0, 0.6),
      tally(8, 0, 3, 8, 0, 0.7),
      tally(4, 0, 0, 8, 6, 0.7),
    ]);
    expect(result.playerOfTournament.species).toBe(4);
  });
});
