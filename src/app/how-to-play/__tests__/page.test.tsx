// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HowToPlayPage from "../page";

afterEach(cleanup);

// U+2013 and U+2014, spelled as code points so this file holds no dash itself.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

describe("How to play", () => {
  it("explains the 0 to 100 rating on the cards and what a weak spot is (catches copy that still describes the old fit number)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Team Score" }).closest("section")!;
    expect(
      within(section).getByText(
        "On the results screen each player gets a rating from 0 to 100 for their spot. It ranks them against every other Pokémon for that job, so 78 vs other CBs means better than about 78 of every 100 other CBs. The three lowest ratings in your eleven are flagged as weak spots.",
      ),
    ).toBeTruthy();
    expect(within(section).getByText(/your weak spots pull the score down/)).toBeTruthy();
    expect(within(section).queryByText(/weakest spots/)).toBeNull();
  });

  it("describes the engine 3 ladder: gentle group, a step up every knockout round (catches the old cliff from the quarter-final)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "The cup" }).closest("section")!;
    expect(
      within(section).getByText(
        "The group games are the gentle start. From the Round of 32 on, every knockout round is a step up, and the Final is the hardest test. Win all 8 games for a flawless 8-0.",
      ),
    ).toBeTruthy();
    expect(section.textContent).not.toMatch(/hard from the quarter-final/);
  });

  it("says the all-time leaderboard ranks Open and Classic together (catches 'tracked separately', true only of Your records)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "The 8-0 Challenge" }).closest("section")!;
    expect(
      within(section).getByText(
        /Open is easier than Classic\. Your records keep them apart, but the all-time leaderboard ranks every draft setting together and names each run's settings on its row\./,
      ),
    ).toBeTruthy();
    expect(section.textContent).not.toMatch(/tracked separately/);
  });

  it("says the builder pool follows your generations and leaves out Legendary and Mythical until Legendaries is on (catches 'any Pokémon you like')", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "The builder" }).closest("section")!;
    expect(
      within(section).getByText(
        "Pick a formation and fill all 11 starting spots and 5 bench spots with Pokémon from the generations you switch on. Legendary and Mythical Pokémon stay out until you switch on Legendaries in the settings. You can swap players around, clear a spot, or start over.",
      ),
    ).toBeTruthy();
    expect(section.textContent).not.toMatch(/any Pokémon you like/);
  });

  it("states the cap of 3 Legendary or Mythical Pokémon in both challenges", () => {
    render(<HowToPlayPage />);
    const cup8 = screen.getByRole("heading", { name: "The 8-0 Challenge" }).closest("section")!;
    expect(
      within(cup8).getByText(
        "A squad can hold at most 3 Legendary or Mythical Pokémon. After the third, they stop appearing in rolls.",
      ),
    ).toBeTruthy();
    const kanto = screen.getByRole("heading", { name: "The 151 Challenge" }).closest("section")!;
    expect(kanto.textContent).toMatch(/The same cap of 3 Legendary or Mythical Pokémon applies\./);
  });

  it("says a region reroll rolls the type again and it can repeat (catches 'a new region and a new type')", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "The 8-0 Challenge" }).closest("section")!;
    expect(
      within(section).getByText(
        "You get 3 rerolls for the whole run. Reroll the type to get a different type in the same region. Reroll the region to get a different region, and the type is rolled again, so it can come up the same.",
      ),
    ).toBeTruthy();
    expect(section.textContent).not.toMatch(/a new region and a new type/);
  });

  it("uses no em or en dash anywhere on the page", () => {
    const { container } = render(<HowToPlayPage />);
    expect(container.textContent).not.toMatch(DASHES);
  });
});
