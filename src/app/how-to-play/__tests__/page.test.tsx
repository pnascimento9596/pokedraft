// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HowToPlayPage from "../page";

afterEach(cleanup);

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

  it("uses no em or en dash anywhere on the page", () => {
    const { container } = render(<HowToPlayPage />);
    expect(container.textContent).not.toMatch(/[–—]/);
  });
});
