// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoadStrip } from "../RoadStrip";

afterEach(cleanup);

describe("RoadStrip", () => {
  // Guards against presenting the nominal ladder as this run's exact opponents.
  // The engine does not export the seeded ladder (engine-followups.md item 1).
  it("labels the nominal ladder as approximate, round by round", () => {
    render(<RoadStrip />);
    expect(screen.getByText("Approximate opponent ratings")).toBeTruthy();
    expect(screen.getByText("Group match 1, opponent rating about 300")).toBeTruthy();
    expect(screen.getByText("Final, opponent rating about 980")).toBeTruthy();
  });
});
