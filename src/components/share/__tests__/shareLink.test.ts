// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { GOAL_SHARE_TEXT, LINEUP_SHARE_TEXT, runShareText, shareLink } from "../shareLink";

const RUN = { title: "pokedraft", text: "7-1-0, Team Score 812. Beat it?", path: "/r/pd6?t=abc" };

function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: coarse && q === "(pointer: coarse)",
    media: q,
  }));
}

function shareSheet(answer: () => Promise<void>, canShare = (_: ShareData) => true) {
  const calls: ShareData[] = [];
  Object.assign(navigator, {
    canShare,
    share: async (data: ShareData) => {
      calls.push(data);
      return answer();
    },
  });
  return calls;
}

function clipboard(write: (text: string) => Promise<void>) {
  const writes: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        writes.push(text);
        return write(text);
      },
    },
  });
  return writes;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("shareLink on a phone (catches Share copying silently where the share sheet exists)", () => {
  it("opens the share sheet with the title, the literal run text and the absolute link", async () => {
    pointer(true);
    const sheet = shareSheet(async () => {});
    const writes = clipboard(async () => {});
    expect(await shareLink(RUN)).toBe("shared");
    expect(sheet).toEqual([
      {
        title: "pokedraft",
        text: "7-1-0, Team Score 812. Beat it?",
        url: "http://localhost:3000/r/pd6?t=abc",
      },
    ]);
    expect(writes).toEqual([]);
  });

  it("treats a closed share sheet as cancelled and copies nothing", async () => {
    pointer(true);
    shareSheet(async () => {
      throw new DOMException("closed", "AbortError");
    });
    const writes = clipboard(async () => {});
    expect(await shareLink(RUN)).toBe("cancelled");
    expect(writes).toEqual([]);
  });

  it("copies the link when the share sheet refuses the call (NotAllowedError)", async () => {
    pointer(true);
    shareSheet(async () => {
      throw new DOMException("no activation", "NotAllowedError");
    });
    const writes = clipboard(async () => {});
    expect(await shareLink(RUN)).toBe("copied");
    expect(writes).toEqual(["http://localhost:3000/r/pd6?t=abc"]);
  });

  it("copies the link when canShare rejects the url", async () => {
    pointer(true);
    const sheet = shareSheet(
      async () => {},
      () => false,
    );
    const writes = clipboard(async () => {});
    expect(await shareLink(RUN)).toBe("copied");
    expect(sheet).toEqual([]);
    expect(writes).toEqual(["http://localhost:3000/r/pd6?t=abc"]);
  });
});

describe("shareLink on a desktop (catches a share sheet replacing the copy on a computer)", () => {
  it("copies even where navigator.share exists", async () => {
    pointer(false);
    const sheet = shareSheet(async () => {});
    const writes = clipboard(async () => {});
    expect(await shareLink(RUN)).toBe("copied");
    expect(sheet).toEqual([]);
    expect(writes).toEqual(["http://localhost:3000/r/pd6?t=abc"]);
  });

  it("returns manual when the clipboard write fails, so the caller can show the link", async () => {
    pointer(false);
    clipboard(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    expect(await shareLink(RUN)).toBe("manual");
  });

  it("returns manual when there is no clipboard at all", async () => {
    pointer(false);
    expect(await shareLink(RUN)).toBe("manual");
  });
});

describe("share texts (catches a friendly that dares a friend to beat an unranked run)", () => {
  it("dares a friend on a ranked run", () => {
    expect(runShareText({ wins: 7, draws: 1, losses: 0, score: 812, friendly: false })).toBe(
      "7-1-0, Team Score 812. Beat it?",
    );
  });

  it("says Friendly and drops the dare on a friendly", () => {
    expect(runShareText({ wins: 7, draws: 0, losses: 1, score: 845, friendly: true })).toBe(
      "Friendly: 7-0-1, Team Score 845.",
    );
  });

  it("names a goal and a builder lineup", () => {
    expect([GOAL_SHARE_TEXT, LINEUP_SHARE_TEXT]).toEqual(["Watch this goal.", "My pokedraft XI."]);
  });
});
