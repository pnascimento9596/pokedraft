import { describe, expect, it } from "vitest";
import { z } from "zod";
import { scripts } from "../../../package.json";
import rawScouting from "../scouting.json";
import rawPokedex from "../pokedex.json";
import { POKEDEX, SpeciesSchema } from "../pokedex";
import { SCOUTING, ScoutingEntrySchema } from "@/scouting/scouting-data";

describe("generated artifact validation boundary", () => {
  it("does not parse and clone the committed Pokedex again at runtime", () => {
    expect(POKEDEX === rawPokedex).toBe(true);
  });

  it("does not parse and clone committed scouting again at runtime", () => {
    expect(SCOUTING === rawScouting).toBe(true);
  });

  it("keeps Pokedex reader values identical to the public schema output", () => {
    expect(POKEDEX).toEqual(z.array(SpeciesSchema).parse(rawPokedex));
  });

  it("keeps scouting reader values identical to the public schema output", () => {
    expect(SCOUTING).toEqual(z.array(ScoutingEntrySchema).parse(rawScouting));
  });

  it("does not let the production build skip generated artifact validation", () => {
    expect(scripts.build).toBe("pnpm data:validate && next build");
  });
});
