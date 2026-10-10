import { beforeEach, describe, expect, it, vi } from "vitest";
import { scriptedToken } from "@/leaderboard/server/__tests__/fixtures";

const calls = vi.hoisted(() => ({ n: 0 }));

vi.mock("@/engine/versions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/versions")>();
  return {
    ...actual,
    replayAnyVersion: (t: string) => {
      calls.n += 1;
      return actual.replayAnyVersion(t);
    },
  };
});

// React's cache() only memoizes inside a real server request; outside one it is a passthrough.
// This stand-in gives the per-request memo semantics, so the test proves every reader goes
// through loadRun, not React's own behaviour. vi.resetModules() starts a new "request".
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <A, R>(fn: (a: A) => R) => {
      const memo = new Map<A, R>();
      return (a: A) => {
        if (!memo.has(a)) memo.set(a, fn(a));
        return memo.get(a)!;
      };
    },
  };
});

const TOKEN = scriptedToken(
  {
    mode: "cup8",
    formation: "4-3-3",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "classic3",
    order: "squadFirst",
  },
  "lb-cup8",
);
const params = Promise.resolve({ token: TOKEN });

beforeEach(() => {
  vi.resetModules();
  calls.n = 0;
});

describe("/r/[token] replay count (catches the dispatch 3 page that replayed a token three times per view)", () => {
  it("replays once for the page and its metadata in one request", async () => {
    const page = await import("../page");
    const meta = await page.generateMetadata({ params } as never);
    expect(meta.title).toBe("pokedraft run: 4-1-1, Team Score 622");
    const main = page.default({ params } as never) as {
      props: {
        children: { props: { children: Promise<{ props: { run: { cup: { wins: number } } } }> } };
      };
    };
    const shared = await main.props.children.props.children;
    expect(shared.props.run.cup.wins).toBe(4);
    expect(calls.n).toBe(1);
  });

  it("replays once for the OG image, which is its own request", async () => {
    const og = await import("../opengraph-image");
    await og.default({ params });
    expect(calls.n).toBe(1);
  });
});
