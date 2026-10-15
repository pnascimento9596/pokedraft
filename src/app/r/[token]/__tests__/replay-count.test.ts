import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";

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

const TOKEN = GOLDEN_CUP8_V3;
const params = Promise.resolve({ token: TOKEN });

beforeEach(() => {
  vi.resetModules();
  calls.n = 0;
});

describe("/r/[token] replay count (catches the dispatch 3 page that replayed a token three times per view)", () => {
  it("returns and caches null when asynchronous retained replay rejects", async () => {
    const { loadRun } = await import("../run");
    expect(await loadRun("pd1.invalid")).toBeNull();
    expect(await loadRun("pd1.invalid")).toBeNull();
    expect(calls.n).toBe(1);
  });

  it("replays once for the page and its metadata in one request", async () => {
    const page = await import("../page");
    const meta = await page.generateMetadata({ params } as never);
    expect(meta.title).toBe("pokedraft run: 3-0-2, Team Score 593");
    const main = page.default({ params } as never) as {
      props: {
        children: { props: { children: Promise<{ props: { run: { cup: { wins: number } } } }> } };
      };
    };
    const shared = await main.props.children.props.children;
    expect(shared.props.run.cup.wins).toBe(3);
    expect(calls.n).toBe(1);
  });

  it("replays once for the OG image, which is its own request", async () => {
    const og = await import("../opengraph-image");
    await og.default({ params });
    expect(calls.n).toBe(1);
  });
});
