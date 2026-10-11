// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Gamepad2 } from "lucide-react";
import {
  IconTile,
  ListRow,
  ModuleCard,
  Pill,
  PrimaryButton,
  Sheet,
  StatusNote,
  Table,
  Tooltip,
} from "../primitives";
afterEach(cleanup);
describe("warm game primitives", () => {
  it("names a module from its title and keeps its description and figure together", () => {
    render(
      <ModuleCard
        eyebrow="Your squad"
        title="Team Score"
        description="The current lineup"
        meta="593"
      >
        <p>Synergy 12</p>
      </ModuleCard>,
    );
    expect(screen.getByRole("region", { name: "Team Score" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Team Score" })).toBeTruthy();
    expect(screen.getByText("The current lineup")).toBeTruthy();
    expect(screen.getByText("593")).toBeTruthy();
  });
  it("keeps decorative icon tiles out of the accessible name", () => {
    render(
      <a href="/play">
        <IconTile icon={Gamepad2} />
        Play
      </a>,
    );
    expect(screen.getByRole("link", { name: "Play" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("keeps pill values available as text", () => {
    render(<Pill tone="ok">Win 3-0</Pill>);
    expect(screen.getByText("Win 3-0").textContent).toBe("Win 3-0");
  });
  it("preserves native table headers and a caption", () => {
    render(
      <Table>
        <caption>Leaderboard</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Team Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Misty</th>
            <td data-numeric>845</td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "Leaderboard" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Team Score" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "845" })).toBeTruthy();
  });
  it("connects a keyboard trigger to its explanation and source", () => {
    render(
      <Tooltip
        label="Synergy details"
        title="Synergy"
        rows={[{ key: "Score", value: 12 }]}
        source="Current lineup"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Synergy details" });
    const explanation = document.getElementById(trigger.getAttribute("aria-describedby")!);
    expect(explanation?.getAttribute("role")).toBe("tooltip");
    expect(explanation?.textContent).toBe("SynergyScore12Current lineup");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
  });
  it("explains missing data without inventing a figure", () => {
    render(<StatusNote>No runs have been saved in this browser.</StatusNote>);
    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("No runs have been saved in this browser.")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
  it("makes a list row a real navigable link", () => {
    render(
      <ListRow href="/history" trailing={<Pill>3 runs</Pill>}>
        History
      </ListRow>,
    );
    expect(screen.getByRole("link", { name: "History 3 runs" }).getAttribute("href")).toBe(
      "/history",
    );
  });
  it("honors button disabled state and calls its handler once when enabled", () => {
    const onClick = vi.fn();
    const view = render(
      <PrimaryButton disabled onClick={onClick}>
        Play Friendly
      </PrimaryButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Friendly" }));
    expect(onClick).not.toHaveBeenCalled();
    view.rerender(<PrimaryButton onClick={onClick}>Play Friendly</PrimaryButton>);
    fireEvent.click(screen.getByRole("button", { name: "Play Friendly" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("names a native sheet and forwards cancel events for Escape handling", () => {
    const onCancel = vi.fn();
    render(
      <Sheet title="Pick for GK" open onCancel={onCancel}>
        <p>Choose a player.</p>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Pick for GK" });
    fireEvent(sheet, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Choose a player.")).toBeTruthy();
  });
});
