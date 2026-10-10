// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoadStrip } from "../RoadStrip";

afterEach(cleanup);

describe("RoadStrip", () => {
  // Guards against presenting the nominal ladder as this run's exact opponents. The strip shows
  // before a seed exists; the results page shows the run's exact ladder.
  it("labels the nominal ladder as approximate, round by round", () => {
    render(<RoadStrip />);
    expect(screen.getByText("Approximate opponent ratings")).toBeTruthy();
    expect(screen.getByText("Group match 1, opponent rating about 280")).toBeTruthy();
    expect(screen.getByText("Quarter-final, opponent rating about 730")).toBeTruthy();
    expect(screen.getByText("Final, opponent rating about 980")).toBeTruthy();
  });

  it("describes the even knockout climb, not the old cliff before the quarter-final", () => {
    render(<RoadStrip />);
    expect(screen.getByText(/every knockout round is a step up/)).toBeTruthy();
    expect(screen.queryByText(/warm-up/)).toBeNull();
  });
});
