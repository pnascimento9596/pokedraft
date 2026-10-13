// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Pitch } from "../Pitch";
import { applyAction, createDraft, speciesById, type Seed, type SpeciesId } from "@/engine";

afterEach(cleanup);
const draft = createDraft({ mode: "builder", formation: "4-3-3", gens: [1], legendaries: false }, "silph" as Seed);
const filled = applyAction(draft, { type: "place", species: 1 as SpeciesId, slot: { kind: "starter", index: 2 } });
it("shows authentic Bulbasaur types and Defender role inside its HTML card", () => {
 render(<Pitch formation="4-3-3" lineup={filled.lineup} speciesOf={speciesById} onSlotTap={() => {}} />);
 const card = screen.getByTestId("slot-s2");
 expect(within(card).getByText("Grass").textContent).toBe("Grass");
 expect(within(card).getByText("Poison").textContent).toBe("Poison");
 expect(within(card).getByText("DF").textContent).toBe("DF");
 expect(card.closest("foreignObject")).toBeNull();
 expect(within(card).queryByTestId("rating-note")).toBeNull();
});
it("empty slots invite drafting and bench count reflects actual filled substitutes", () => {
 render(<Pitch formation="4-3-3" lineup={draft.lineup} speciesOf={speciesById} onSlotTap={() => {}} />);
 expect(within(screen.getByTestId("slot-s0")).getByText("Tap to Draft!").textContent).toBe("Tap to Draft!");
 expect(screen.getByText("Bench (0/5)").textContent).toBe("Bench (0/5)");
});
