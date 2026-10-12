import { describe, expect, it } from "vitest";
import { speciesById, type SpeciesId } from "@/engine";
import { ratingFor } from "../rating";

const pikachu = speciesById(25 as SpeciesId);

describe("ratingFor (catches the builder and the challenge screens drifting apart on one player's number, label or raw fit)", () => {
  it("rates a slot with a role at that role: Pikachu at LCB is 7 vs other CBs, raw fit 30", () => {
    expect(ratingFor(pikachu, "CB", "LCB")).toEqual({
      role: "CB",
      best: null,
      score: 7,
      versus: "vs other CBs",
      raw: "Raw fit 30 of 100 for LCB",
    });
  });

  it("rates a bench slot (no role) at the player's best role and names it: Pikachu is Best W, 75, raw fit 72", () => {
    expect(ratingFor(pikachu, null, "SUB 1")).toEqual({
      role: "W",
      best: "W",
      score: 75,
      versus: "vs other wingers",
      raw: "Raw fit 72 of 100 for W",
    });
  });

  it("names the slot, not the role, in the raw sentence for a starter slot", () => {
    expect(ratingFor(pikachu, "ST", "ST").raw).toBe("Raw fit 56 of 100 for ST");
    expect(ratingFor(pikachu, "ST", "ST").score).toBe(52);
  });
});
