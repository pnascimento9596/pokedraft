// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TYPE_PALETTE } from "@/design/stadium";
import { ratingFor } from "@/ui/rating";
import { Pitch } from "../Pitch";
import { applyAction, createDraft, speciesById, type Seed, type SpeciesId } from "@/engine";

afterEach(cleanup);
it("keeps Pichu's real zero keeper rating visible when a numeric note is enabled", () => {
  const state = createDraft(
    { mode: "builder", formation: "4-3-3", gens: [2], legendaries: false },
    "silph-zero" as Seed,
  );
  const lineup = applyAction(state, {
    type: "place",
    species: 172 as SpeciesId,
    slot: { kind: "starter", index: 0 },
  }).lineup;
  render(
    <Pitch
      formation="4-3-3"
      lineup={lineup}
      speciesOf={speciesById}
      onSlotTap={() => {}}
      tokenNote={() => ratingFor(speciesById(172 as SpeciesId), "GK", "GK").score}
    />,
  );
  expect(within(screen.getByTestId("slot-s0")).getByText("0").textContent).toBe("0");
});
it("owns all eighteen authentic type colors in the typed presentation palette", () => {
  expect(TYPE_PALETTE).toEqual({
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD",
  });
});
const draft = createDraft(
  { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
  "silph" as Seed,
);
const filled = applyAction(draft, {
  type: "place",
  species: 1 as SpeciesId,
  slot: { kind: "starter", index: 2 },
});
it("shows authentic Bulbasaur types and Defender role inside its HTML card", () => {
  render(
    <Pitch formation="4-3-3" lineup={filled.lineup} speciesOf={speciesById} onSlotTap={() => {}} />,
  );
  const card = screen.getByTestId("slot-s2");
  expect(within(card).getByText("Grass").textContent).toBe("Grass");
  expect(within(card).getByText("Poison").textContent).toBe("Poison");
  expect(within(card).getByText("DF").textContent).toBe("DF");
  expect(card.closest("foreignObject")).toBeNull();
  expect(within(card).queryByTestId("rating-note")).toBeNull();
});
it("filled cards keep the visible role and species contiguous in the accessible name", () => {
  render(
    <Pitch formation="4-3-3" lineup={filled.lineup} speciesOf={speciesById} onSlotTap={() => {}} />,
  );
  expect(
    screen
      .getByRole("button", { name: "LCB Bulbasaur DF LCB Bulbasaur Grass Poison" })
      .getAttribute("aria-label"),
  ).toBe("LCB Bulbasaur");
});
it("empty slots invite drafting and bench count reflects actual filled substitutes", () => {
  render(
    <Pitch formation="4-3-3" lineup={draft.lineup} speciesOf={speciesById} onSlotTap={() => {}} />,
  );
  expect(within(screen.getByTestId("slot-s0")).getByText("Tap to Draft!").textContent).toBe(
    "Tap to Draft!",
  );
  expect(screen.getByText("Bench (0/5)").textContent).toBe("Bench (0/5)");
});
