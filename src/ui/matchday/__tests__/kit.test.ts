import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { SPECIES } from "@/engine/species";
import type { PokemonType, SpeciesId } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { kitDistance } from "@/design/color-distance";
import { TYPE_PALETTE } from "@/design/stadium";
import { kitsFor } from "../kit";

const squad = (...ids: number[]) => ids as SpeciesId[];

// Charmander, Charmeleon, Charizard (fire and flying), Vulpix, Growlithe and Ponyta carry fire;
// Squirtle and Wartortle water; Bulbasaur grass and poison; Pikachu electric; Eevee normal.
const FIRE = squad(4, 5, 6, 37, 58, 77, 7, 8, 1, 25, 133);
// Squirtle, Wartortle, Blastoise and Magikarp carry water; Charmander, Charmeleon, Vulpix and
// Growlithe fire: four each, water first in slot order.
const WATER_FIRST = squad(7, 4, 8, 5, 9, 37, 129, 58, 25, 133, 1);
const FIRE_FIRST = squad(4, 7, 5, 8, 37, 9, 58, 129, 25, 133, 1);
// Six water starters, Gyarados (water and flying) and Lapras (water and ice) among them.
const WATER = squad(7, 8, 9, 129, 130, 131, 4, 25, 133, 1, 5);

describe("team kits on the pitch (catches one fixed colour per side, and two sides in one colour)", () => {
  it("user kit for a Fire-majority squad is TYPE_PALETTE.fire", () => {
    expect(kitsFor(FIRE, "water")).toEqual({ user: "#EE8130", opp: "#6390F0" });
  });

  it("kits fall back when both sides share a dominant type", () => {
    expect(kitsFor(FIRE, "fire")).toEqual({ user: "#EE8130", opp: "#F8FAFC" });
  });

  it("falls back when the opponent's theme looks like the user's kit to a red-green deficient eye (catches fire against rock)", () => {
    expect(kitsFor(FIRE, "rock")).toEqual({ user: "#EE8130", opp: "#F8FAFC" });
  });

  it("breaks a tie in count by slot order (catches a tie decided by type order)", () => {
    expect(kitsFor(WATER_FIRST, "ghost").user).toBe("#6390F0");
    expect(kitsFor(FIRE_FIRST, "ghost").user).toBe("#EE8130");
  });

  it("counts both types of a dual-type starter: the golden squad wears poison, tied with grass on four and first in slot 0 (catches a dual type counted once)", () => {
    const { draft } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
    expect(kitsFor(toFullLineup(draft).starters, "water")).toEqual({
      user: "#A33EA1",
      opp: "#6390F0",
    });
  });

  it("gives an opponent with no theme the broadcast's own opponent colour, unless it clashes (catches a retained run with no kit)", () => {
    expect(kitsFor(FIRE, undefined)).toEqual({ user: "#EE8130", opp: "#60A5FA" });
    expect(kitsFor(WATER, undefined)).toEqual({ user: "#6390F0", opp: "#F8FAFC" });
  });

  it("keeps every pairing of a user type and an opponent theme at least 10 apart in every vision (catches a fallback that clashes too)", () => {
    const types = Object.keys(TYPE_PALETTE) as PokemonType[];
    const close: string[] = [];
    for (const type of types) {
      const mono = SPECIES.find((s) => s.types.length === 1 && s.types[0] === type)!;
      const eleven = Array.from({ length: 11 }, () => mono.id);
      for (const theme of [...types, undefined]) {
        const kits = kitsFor(eleven, theme);
        if (kits.user !== TYPE_PALETTE[type]) close.push(`${type}: user wears ${kits.user}`);
        if (kitDistance(kits.user, kits.opp) < 10) close.push(`${type} v ${theme}`);
      }
    }
    expect(close).toEqual([]);
  });
});
