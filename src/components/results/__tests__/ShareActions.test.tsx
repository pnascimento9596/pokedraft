// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareActions } from "@/components/results/ShareActions";
import { ShareGoalButton } from "@/components/share/ShareGoalButton";
import { replayAnyVersion as replay } from "@/engine/versions";

// Engine 1, cup8 Open 4-3-3 seed "seed-9": observed 8-0-0, Team Score 845. The same 16 as a
// builder friendly with seed "friendly-1": observed 7-0-1, Team Score 845.
const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";
const FRIENDLY =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiZnJpZW5kbHktMSIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXSxbImwiLDIwMCwiYjAiXSxbImwiLDQ0NSwiYjEiXSxbImwiLDI1NywiYjIiXSxbImwiLDcyNCwiYjMiXSxbImwiLDg2NiwiYjQiXV1d";

let idle: (() => void)[] = [];
let fetched: string[] = [];
let sheets: ShareData[] = [];

function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: coarse && q === "(pointer: coarse)",
    media: q,
  }));
}

function shareSheet() {
  Object.assign(navigator, {
    canShare: () => true,
    share: async (data: ShareData) => {
      sheets.push(data);
    },
  });
}

async function show(token: string) {
  const { draft, cup } = await replay(token);
  render(<ShareActions token={token} draft={draft} cup={cup} variant="shared" />);
}

async function flushIdle() {
  await act(async () => {
    for (const run of idle.splice(0)) run();
    await Promise.resolve();
  });
}

beforeEach(() => {
  idle = [];
  fetched = [];
  sheets = [];
  localStorage.clear();
  vi.stubGlobal("requestIdleCallback", (run: () => void) => idle.push(run));
  vi.stubGlobal("cancelIdleCallback", () => {});
  vi.stubGlobal("fetch", async (url: string) => {
    fetched.push(url);
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { "content-type": "image/png" },
    });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(navigator, "connection");
});

describe("Share on results (catches Share that only copies on a phone with a share sheet)", () => {
  it("opens the share sheet with the record, the Team Score and the dare", async () => {
    pointer(true);
    shareSheet();
    await show(FLAWLESS);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });
    expect(sheets).toEqual([
      {
        title: "pokedraft",
        text: "8-0-0, Team Score 845. Beat it?",
        url: `http://localhost:3000/r/pd1?t=${FLAWLESS.slice(4)}`,
      },
    ]);
  });

  it("drops the dare on a friendly", async () => {
    pointer(true);
    shareSheet();
    await show(FRIENDLY);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });
    expect(sheets.map((d) => d.text)).toEqual(["Friendly: 7-0-1, Team Score 845."]);
  });

  it("shows the absolute link in a read-only Link field when the clipboard write fails", async () => {
    pointer(false);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => Promise.reject(new Error("denied")) },
    });
    await show(FLAWLESS);
    expect(screen.queryByRole("textbox", { name: "Link" })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });
    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Link" });
    expect([field.value, field.readOnly]).toEqual([
      `http://localhost:3000/r/pd1?t=${FLAWLESS.slice(4)}`,
      true,
    ]);
    expect(screen.getByRole("status").textContent).toBe("Could not copy the link");
  });
});

describe("card prefetch on results (catches a phone share sheet refused because the card rendered after the tap)", () => {
  it("fetches the card once when idle on a phone, and Download shares that blob with the run link", async () => {
    pointer(true);
    shareSheet();
    await show(FLAWLESS);
    expect(fetched).toEqual([]);
    await flushIdle();
    expect(fetched).toEqual([`/card?t=${FLAWLESS}`]);
    await flushIdle();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Download image" }));
    });
    expect(fetched).toEqual([`/card?t=${FLAWLESS}`]);
    expect(sheets.map(({ files, ...rest }) => [files?.map((f) => f.name), rest])).toEqual([
      [
        ["pokedraft-run.png"],
        {
          url: `http://localhost:3000/r/pd1?t=${FLAWLESS.slice(4)}`,
          text: "8-0-0, Team Score 845. Beat it?",
        },
      ],
    ]);
  });

  it("never prefetches on a desktop", async () => {
    pointer(false);
    await show(FLAWLESS);
    await flushIdle();
    expect([idle.length, fetched]).toEqual([0, []]);
  });

  it("never prefetches on a phone with Data Saver on", async () => {
    pointer(true);
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
    await show(FLAWLESS);
    await flushIdle();
    expect(fetched).toEqual([]);
  });
});

describe("Share this goal (catches a goal link shared with no words)", () => {
  it("opens the share sheet with Watch this goal and the goal link", async () => {
    pointer(true);
    shareSheet();
    render(<ShareGoalButton path="/r/pd6?t=abc&watch=0&at=49" minute={49} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share this goal: 49'" }));
    });
    expect(sheets).toEqual([
      {
        title: "pokedraft",
        text: "Watch this goal.",
        url: "http://localhost:3000/r/pd6?t=abc&watch=0&at=49",
      },
    ]);
  });
});
