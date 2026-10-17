import { describe, expect, it } from "vitest";
import { movesetFor, type Move } from "@/data/movesets";
import { createRng } from "@/lib/rng";
import { effectFor, pickMove, playCallout, saveCallout, shotCallout } from "../moves";

const move = (
  name: string,
  damageClass: Move["damageClass"],
  power: number | null,
  type: Move["type"] = "normal",
): Move => ({
  id: name.toLowerCase(),
  name,
  type,
  damageClass,
  power,
});

describe("pickMove (catches a scorer calling a status move when they know a damaging one)", () => {
  it("only picks damaging moves with power when the species has any", () => {
    const moves = [
      move("Growl", "status", null),
      move("Ember", "special", 40, "fire"),
      move("Counter", "physical", null),
    ];
    for (let k = 0; k < 20; k++) expect(pickMove(moves, createRng(`k${k}`))?.name).toBe("Ember");
  });

  it("falls back to the species' other moves, and to null with none", () => {
    expect(pickMove([move("Splash", "status", null)], createRng("x"))?.name).toBe("Splash");
    expect(pickMove([], createRng("x"))).toBeNull();
  });

  it("picks the same move from the same seed", () => {
    const moves = movesetFor(6).moves;
    const a = Array.from({ length: 6 }, (_, k) => pickMove(moves, createRng(`s${k}`))?.name);
    const b = Array.from({ length: 6 }, (_, k) => pickMove(moves, createRng(`s${k}`))?.name);
    expect(a).toEqual(b);
  });
});

describe("callouts (catches a callout that drops the canon move or the type effect)", () => {
  it("names Charizard's canon move and draws a fire effect for Flamethrower", () => {
    const charizard = movesetFor(6);
    const rng = createRng("charizard");
    const calls = Array.from({ length: 30 }, () => shotCallout("Charizard", charizard, rng));
    const flame = calls.find((c) => c.move === "Flamethrower");
    expect(flame).toEqual({
      text: "Charizard used Flamethrower!",
      move: "Flamethrower",
      type: "fire",
      effect: "fire",
    });
  });

  it("maps the six drawn types and gives every other type the generic impact", () => {
    expect(
      ["fire", "water", "electric", "grass", "ice", "psychic", "dragon", "normal"].map((t) =>
        effectFor(t as never),
      ),
    ).toEqual(["fire", "water", "electric", "grass", "ice", "psychic", "impact", "impact"]);
  });

  it("calls the keeper's keeperMove as a shield, or a generic dive without one", () => {
    expect(saveCallout("Blastoise", movesetFor(9))).toMatchObject({ effect: "shield" });
    expect(saveCallout("Blastoise", movesetFor(9)).text).toMatch(/^Blastoise used .+!$/);
    expect(saveCallout("Ditto", { id: 132, moves: [], keeperMove: null })).toEqual({
      text: "Ditto dives!",
      move: null,
      type: null,
      effect: "dive",
    });
    expect(shotCallout("Ditto", null, createRng("x"))).toEqual({
      text: "Ditto shoots!",
      move: null,
      type: null,
      effect: "impact",
    });
  });

  it("calls a species' canon move during open play, and falls back to action copy without one", () => {
    const pikachu = movesetFor(25);
    const call = playCallout("Pikachu", pikachu, "pass", createRng("pika"));
    expect(call.text).toMatch(/^Pikachu used .+!$/);
    expect(call.move).not.toBeNull();
    expect(playCallout("Ditto", null, "pass", createRng("x"))).toEqual({
      text: "Ditto threads a pass!",
      move: null,
      type: null,
      effect: "impact",
    });
    expect(playCallout("Ditto", null, "dribble", createRng("x"))).toEqual({
      text: "Ditto surges forward!",
      move: null,
      type: null,
      effect: "impact",
    });
    expect(playCallout("Ditto", null, "duel", createRng("x"))).toEqual({
      text: "Ditto wins the tackle!",
      move: null,
      type: null,
      effect: "impact",
    });
  });
});

describe("callout draws (catches open play that shifts when the canon movesets finish loading)", () => {
  it("draws exactly one number for a shot, with or without a moveset", () => {
    const generic = createRng("shot");
    shotCallout("Ditto", null, generic);
    expect(generic.next()).toBe(0.3413346700835973);
    const canon = createRng("shot");
    shotCallout("Charizard", movesetFor(6), canon);
    expect(canon.next()).toBe(0.3413346700835973);
  });

  it("draws exactly one number for an open-play call, with or without a moveset", () => {
    const generic = createRng("shot");
    playCallout("Ditto", null, "pass", generic);
    expect(generic.next()).toBe(0.3413346700835973);
    const canon = createRng("shot");
    playCallout("Charizard", movesetFor(6), "pass", canon);
    expect(canon.next()).toBe(0.3413346700835973);
  });

  it("gives a Fire mover's shot the fire effect", () => {
    expect(shotCallout("Charizard", movesetFor(6), createRng("shot"))).toEqual({
      text: "Charizard used Flamethrower!",
      move: "Flamethrower",
      type: "fire",
      effect: "fire",
    });
  });
});
