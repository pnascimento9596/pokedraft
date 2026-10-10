// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyAction,
  createDraft,
  eligibleSpecies,
  speciesById,
  type DraftSettings,
  type DraftState,
  type Roll,
  type Seed,
  type SlotRef,
} from "@/engine";
import { ALL_REFS, valueAt } from "@/ui/lineup";
import { RollReveal } from "../RollReveal";
import { Wheel } from "../Wheel";
import { buildStrip, faceValue, speciesFaces, stagesFor, type RollCause } from "../reel";

afterEach(cleanup);

const SETTINGS: readonly DraftSettings[] = [
  {
    mode: "cup8",
    formation: "4-3-3",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "open",
    order: "squadFirst",
  },
  { mode: "cup8", formation: "4-4-2", gens: [1, 3, 5], style: "classic3", order: "squadFirst" },
  { mode: "kanto151", formation: "3-5-2", order: "squadFirst" },
];

function rolled(state: DraftState): Roll {
  if (state.phase.kind !== "choosing") throw new Error(`no roll in ${state.phase.kind}`);
  return state.phase.roll;
}

function firstEmpty(state: DraftState): SlotRef {
  const ref = ALL_REFS.find((r) => valueAt(state.lineup, r) === null);
  if (ref === undefined) throw new Error("lineup full");
  return ref;
}

function pickAny(state: DraftState): DraftState {
  const roll = rolled(state);
  const species =
    roll.kind === "species"
      ? roll.species
      : (roll.offers?.[0] ??
        eligibleSpecies(state).find((id) => {
          const sp = speciesById(id);
          return sp.region === roll.region && (sp.types as readonly string[]).includes(roll.type);
        })!);
  return applyAction(state, { type: "pick", species, slot: firstEmpty(state) });
}

interface Case {
  readonly settings: DraftSettings;
  readonly roll: Roll;
  readonly cause: RollCause;
}

function seededCase(i: number): Case {
  const settings = SETTINGS[i % SETTINGS.length]!;
  let state = createDraft(settings, `wheel-${i}` as Seed);
  for (let k = 0; k < i % 4; k++) state = pickAny(state);
  let cause: RollCause = "new";
  if (i % 5 === 0) {
    cause = settings.mode === "kanto151" ? "species" : i % 10 === 0 ? "region" : "type";
    state = applyAction(state, { type: "reroll", target: cause });
  }
  return { settings, roll: rolled(state), cause };
}

const CASES: readonly Case[] = Array.from({ length: 500 }, (_, i) => seededCase(i));

function expectedValues(roll: Roll, cause: RollCause): string[] {
  if (roll.kind === "species") return [String(roll.species)];
  return cause === "type" ? [roll.type] : [roll.region, roll.type];
}

describe("randomizer wheel", () => {
  it("settles on the engine roll for 500 seeded rolls, so the wheel never shows a different result than the draft", () => {
    let checked = 0;
    for (const { settings, roll, cause } of CASES) {
      const stages = stagesFor(roll, settings, cause);
      const values = stages.map((stage) => {
        const { unmount } = render(<Wheel stage={stage} state="settled" onSettle={() => {}} />);
        const value = screen.getByTestId("wheel-result").getAttribute("data-value");
        unmount();
        return value;
      });
      expect(values).toEqual(expectedValues(roll, cause));
      checked++;
    }
    expect(checked).toBe(500);
  });

  it("builds every strip to end on the landing face, so the decelerating reel stops on the roll and not on a decoration", () => {
    for (const { settings, roll, cause } of CASES) {
      for (const stage of stagesFor(roll, settings, cause)) {
        for (const laps of [1, 2, 4]) {
          const { strip, landingIndex } = buildStrip(stage.faces, stage.landing, laps);
          expect(landingIndex).toBe(strip.length - 1);
          expect(faceValue(strip[landingIndex]!)).toBe(faceValue(stage.landing));
        }
      }
    }
  });

  it("replays both region and type on a region reroll, because the engine re-rolls the type too", () => {
    const roll: Roll = { kind: "combo", region: "johto", type: "fire", offers: null };
    const settings = SETTINGS[0]!;
    expect(stagesFor(roll, settings, "region").map((st) => st.kind)).toEqual(["region", "type"]);
    expect(stagesFor(roll, settings, "type").map((st) => st.kind)).toEqual(["type"]);
    expect(stagesFor(roll, settings, "new").map((st) => st.kind)).toEqual(["region", "type"]);
  });

  it("draws species faces from real Dex neighbours wrapping inside 1 to 151, so no face shows a non-Kanto creature", () => {
    expect(speciesFaces(1 as never).map((f) => f.value)).toEqual([
      1, 2, 3, 4, 5, 6, 146, 147, 148, 149, 150, 151,
    ]);
    expect(speciesFaces(25 as never).map((f) => f.label)).toEqual([
      "Rattata",
      "Raticate",
      "Spearow",
      "Fearow",
      "Ekans",
      "Arbok",
      "Pikachu",
      "Raichu",
      "Sandshrew",
      "Sandslash",
      "Nidoran♀",
      "Nidorina",
    ]);
  });

  it("skips straight to the landing faces on tap and announces them, so tap-to-skip never strands a half-spun reel", () => {
    const roll: Roll = { kind: "combo", region: "hoenn", type: "water", offers: null };
    render(
      <RollReveal
        stages={stagesFor(roll, SETTINGS[0]!, "new")}
        instant={false}
        onDone={() => {}}
      />,
    );
    expect(screen.getByTestId("wheel").getAttribute("data-state")).toBe("spinning");
    fireEvent.click(screen.getByRole("button", { name: "Tap to skip" }));
    const results = screen
      .getAllByTestId("wheel-result")
      .map((el) => el.getAttribute("data-value"));
    expect(results).toEqual(["hoenn", "water"]);
    expect(screen.getByTestId("wheel-announce").textContent).toBe("Region: Hoenn. Type: Water.");
  });
});
