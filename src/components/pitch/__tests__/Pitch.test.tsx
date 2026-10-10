// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pitch } from "@/components/pitch/Pitch";
import { createDraft, type Seed } from "@/engine";

afterEach(cleanup);

const empty = createDraft(
  { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
  "t" as Seed,
).lineup;

describe("Pitch", () => {
  it("labels every starter and bench slot so taps reach the right SlotRef", () => {
    const onSlotTap = vi.fn();
    render(<Pitch formation="4-3-3" lineup={empty} onSlotTap={onSlotTap} />);
    fireEvent.click(screen.getByRole("button", { name: "Empty LCB slot" }));
    fireEvent.click(screen.getByRole("button", { name: "Empty SUB 2 slot" }));
    expect(onSlotTap.mock.calls).toEqual([
      [{ kind: "starter", index: 2 }],
      [{ kind: "bench", index: 1 }],
    ]);
  });
});
