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

  it("states the Team Score scale of 0 to 1000 and keeps the 0 to 100 line for player ratings (catches a page that never says how big a Team Score is)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Team Score" }).closest("section")!;
    expect(
      within(section).getByText(
        "Team Score sums up how good your squad is, on a scale from 0 to 1000. It mostly comes from how well each player suits the spot they play, so a natural striker up front beats a goalkeeper played out of position.",
      ),
    ).toBeTruthy();
    expect(section.textContent).toMatch(/a rating from 0 to 100 for their spot/);
  });

  it("explains the Daily from its real rules (catches a guide with no Daily section)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Daily" }).closest("section")!;
    expect(
      within(section).getByText(
        "Everyone plays the same seed today, and your run can go on the daily board.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "The Daily is an 8-0 Challenge in Open and Squad First with every generation switched on. You choose the formation before you start.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "A new Daily starts at midnight New York time. Each nickname can put one run on each day's board.",
      ),
    ).toBeTruthy();
  });

  it("explains Manager mode, its stops and the Coached mark (catches a guide with no Manager mode section)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Manager mode" }).closest("section")!;
    expect(
      within(section).getByText(
        "Switch on Manager mode to make tactics and substitutions from the touchline during each match.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "You pick a starting tactic before kickoff. The clock stops at half-time, before extra time and when an injury needs your answer.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "Manager mode always plays the match live. A run with at least one touchline decision is marked Coached, and the leaderboard can show coached and uncoached runs apart.",
      ),
    ).toBeTruthy();
  });

  it("explains Quick sim and Live match with the live pace (catches a guide with no Live match section)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Live match" }).closest("section")!;
    expect(
      within(section).getByText(
        "With Manager mode off, Quick sim takes you straight to your results. Live match plays every game out on the pitch.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "A live half takes about 25 seconds, and the clock holds on each goal and save so you can see it.",
      ),
    ).toBeTruthy();
  });

  it("explains who goes on the leaderboard and how runs rank (catches a guide that mentions the board only in passing)", () => {
    render(<HowToPlayPage />);
    const section = screen.getByRole("heading", { name: "Leaderboard" }).closest("section")!;
    expect(
      within(section).getByText(
        "Finished 8-0 and 151 Challenge runs can go on the leaderboard under a nickname. Friendlies never do.",
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        "There is a board for each day's Daily and an all-time board for each challenge. Runs rank by wins, then draws, then Team Score, and the earlier run wins a tie. Each board shows its top 50.",
      ),
    ).toBeTruthy();
  });

  it("uses no em or en dash anywhere on the page", () => {
    const { container } = render(<HowToPlayPage />);
    expect(container.textContent).not.toMatch(DASHES);
  });
});
