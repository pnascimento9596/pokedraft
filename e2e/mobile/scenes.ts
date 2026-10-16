import { expect, type Locator, type Page } from "@playwright/test";
import { settle, waitForHydration } from "./helpers";

// ---------------------------------------------------------------------------------------------
// Challenge URLs. The two seeds are the ones e2e/challenge.spec.ts pins, so a tap-only run that
// makes the same picks as draftSixteen must reach the same records.

export const PLAY_8_0 =
  "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80";
export const PLAY_151 = "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151";
export const DAILY = "/daily";
export const RECORD_8_0 = "1-2-1";
export const RECORD_151 = "3-0-2";

// The real engine-1 share link e2e/a11y.spec.ts and e2e/old-links.spec.ts open.
export const SHARED_RUN =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

// ---------------------------------------------------------------------------------------------
// The leaderboard is always stubbed. Every request to /api/leaderboard is answered here, so none
// of them reaches the host under test, and a POST can never write a row to a real board.

export interface BoardReply {
  readonly status: number;
  readonly body: unknown;
}

interface BoardRow {
  readonly rank: number;
  readonly nickname: string;
  readonly mode: "cup8" | "kanto151";
  readonly variant: string;
  readonly dailyDate: string | null;
  readonly token: string;
  readonly teamScore: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly createdAt: string;
  readonly coached: boolean;
}

export function boardRow(rank: number): BoardRow {
  // Every fifth row carries the widest possible nickname: 20 capital Ws.
  const nickname = rank % 5 === 1 ? "W".repeat(20) : `Trainer ${rank}`;
  return {
    rank,
    nickname,
    mode: "cup8",
    variant: "classic3.squadFirst.g123456789",
    dailyDate: null,
    token: `pd3.e2e-row-${rank}`,
    teamScore: 990 - rank * 7,
    wins: Math.max(0, 8 - Math.floor(rank / 7)),
    draws: rank % 3,
    losses: rank % 2,
    createdAt: "2026-10-09T12:00:00.000Z",
    // Every fourth row was coached from the touchline, so the chip shows in the phone scenes.
    coached: rank % 4 === 2,
  };
}

export const BOARD_EMPTY: BoardReply = { status: 200, body: { coach: "all", entries: [] } };
export const BOARD_ONE: BoardReply = {
  status: 200,
  body: { coach: "all", entries: [boardRow(1)] },
};
export const BOARD_FIFTY: BoardReply = {
  status: 200,
  body: { coach: "all", entries: Array.from({ length: 50 }, (_, i) => boardRow(i + 1)) },
};
export const BOARD_DOWN: BoardReply = {
  status: 503,
  body: { error: { code: "DB_UNAVAILABLE", message: "down" } },
};

/** Answers every /api/leaderboard request. Returns the list of requests it saw. */
export async function stubLeaderboard(
  page: Page,
  reply: BoardReply = BOARD_EMPTY,
): Promise<string[]> {
  const seen: string[] = [];
  await page.route(/\/api\/leaderboard(\?|$)/, (route) => {
    const request = route.request();
    seen.push(`${request.method()} ${new URL(request.url()).search}`);
    if (request.method() === "POST") {
      // Echo the nickname so a scene can show the widest one a player may type.
      const body = request.postDataJSON() as { nickname?: unknown } | null;
      const nickname = typeof body?.nickname === "string" ? body.nickname : "Stub";
      return route.fulfill({
        status: 201,
        json: { entry: { ...boardRow(4), nickname, dailyDate: "2026-10-09" } },
      });
    }
    if (request.method() === "GET")
      return route.fulfill({ status: reply.status, json: reply.body });
    return route.fulfill({
      status: 405,
      json: { error: { code: "METHOD_NOT_ALLOWED", message: "stub" } },
    });
  });
  return seen;
}

/** The share-card endpoints are never needed by a test. Abort them rather than hit a host. */
export async function blockCardRequests(page: Page): Promise<void> {
  await page.route(/\/(card|opengraph-image)(\?|\/|$)/, (route) => route.abort());
}

// ---------------------------------------------------------------------------------------------
// Seeds for localStorage, written before the app runs and only when the key is still empty.

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2", "3-4-3"] as const;
const BUCKETS = ["cup8:classic3", "cup8:open", "kanto151", "builder"] as const;
const FINISHES = ["champion", "F", "SF", "QF", "R16", "R32", "group"] as const;

export const HISTORY = Array.from({ length: 12 }, (_, i) => ({
  token: `pd3.e2e-history-${i}`,
  bucket: BUCKETS[i % BUCKETS.length],
  friendly: BUCKETS[i % BUCKETS.length] === "builder",
  formation: FORMATIONS[i % FORMATIONS.length],
  score: 880 - i * 23,
  wins: Math.max(0, 8 - i),
  draws: i % 3,
  losses: i % 2,
  finish: FINISHES[i % FINISHES.length],
  flawless: i === 0,
  at: `2026-10-0${(i % 9) + 1}T1${i % 10}:30:00.000Z`,
}));

// A complete saved Builder squad (Pokedex 1 to 16), the one the exhibition plays with.
export const BUILDER_SQUAD = `pd5.${Buffer.from(
  JSON.stringify([
    ["b", "4-3-3", "123456789", 1],
    "experience-proof",
    Array.from({ length: 16 }, (_, index) => [
      "l",
      index + 1,
      index < 11 ? `s${index}` : `b${index - 11}`,
    ]),
  ]),
).toString("base64url")}`;

export const STATS = {
  "cup8:open": { runs: 12, bestScore: 845, bestRecord: { wins: 8, draws: 0, losses: 0 } },
  "cup8:classic3": { runs: 31, bestScore: 1002, bestRecord: { wins: 7, draws: 1, losses: 0 } },
  kanto151: { runs: 4, bestScore: 777, bestRecord: { wins: 5, draws: 2, losses: 1 } },
  builder: { runs: 120, bestScore: 1234, bestRecord: { wins: 8, draws: 0, losses: 0 } },
};

export async function seedStorage(
  page: Page,
  items: Readonly<Record<string, unknown>>,
): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    }
  }, items);
}

// ---------------------------------------------------------------------------------------------
// Driving the draft from inside the page, for scenes that only need the app in a state. It clicks
// the first offered player and then the first open slot, once per round, without Playwright's
// actionability waits: each of the 32 clicks of a draft waits for the page to hold still, and on
// WebKit for Linux every wait is several software-painted frames, so one draft took over 20 s
// there. A DOM click runs the same React handlers. Flows that judge reach use tapInView instead.
// The waits are on the DOM (a MutationObserver with a 15 s cap), not on time.

export async function draftRounds(page: Page, rounds: number): Promise<void> {
  const failure = await page.evaluate(async (count): Promise<string | null> => {
    const until = (ok: () => boolean): Promise<boolean> =>
      new Promise((resolve) => {
        if (ok()) return resolve(true);
        const finish = (value: boolean) => {
          observer.disconnect();
          clearTimeout(timer);
          resolve(value);
        };
        const observer = new MutationObserver(() => {
          if (ok()) finish(true);
        });
        const timer = setTimeout(() => finish(ok()), 15_000);
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });
      });
    const header = () =>
      (document.querySelector('[data-testid="round-header"]')?.textContent ?? "").trim();
    const candidate = () => document.querySelector<HTMLElement>('[data-testid^="candidate-"]');
    const openSlot = () =>
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      );

    for (let round = 1; round <= count; round++) {
      if (!(await until(() => header().includes(`Round ${round} of 16`))))
        return `round ${round}: the header reads "${header()}"`;
      if (!(await until(() => candidate() !== null))) return `round ${round}: no player is offered`;
      candidate()!.click();
      if (!(await until(() => openSlot() !== null)))
        return `round ${round}: no open slot after picking a player`;
      openSlot()!.click();
    }
    return null;
  }, rounds);
  if (failure !== null) throw new Error(`harness: the draft stopped. ${failure}`);
}

/** The locator is on screen, hydrated by React, and no entrance animation is still running. */
export async function ready(page: Page, locator: Locator): Promise<void> {
  await expect(locator.first()).toBeVisible();
  await waitForHydration(locator);
  await settle(page);
}

/** A finished Daily: the results page with the submit panel and its inline link. */
async function dailyResults(page: Page): Promise<void> {
  await startRun(page, DAILY);
  await draftRounds(page, 16);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("results-record")).toBeVisible();
  await expect(page.getByTestId("submit-panel")).toBeVisible();
  await settle(page);
}

async function startRun(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await ready(page, page.getByTestId("run-start"));
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
  await settle(page);
}

// ---------------------------------------------------------------------------------------------
// The scene catalogue. Groups 2, 3 and 7 walk it; each scene is one route in one state.

export interface Scene {
  /** Short name used in test titles and failure messages. */
  readonly id: string;
  readonly route: string;
  /** Leaves `page` on the scene at its current viewport, hydrated and settled. */
  readonly open: (page: Page) => Promise<void>;
  /** The one control the screen exists for. Group 7 checks it can be reached and is not covered. */
  readonly primary: (page: Page) => Locator;
  /** A modal dialog owns the screen, so the page behind it is not what the player scrolls. */
  readonly modal?: boolean;
}

const board = (view: string, reply: BoardReply) => async (page: Page) => {
  await stubLeaderboard(page, reply);
  await page.goto(`/leaderboard?${view}`);
  await expect(page.getByText("Loading the board")).toHaveCount(0);
  await settle(page);
};

const firstCandidate = (page: Page) => page.locator('[data-testid^="candidate-"]').first();

export const SCENES: readonly Scene[] = [
  {
    id: "home",
    route: "/",
    open: async (page) => {
      await page.goto("/");
      await ready(page, page.getByRole("button", { name: "Randomize" }));
    },
    primary: (page) => page.getByRole("button", { name: "Play 8-0 Challenge" }),
  },
  {
    id: "home settings open",
    route: "/",
    open: async (page) => {
      await seedStorage(page, { "pokedraft:stats:v1": STATS });
      await page.goto("/");
      await ready(page, page.getByRole("button", { name: "Hide settings and records" }));
      await expect(page.getByRole("heading", { name: "Your records" })).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("button", { name: "Play 8-0 Challenge" }),
  },
  {
    id: "play confirmation open",
    route: "/",
    modal: true,
    open: async (page) => {
      await page.goto("/");
      const play = page.getByRole("button", { name: "Play 8-0 Challenge" });
      await ready(page, play);
      await play.click();
      await expect(page.getByRole("dialog", { name: "Settings confirmed?" })).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("dialog").getByRole("button", { name: "Yes, play" }),
  },
  {
    id: "builder full",
    route: "/",
    open: async (page) => {
      await page.goto("/");
      await ready(page, page.getByRole("button", { name: "Randomize" }));
      await page.getByRole("button", { name: "Randomize" }).click();
      await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
      await settle(page);
    },
    primary: (page) => page.getByRole("button", { name: "Play a friendly cup" }),
  },
  {
    id: "picker open",
    route: "/",
    modal: true,
    open: async (page) => {
      await page.goto("/");
      await ready(page, page.getByTestId("slot-s6"));
      await page.getByTestId("slot-s6").click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.locator('dialog[open] [data-testid^="pick-"]').first(),
  },
  {
    id: "play start",
    route: "/play",
    open: async (page) => {
      await page.goto(PLAY_8_0);
      await ready(page, page.getByTestId("run-start"));
    },
    primary: (page) => page.getByTestId("run-start"),
  },
  {
    id: "draft round 1",
    route: "/play",
    open: (page) => startRun(page, PLAY_8_0),
    primary: firstCandidate,
  },
  {
    id: "draft round 9",
    route: "/play",
    open: async (page) => {
      await startRun(page, PLAY_8_0);
      await draftRounds(page, 8);
      await expect(page.getByTestId("round-header")).toContainText("Round 9 of 16");
      await expect(firstCandidate(page)).toBeVisible();
      await settle(page);
    },
    primary: firstCandidate,
  },
  {
    id: "draft 151 round 1",
    route: "/play",
    open: (page) => startRun(page, PLAY_151),
    primary: firstCandidate,
  },
  {
    id: "results",
    route: "/play",
    open: async (page) => {
      await startRun(page, PLAY_8_0);
      await draftRounds(page, 16);
      await page.getByTestId("see-results").click();
      await expect(page.getByTestId("results-record")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("button", { name: "Share", exact: true }),
  },
  {
    id: "matchday pre-match",
    route: "/play",
    open: async (page) => {
      await seedStorage(page, { "pokedraft:panel": { managerMode: true, matchView: "quick" } });
      await startRun(page, PLAY_8_0);
      await draftRounds(page, 16);
      await page.getByTestId("see-results").click();
      await expect(page.getByTestId("prematch")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByTestId("prematch-go"),
  },
  {
    id: "matchday live touchline",
    route: "/play",
    open: async (page) => {
      await seedStorage(page, { "pokedraft:panel": { managerMode: true, matchView: "live" } });
      await startRun(page, PLAY_8_0);
      await draftRounds(page, 16);
      await page.getByTestId("see-results").click();
      await page.getByTestId("prematch-go").click();
      await expect(page.getByTestId("stop-kickoff")).toBeVisible();
      await expect(page.getByTestId("broadcast")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByTestId("stop-go"),
  },
  {
    id: "daily results",
    route: "/daily",
    open: dailyResults,
    primary: (page) => page.getByTestId("submit-button"),
  },
  {
    id: "daily results submitted",
    route: "/daily",
    open: async (page) => {
      await dailyResults(page);
      await page.getByTestId("submit-nickname").fill("W".repeat(20));
      await page.getByTestId("submit-button").click();
      await expect(page.getByTestId("submit-success")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("link", { name: "View leaderboard" }),
  },
  {
    id: "daily start",
    route: "/daily",
    open: async (page) => {
      await page.goto(DAILY);
      await expect(page.getByTestId("daily-kicker")).toBeVisible();
      await ready(page, page.getByTestId("run-start"));
    },
    primary: (page) => page.getByTestId("run-start"),
  },
  {
    id: "leaderboard 50 rows",
    route: "/leaderboard",
    open: async (page) => {
      await board("mode=cup8&scope=all", BOARD_FIFTY)(page);
      await expect(page.getByTestId("board-row")).toHaveCount(50);
    },
    primary: (page) => page.getByTestId("board-row").first().getByRole("link"),
  },
  {
    id: "leaderboard 1 row",
    route: "/leaderboard",
    open: async (page) => {
      await board("mode=cup8&scope=daily&date=2026-10-09", BOARD_ONE)(page);
      await expect(page.getByTestId("board-row")).toHaveCount(1);
    },
    primary: (page) => page.getByTestId("board-row").first().getByRole("link"),
  },
  {
    id: "leaderboard empty",
    route: "/leaderboard",
    open: async (page) => {
      await board("mode=cup8&scope=daily&date=2026-10-09", BOARD_EMPTY)(page);
      await expect(page.getByTestId("board-empty")).toBeVisible();
    },
    primary: (page) => page.getByRole("link", { name: "Play the daily" }),
  },
  {
    id: "leaderboard 503",
    route: "/leaderboard",
    open: async (page) => {
      await board("mode=cup8&scope=daily&date=2026-10-09", BOARD_DOWN)(page);
      await expect(page.getByTestId("board-error")).toBeVisible();
    },
    primary: (page) => page.getByRole("button", { name: "Try again" }),
  },
  {
    id: "history empty",
    route: "/history",
    open: async (page) => {
      await page.goto("/history");
      await expect(page.getByTestId("history-empty")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("link", { name: "Start a run" }),
  },
  {
    id: "history seeded",
    route: "/history",
    open: async (page) => {
      await seedStorage(page, { "pokedraft:history:v1": HISTORY });
      await page.goto("/history");
      await expect(page.getByTestId("history-list")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByTestId("history-list").getByRole("link").first(),
  },
  {
    id: "how to play",
    route: "/how-to-play",
    open: async (page) => {
      await page.goto("/how-to-play");
      await expect(page.getByRole("heading", { name: "How to play", level: 1 })).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("link", { name: "Start drafting" }),
  },
  {
    id: "shared run",
    route: "/r/<token>",
    open: async (page) => {
      await page.goto(`/r/${SHARED_RUN}`);
      await ready(page, page.getByRole("button", { name: "Share", exact: true }));
      await expect(page.getByTestId("results-record")).toBeVisible();
    },
    primary: (page) => page.getByRole("button", { name: "Share", exact: true }),
  },
  {
    id: "two-leg exhibition",
    route: "/r/<token> exhibition",
    modal: true,
    open: async (page) => {
      await seedStorage(page, { "pokedraft.builder": BUILDER_SQUAD });
      await page.goto(`/r/${SHARED_RUN}`);
      await ready(page, page.getByTestId("play-exhibition"));
      await page.getByTestId("play-exhibition").click();
      const modal = page.getByTestId("exhibition-modal");
      await modal.getByRole("button", { name: "Two legs" }).click();
      await expect(modal.getByTestId("exhibition-aggregate")).toBeVisible();
      await settle(page);
    },
    primary: (page) =>
      page.getByTestId("exhibition-modal").getByRole("button", { name: "Play rematch" }),
  },
  {
    id: "broken run link",
    route: "/r/garbage",
    open: async (page) => {
      await page.goto("/r/garbage-not-a-token");
      await expect(page.getByTestId("run-error")).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("link", { name: "Play a new run" }),
  },
  {
    id: "404",
    route: "/nope-404",
    open: async (page) => {
      await page.goto("/nope-404");
      await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
      await settle(page);
    },
    primary: (page) => page.getByRole("link", { name: "Back to the start" }),
  },
];
