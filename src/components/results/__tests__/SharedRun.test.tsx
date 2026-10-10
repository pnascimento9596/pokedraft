// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SharedRun } from "@/components/results/SharedRun";
import { replayAnyVersion } from "@/engine/versions";
import { A11Y_RUN_V1 } from "@/engine/versions/__tests__/fixtures";

afterEach(cleanup);

describe("SharedRun engine label (catches an old-engine run passing as a current one)", () => {
  it("labels a run replayed on an older engine", () => {
    const run = { ...replayAnyVersion(A11Y_RUN_V1), current: false };
    render(<SharedRun token={A11Y_RUN_V1} run={run} />);
    expect(screen.getByTestId("engine-label").textContent).toBe("Played on engine v1");
    expect(screen.getByTestId("results-record").textContent).toBe("8-0-0");
  });

  it("shows no label for a run on the current engine", () => {
    const run = { ...replayAnyVersion(A11Y_RUN_V1), current: true };
    render(<SharedRun token={A11Y_RUN_V1} run={run} />);
    expect(screen.queryByTestId("engine-label")).toBeNull();
  });
});
