// @vitest-environment jsdom
// Theme 7F: the draft speaks its outcomes through the page's one live region (SC-13, SC-14). The
// region is on the page before the run starts, so its first message is a change, not an insert.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Announcer } from "@/components/Announcer";
import { PlayScreen } from "../PlayScreen";

const query = { current: "" };
const motion = { reduce: true };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  motion.reduce = true;
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce") && motion.reduce,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
});

const SQUAD_FIRST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";

const said = () => screen.getByTestId("announcer").textContent;

// Messages are batched to the end of the task, so a pick and the next roll are one message.
async function flush() {
  await act(async () => {});
}

function open(q: string) {
  query.current = q;
  render(
    <>
      <PlayScreen />
      <Announcer />
    </>,
  );
}

// Start loads the draft with import(), so the board appears a tick later.
async function begin(): Promise<void> {
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
}

async function draftAll() {
  for (let round = 1; round <= 16; round++) {
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      )!,
    );
    await flush();
  }
}

describe("draft announcements", () => {
  it("has one polite status region that is empty before Start and says the first roll after it", async () => {
    open(SQUAD_FIRST);
    const region = screen.getByTestId("announcer");
    expect({ role: region.getAttribute("role"), text: region.textContent }).toEqual({
      role: "status",
      text: "",
    });
    await begin();
    await flush();
    expect({ same: screen.getByTestId("announcer") === region, text: said() }).toEqual({
      same: true,
      text: "Region: Hoenn. Type: Poison.",
    });
  });

  it("says the pick, the new round and its roll as one message", async () => {
    open(SQUAD_FIRST);
    await begin();
    await flush();
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: /Empty ST slot/ }));
    await flush();
    expect(said()).toBe("Signed Gulpin at ST. Round 2 of 16. Region: Hoenn. Type: Fighting.");
  });

  it("says a reroll, how many are left, and the new roll", async () => {
    open(SQUAD_FIRST);
    await begin();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /^Reroll type/ }));
    await flush();
    expect(said()).toBe("Rerolled the type, 2 left. Type: Fighting.");
  });

  it("says when the draft is complete, and then each tap swap", async () => {
    open(SQUAD_FIRST);
    await begin();
    await flush();
    await draftAll();
    expect(said()).toBe(
      "Signed Binacle at SUB 5. Draft complete, 16 of 16 signed. Tap two players to swap them.",
    );
    fireEvent.click(screen.getByTestId("slot-s0"));
    await flush();
    expect(said()).toBe(
      "GK Dustox selected. Tap another slot to swap Dustox, or tap it again to cancel.",
    );
    fireEvent.click(screen.getByTestId("slot-s9"));
    await flush();
    expect(said()).toBe("Moved Dustox to ST and Yamper to GK.");
    fireEvent.click(screen.getByTestId("slot-s1"));
    await flush();
    fireEvent.click(screen.getByTestId("slot-s1"));
    await flush();
    expect(said()).toBe("Swap cancelled.");
  });

  it("says the same hint again when it is repeated, by changing the region's text", async () => {
    open(SQUAD_FIRST);
    await begin();
    await flush();
    const texts: (string | null)[] = [];
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Empty ST slot/ }));
      await flush();
      texts.push(said());
    }
    expect(texts).toEqual([
      "Choose a player first, then tap a slot.",
      "Choose a player first, then tap a slot. ",
    ]);
  });

  it("with motion on, says the roll once, after the last wheel stops, never the region alone", async () => {
    motion.reduce = false;
    open(SQUAD_FIRST);
    await begin();
    vi.useFakeTimers();
    const spoken: string[] = [];
    for (let t = 0; t < 12_000; t += 50) {
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      const text = said() ?? "";
      if (text !== "" && spoken[spoken.length - 1] !== text) spoken.push(text);
    }
    expect(spoken).toEqual(["Region: Hoenn. Type: Poison."]);
  });
});
