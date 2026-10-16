// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type Opponent, type SpeciesId, type Shirt } from "@/engine";
import { BossRoster } from "../BossRoster";

afterEach(cleanup);

const boss: Opponent = {
  id: "fire-club",
  name: "Fire Club",
  score: 500,
  formation: "4-3-3",
  captain: { kind: "species", id: 6 as SpeciesId },
  tacticalStyle: "direct",
  lines: { GK: 50, DEF: 50, MID: 50, ATT: 50 },
  roster: [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136].map((id) => ({
    kind: "species",
    id: id as SpeciesId,
  })),
};

const clubRegions = [
  ["viridian-fc", "Kanto"],
  ["cerulean-city", "Kanto"],
  ["vermilion-athletic", "Kanto"],
  ["goldenrod-united", "Johto"],
  ["ecruteak-town", "Johto"],
  ["olivine-rovers", "Johto"],
  ["mahogany-fc", "Johto"],
  ["lilycove-athletic", "Hoenn"],
  ["slateport-united", "Hoenn"],
  ["mauville-city", "Hoenn"],
  ["fortree-rovers", "Hoenn"],
  ["hearthome-city", "Sinnoh"],
  ["jubilife-fc", "Sinnoh"],
  ["veilstone-united", "Sinnoh"],
  ["canalave-athletic", "Sinnoh"],
  ["castelia-city", "Unova"],
  ["nimbasa-united", "Unova"],
  ["driftveil-fc", "Unova"],
  ["opelucid-rovers", "Unova"],
  ["lumiose-fc", "Kalos"],
  ["santalune-town", "Kalos"],
  ["shalour-city", "Kalos"],
  ["coumarine-united", "Kalos"],
  ["hau-oli-city", "Alola"],
  ["konikoni-athletic", "Alola"],
  ["hammerlocke-rovers", "Galar"],
  ["motostoke-united", "Galar"],
  ["wyndon-fc", "Galar"],
  ["mesagoza-fc", "Paldea"],
  ["levincia-city", "Paldea"],
  ["pallet-town", "Kanto"],
  ["pewter-united", "Kanto"],
  ["vermilion-fc", "Kanto"],
  ["lavender-town", "Kanto"],
  ["celadon-city", "Kanto"],
  ["fuchsia-united", "Kanto"],
  ["saffron-city", "Kanto"],
  ["cinnabar-fc", "Kanto"],
  ["indigo-plateau-united", "Kanto"],
] as const;

describe("BossRoster", () => {
  it.each(clubRegions)(
    "shows the verified region for %s independently of its fire roster",
    (id, region) => {
      render(<BossRoster opponent={{ ...boss, id }} />);
      expect(screen.getByText(`${region} region`).textContent).toBe(`${region} region`);
      expect(screen.getByText("Fire theme").textContent).toBe("Fire theme");
    },
  );

  it("shows a known retained club region without inventing roster identities", () => {
    render(
      <BossRoster
        opponent={{ ...boss, id: "wyndon-fc", roster: [{ kind: "shirt", number: 1 as Shirt }] }}
      />,
    );
    expect(screen.getByText("Galar region").textContent).toBe("Galar region");
    expect(screen.getByText("Opponent shirts").textContent).toBe("Opponent shirts");
    expect(screen.queryByText("Fire theme")).toBeNull();
  });

  it("does not guess a region for an unknown club from its name or roster", () => {
    render(<BossRoster opponent={{ ...boss, name: "Wyndon FC" }} />);
    expect(screen.getByText("Fire theme").textContent).toBe("Fire theme");
    expect(screen.queryByText(/ region$/)).toBeNull();
  });
  it("lets players expand the whole Boss XI with species, assigned roles, type identity and formation", () => {
    render(<BossRoster opponent={boss} />);
    const summary = screen.getByText("Boss XI");
    expect(summary.closest("details")).toBeTruthy();
    expect(screen.getByText("4-3-3")).toBeTruthy();
    expect(screen.getByText("Fire theme")).toBeTruthy();
    expect(screen.getByText("Captain: Charizard")).toBeTruthy();
    expect(screen.getByText("Direct style")).toBeTruthy();
    const roster = screen.getByRole("list", { name: "Fire Club starting eleven", hidden: true });
    expect(within(roster).getAllByRole("listitem", { hidden: true })).toHaveLength(11);
    expect(within(roster).getByText("Charmander")).toBeTruthy();
    expect(within(roster).getByText("Flareon")).toBeTruthy();
    expect(within(roster).getByText("GK")).toBeTruthy();
    expect(within(roster).getByText("RW")).toBeTruthy();
    expect(within(roster).getAllByRole("img", { hidden: true })).toHaveLength(11);
  });

  it("labels retained opponents as shirt numbers without inventing species, theme or formation", () => {
    render(
      <BossRoster
        opponent={{
          ...boss,
          roster: Array.from({ length: 11 }, (_, i) => ({
            kind: "shirt",
            number: (i + 1) as Shirt,
          })),
        }}
      />,
    );
    expect(screen.getByText("Opponent shirts")).toBeTruthy();
    expect(
      screen.getByText(
        "Retained run: this engine recorded shirt numbers, without Pokémon identities or a formation.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("No. 1")).toBeTruthy();
    expect(screen.getByText("No. 11")).toBeTruthy();
    expect(screen.queryByText("4-3-3")).toBeNull();
    expect(screen.queryByText("Fire theme")).toBeNull();
  });
});
