// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsView } from "@/components/results/ResultsView";
import { type CupResult, type PenKick, type Shirt, type SpeciesId } from "@/engine";
import { replayAnyVersion as replay } from "@/engine/versions";
import { loadHistory } from "@/ui/runs";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom has no scrollIntoView; a star badge tap scrolls the highlights stage.
  Element.prototype.scrollIntoView = () => {};
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

// U+2013 and U+2014, spelled as code points so this file holds no dash itself.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

// Engine-1 tokens, replayed on the retained v1 bundle. Cut with scratch scripts: cup8 Open 4-3-3 seed "seed-9" (observed 8-0-0, Team Score 845),
// cup8 Classic 4-2-3-1 seed "c-4" (observed 5-0-1, out in the quarter-final), and the same
// 16 as a builder friendly with seed "friendly-1" (observed 7-0-1, Team Score 845).
const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";
const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";
const FRIENDLY =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiZnJpZW5kbHktMSIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXSxbImwiLDIwMCwiYjAiXSxbImwiLDQ0NSwiYjEiXSxbImwiLDI1NywiYjIiXSxbImwiLDcyNCwiYjMiXSxbImwiLDg2NiwiYjQiXV1d";

// The engine-5 golden cup8 draft under the live engine-6 prefix, the one e2e/pins.ts DEEP_LINK
// opens: its matches log the assistant's tactic changes.
const LIVE_V6 = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;

async function view(token: string, variant: "live" | "shared" = "shared", cupOverride?: CupResult) {
  const { draft, cup } = await replay(token);
  return render(
    <ResultsView token={token} draft={draft} cup={cupOverride ?? cup} variant={variant} />,
  );
}

describe("ResultsView side copy (catches a shared link that calls a friend's squad You)", () => {
  it("shared view never says You or Your", async () => {
    await view(FLAWLESS, "shared");
    const results = screen.getByTestId("results");
    const walker = document.createTreeWalker(results, NodeFilter.SHOW_TEXT);
    const said: string[] = [];
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      said.push(node.textContent!);
    }
    for (const el of results.querySelectorAll("[aria-label]")) {
      said.push(el.getAttribute("aria-label")!);
    }
    expect(said.filter((t) => /\b(You|Your)\b/.test(t))).toEqual([]);
    const text = results.textContent!;
    expect(text).toContain("This squad's record, Team Score and cup finish.");
    expect(text).toContain("This lineup, Synergy links and ratings for each role.");
    expect(within(screen.getByTestId("match-G1")).getAllByText("This squad")).toHaveLength(2);
    expect(screen.getAllByRole("list", { name: "This squad's goals" })).toHaveLength(7);
    expect(screen.getByRole("group", { name: "This lineup" })).toBeTruthy();
    expect([...document.querySelectorAll("tr[data-user] th")].map((th) => th.textContent)).toEqual([
      "1This squad",
    ]);
  });

  it("a shared engine-6 run with assistant tactic changes never says You or Your (catches the match events list)", async () => {
    await view(LIVE_V6, "shared");
    const results = screen.getByTestId("results");
    const walker = document.createTreeWalker(results, NodeFilter.SHOW_TEXT);
    const said: string[] = [];
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      said.push(node.textContent!);
    }
    // Only the viewer is addressed: the Play your own button and the grading explainer.
    expect(said.filter((t) => /\b(You|Your|you|your)\b/.test(t))).toEqual([
      "Play your own",
      "Team Score blends a few things. The biggest is how well each player fits the slot they play, and a player away from their usual position fits worse. Each player's rating is a score from 0 to 100 against every other Pokémon for that job, and the three lowest are flagged as weak spots. Each line, from goalkeeper to attack, is weighed on its own, and the weak spots drag the score down, so one bad hole costs more than you might expect.",
    ]);
    expect(said).toContain("75' This squad's assistant switches to Defend");
  });

  it("a live run still says You and Your team (regression guard, no RED: behaviour already correct)", async () => {
    await view(FLAWLESS, "live");
    expect(within(screen.getByTestId("match-G1")).getAllByText("You")).toHaveLength(2);
    expect([...document.querySelectorAll("tr[data-user] th")].map((th) => th.textContent)).toEqual([
      "1Your team",
    ]);
  });
});

describe("ResultsView", () => {
  it("lets a player scout every starter and all five bench members from the scouting rows", async () => {
    await view(FLAWLESS);
    const scout = screen.getAllByRole("button", { name: /^Scout / });
    expect(scout).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: "Scout Misdreavus" }));
    expect(screen.getByRole("dialog").textContent).toContain("Misdreavus");
  });
  it("shows the replayed record and Team Score, not a placeholder or a recomputed value", async () => {
    await view(FLAWLESS);
    expect(screen.getByTestId("results-record").textContent).toBe("8-0-0");
    expect(screen.getByTestId("results-score").textContent).toBe("845");
    expect(screen.getByText("Champions")).toBeTruthy();
    expect(screen.queryByText("Friendly (not ranked)")).toBeNull();
  });

  it("badges a builder-mode token as a friendly so it never reads as a ranked run", async () => {
    await view(FRIENDLY);
    expect(screen.getByText("Friendly (not ranked)")).toBeTruthy();
    expect(screen.getByTestId("results-record").textContent).toBe("7-0-1");
  });

  it("lists the games after elimination as Not played with the run's own opponent and rating", async () => {
    await view(ELIMINATED);
    expect(screen.getByTestId("results-record").textContent).toBe("5-0-1");
    const sf = screen.getByTestId("match-SF");
    const final = screen.getByTestId("match-F");
    // Engine-1's ladder for seed c-4 (its frozen buildLadder): SF Wyndon FC 837, F Fortree Rovers 990.
    expect(within(sf).getByText("Not played")).toBeTruthy();
    expect(within(sf).getByText("Wyndon FC")).toBeTruthy();
    expect(within(sf).getByText("837")).toBeTruthy();
    expect(within(final).getByText("Fortree Rovers")).toBeTruthy();
    expect(within(final).getByText("990")).toBeTruthy();
    expect(
      within(screen.getByTestId("match-QF")).getByText("Out in the quarter-final"),
    ).toBeTruthy();
  });

  it("shows the decree line for an engine-1 final awarded after the sudden-death cap", async () => {
    const { cup } = await replay(FLAWLESS);
    const kicks: PenKick[] = [];
    for (let i = 0; i < 25; i++) {
      kicks.push({ side: "user", taker: 1 as SpeciesId, scored: true });
      kicks.push({ side: "opp", taker: { kind: "shirt", number: 9 as Shirt }, scored: true });
    }
    kicks.push({ side: "user", taker: 1 as SpeciesId, scored: true });
    kicks.push({ side: "opp", taker: { kind: "shirt", number: 9 as Shirt }, scored: false });
    const matches = cup.matches.map((m) =>
      m.status === "played" && m.round === "F"
        ? {
            ...m,
            regulation: { user: 1, opp: 1 },
            extraTime: { user: 0, opp: 0 },
            shootout: {
              user: 26,
              opp: 25,
              keeper: 1 as SpeciesId,
              kicks,
              decider: "decree" as const,
              coinWinner: null,
            },
            outcome: "W" as const,
          }
        : m,
    );
    await view(FLAWLESS, "shared", { ...cup, matches });
    const final = screen.getByTestId("match-F");
    expect(within(final).getByText(/Won on penalties \(decided after 20 rounds\)/)).toBeTruthy();
    expect(within(final).queryByText(/26-25 on pens/)).toBeNull();
  });

  it("rates an old-engine run's eleven by quality, and a tie in the shown number keeps the engine's order (Swoobat at LCB and Swalot at CAM both show 39, only the LCB is flagged)", async () => {
    await view(ELIMINATED);
    const slots = ["GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LAM", "CAM", "RAM", "ST"];
    const rows = slots.map((slot) => screen.getByTestId(`fit-4-2-3-1.${slot}`));
    expect(rows.map((row) => within(row).getByText(/^\d+$/).textContent)).toEqual([
      "6",
      "62",
      "39",
      "16",
      "56",
      "73",
      "88",
      "43",
      "39",
      "77",
      "71",
    ]);
    expect(slots.filter((_, i) => within(rows[i]!).queryByText("Weak spot") !== null)).toEqual([
      "GK",
      "LCB",
      "RCB",
    ]);
  });

  it("describes the number on the cards: the pitch legend and the season details talk about ratings, 0 to 100 and the three lowest", async () => {
    await view(FLAWLESS);
    const legend = screen.getByRole("list", { name: "Pitch legend" });
    expect(within(legend).getByText("Weak spot: one of the 3 lowest ratings")).toBeTruthy();
    expect(within(legend).queryByText(/weakest spots/)).toBeNull();
    expect(legend.textContent).not.toMatch(DASHES);
    const details = screen.getByText("Season details: how grading works").closest("details")!;
    expect(details.textContent).not.toMatch(DASHES);
    expect(
      within(details).getByText(
        /Each player's rating is a score from 0 to 100 against every other Pokémon for that job, and the three lowest are flagged as weak spots\. Each line, from goalkeeper to attack, is weighed on its own, and the weak spots drag the score down/,
      ),
    ).toBeTruthy();
  });

  it("the season details describe the engine 3 ladder, not the old cliff from the quarter-final", async () => {
    await view(FLAWLESS);
    const details = screen.getByText("Season details: how grading works").closest("details")!;
    expect(
      within(details).getByText(
        /Matches are simulated from the Team Score against a ladder of opponents\. The group games are the gentle start\. From the Round of 32 on, every knockout round is a step up, and the Final is the hardest test\./,
      ),
    ).toBeTruthy();
    expect(details.textContent).not.toMatch(/hard from the quarter-final/);
  });

  it("shows the player of the tournament's point breakdown, and none for an old-engine run", async () => {
    const { cup } = await replay(FLAWLESS);
    await view(FLAWLESS);
    expect(screen.queryByTestId("pot-contribution")).toBeNull();
    cleanup();
    const potContribution = {
      species: cup.awards.playerOfTournament.species,
      goals: 4,
      assists: 1,
      cleanSheets: 0,
      minutes: 720,
      points: { goals: 12, assists: 2, cleanSheets: 0, minutes: 4 },
      total: 18,
    };
    await view(FLAWLESS, "shared", { ...cup, awards: { ...cup.awards, potContribution } });
    expect(screen.getByTestId("pot-contribution").textContent).toBe(
      "18 pts: goals 12, assists 2, clean sheets 0, minutes 4",
    );
  });

  it("records a live run in local history exactly once and never records a shared view", async () => {
    const first = await view(FLAWLESS, "live");
    first.unmount();
    await view(FLAWLESS, "live");
    expect(loadHistory().map((r) => [r.token === FLAWLESS, r.score, r.wins, r.finish])).toEqual([
      [true, 845, 8, "champion"],
    ]);
    cleanup();
    localStorage.clear();
    await view(ELIMINATED, "shared");
    expect(loadHistory()).toEqual([]);
  });

  it("copies a query-format /r/ link so message apps keep the payload, and offers Play your own instead of New run when shared", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await view(ELIMINATED);
    expect(screen.queryByRole("button", { name: "New run" })).toBeNull();
    expect(screen.getByRole("link", { name: "Play your own" }).getAttribute("href")).toBe("/");
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(writeText.mock.calls).toEqual([[`${location.origin}/r/pd1?t=${ELIMINATED.slice(4)}`]]);
  });

  it("renders the submit slot on a live run and never on a shared view", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    const slot = <p data-testid="submit-slot">submit here</p>;
    render(<ResultsView token={FLAWLESS} draft={draft} cup={cup} variant="live" submit={slot} />);
    expect(screen.getByTestId("submit-slot").textContent).toBe("submit here");
    cleanup();
    render(<ResultsView token={FLAWLESS} draft={draft} cup={cup} variant="shared" submit={slot} />);
    expect(screen.queryByTestId("submit-slot")).toBeNull();
  });

  it("MatchdayLive is gone: the results page has no Matchday Broadcast toggle and no text studio", async () => {
    await view(FLAWLESS);
    expect(screen.queryByTestId("toggle-matchday")).toBeNull();
    expect(screen.queryByTestId("matchday-live")).toBeNull();
    expect(screen.queryByText(/Watch Matchday Broadcast/)).toBeNull();
  });

  it("renders squad score breakdown and links match star badges to MatchHighlights", async () => {
    await view(FLAWLESS);
    const breakdown = screen.getByTestId("score-breakdown");
    expect(breakdown.textContent).toContain("GK");
    expect(breakdown.textContent).toContain("DEF");
    expect(breakdown.textContent).toContain("MID");
    expect(breakdown.textContent).toContain("ATT");
    expect(breakdown.textContent).toContain("Synergy");

    fireEvent.click(screen.getByTestId("match-star-G3"));
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 3");
  });

  it("can reselect the same match list star after using the highlight navigation", async () => {
    await view(FLAWLESS);
    fireEvent.click(screen.getByTestId("match-star-G3"));
    fireEvent.click(screen.getByTestId("highlight-chip-G2"));
    fireEvent.click(screen.getByTestId("match-star-G3"));
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 3");
  });

  it("offers Challenge this Seed, Open in Builder, and Exhibition vs this squad on shared runs", async () => {
    await view(ELIMINATED, "shared");
    const challengeLink = screen.getByTestId("challenge-seed");
    expect(challengeLink.getAttribute("href")).toBe(
      "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=c-4",
    );
    const builderLink = screen.getByTestId("open-in-builder");
    expect(builderLink.getAttribute("href")).toMatch(/^\/\?b=pd\d+\./);
    const copied = draftFromBuilderToken(
      new URL(builderLink.getAttribute("href")!, "https://example.test").searchParams.get("b")!,
    );
    expect(copied?.lineup).toEqual((await replay(ELIMINATED)).draft.lineup);

    const exhibition = screen.getByTestId("play-exhibition");
    expect(exhibition.textContent).toBe("Exhibition vs this squad");
    expect(exhibition.getAttribute("href")).toBe(`/exhibition?away=${ELIMINATED}`);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadHistory()).toEqual([]);
  });

  it("shows a zero weak-spot drag as 0, not -0", async () => {
    const { cup } = await replay(FLAWLESS);
    await view(FLAWLESS, "shared", { ...cup, rating: { ...cup.rating, drag: 0.004 } });
    const label = within(screen.getByTestId("score-breakdown")).getByText("Weak-spot drag");
    expect(label.nextElementSibling!.textContent).toBe("0");
  });

  it("shows a real weak-spot drag with its minus sign", async () => {
    const { cup } = await replay(FLAWLESS);
    await view(FLAWLESS, "shared", { ...cup, rating: { ...cup.rating, drag: 0.12 } });
    const label = within(screen.getByTestId("score-breakdown")).getByText("Weak-spot drag");
    expect(label.nextElementSibling!.textContent).toBe("-12");
  });

  it("hides the match star badge emoji from screen readers", async () => {
    await view(FLAWLESS);
    const badge = screen.getByTestId("match-star-G1");
    const spoken = badge.cloneNode(true) as HTMLElement;
    spoken.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    const shown = spoken.textContent ?? "";
    expect(shown).toContain("Hero");
    expect(shown).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

function hero(): HTMLElement {
  return screen.getByRole("heading", { level: 1 }).closest("section")!;
}

function preferReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

describe("results reveal (Wave 5 row 5e)", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("stages the hero reveal on the first live view of a run only (catches the count-up replaying on a revisit)", async () => {
    await view(FLAWLESS, "live");
    expect(hero().getAttribute("data-reveal")).toBe("staged");
    expect(screen.getByTestId("results-score").style.getPropertyValue("--score")).toBe("845");
    expect(screen.getByTestId("results-score").textContent).toBe("845");
    expect(Object.keys(sessionStorage).filter((k) => k.startsWith("pokedraft:revealed:"))).toEqual([
      expect.stringMatching(/^pokedraft:revealed:[0-9a-f]{16}$/),
    ]);
    cleanup();
    await view(FLAWLESS, "live");
    expect(hero().hasAttribute("data-reveal")).toBe(false);
    expect(screen.getByTestId("results-score").textContent).toBe("845");
  });

  it("never stages the reveal on a shared run (catches a friend's link waiting on an animation)", async () => {
    await view(FLAWLESS, "shared");
    expect(hero().hasAttribute("data-reveal")).toBe(false);
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it("reduced motion renders no count-up overlay on a first live view", async () => {
    preferReducedMotion(true);
    await view(FLAWLESS, "live");
    expect(hero().hasAttribute("data-reveal")).toBe(false);
    expect(screen.getByTestId("results-score").textContent).toBe("845");
    expect(screen.getByTestId("results-record").textContent).toBe("8-0-0");
  });

  it("puts a decorative trophy beside Champions and none on an eliminated run", async () => {
    await view(FLAWLESS, "shared");
    const trophy = within(hero()).getByTestId("results-trophy");
    expect(trophy.getAttribute("aria-hidden")).toBe("true");
    expect(within(hero()).getByText("Champions")).toBeTruthy();
    cleanup();
    await view(ELIMINATED, "shared");
    expect(screen.queryByTestId("results-trophy")).toBeNull();
  });

  it("shows the player of the tournament once, on a hero MVP card with the breakdown (catches the same fact on the card and an award tile)", async () => {
    const { cup } = await replay(FLAWLESS);
    const potContribution = {
      species: cup.awards.playerOfTournament.species,
      goals: 4,
      assists: 1,
      cleanSheets: 0,
      minutes: 720,
      points: { goals: 12, assists: 2, cleanSheets: 0, minutes: 4 },
      total: 18,
    };
    await view(FLAWLESS, "shared", { ...cup, awards: { ...cup.awards, potContribution } });
    const mvp = within(hero()).getByTestId("results-mvp");
    expect(within(mvp).getByText("Zarude")).toBeTruthy();
    expect(within(mvp).getByTestId("pot-contribution").textContent).toBe(
      "18 pts: goals 12, assists 2, clean sheets 0, minutes 4",
    );
    expect(screen.getAllByText("Player of the tournament")).toHaveLength(1);
    const awards = screen.getByRole("heading", { level: 2, name: "Awards" }).closest("section")!;
    expect([...awards.querySelectorAll(".kicker")].map((k) => k.textContent)).toEqual([
      "Golden Boot",
      "Top assister",
    ]);
  });

  it("an old-engine run's MVP card shows the name only, with no invented breakdown", async () => {
    await view(FLAWLESS, "shared");
    const mvp = within(hero()).getByTestId("results-mvp");
    expect(mvp.textContent).toBe("Player of the tournamentZarude");
    expect(within(mvp).queryByTestId("pot-contribution")).toBeNull();
  });
});

describe("results sync (Wave 5 row 5e)", () => {
  const scrolls = vi.fn();

  beforeEach(() => {
    scrolls.mockReset();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrolls,
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("a star badge tap scrolls the highlights stage into view and focuses its heading (catches a tap that changes a stage off screen)", async () => {
    await view(FLAWLESS, "shared");
    fireEvent.click(screen.getByTestId("match-star-G3"));
    expect(scrolls.mock.calls).toEqual([[{ block: "nearest", behavior: "smooth" }]]);
    expect(scrolls.mock.contexts).toEqual([screen.getByTestId("highlights-stage")]);
    expect(document.activeElement).toBe(screen.getByTestId("star-name"));
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 3");
  });

  it("a star badge tap jumps without smooth scrolling under reduced motion", async () => {
    preferReducedMotion(true);
    await view(FLAWLESS, "shared");
    fireEvent.click(screen.getByTestId("match-star-G2"));
    expect(scrolls.mock.calls).toEqual([[{ block: "nearest", behavior: "auto" }]]);
  });

  it("a highlights chip tap does not scroll the page (regression guard, no RED: behaviour already correct)", async () => {
    await view(FLAWLESS, "shared");
    fireEvent.click(screen.getByTestId("highlight-chip-G2"));
    expect(scrolls).not.toHaveBeenCalled();
  });

  it("the highlights have one visible h2 and the star's name is an h3 (catches a skipped heading level)", async () => {
    await view(FLAWLESS, "shared");
    const highlights = screen.getByTestId("match-highlights");
    expect(
      within(highlights)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Highlights"]);
    expect(within(highlights).getByText("Silph Stadium Highlights").tagName).toBe("SPAN");
    expect(screen.getByTestId("star-name").tagName).toBe("H3");
  });
});

// Bot-drafted cup8 Classic 4-3-3 runs on the live engine (scripts/audit/tokens.mts botCup8Token):
// "achievements-19" beat a Boss Club 116 above its rating from 0-1 down; "achievements-0" earned nothing.
const GIANT_KILLER_V6 =
  "pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwiYyIsInMiXSwiYWNoaWV2ZW1lbnRzLTE5IixbWyJwIiw5NzMsInMyIl0sWyJwIiw3OTIsInMwIl0sWyJwIiw4ODAsInMzIl0sWyJwIiwxMjIsInM1Il0sWyJwIiw4MCwiczEiXSxbInAiLDYyMCwiczgiXSxbInAiLDcyNywiczkiXSxbInAiLDg3MSwiczYiXSxbInAiLDE2OSwiczEwIl0sWyJwIiwxNDksInM0Il0sWyJwIiwyMjcsInM3Il0sWyJyIiwidCJdLFsiciIsInQiXSxbInIiLCJ0Il0sWyJwIiw0MzAsImIwIl0sWyJwIiwzLCJiMSJdLFsicCIsMTk2LCJiMiJdLFsicCIsOTQsImIzIl0sWyJwIiwzODEsImI0Il1dXQ";
const NO_CHIP_V6 =
  "pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwiYyIsInMiXSwiYWNoaWV2ZW1lbnRzLTAiLFtbInAiLDgxNSwiczgiXSxbInAiLDgwNCwiczkiXSxbInAiLDY5OSwiczIiXSxbInAiLDU2OSwiczAiXSxbInAiLDk1MiwiczEwIl0sWyJwIiw3NTgsInM1Il0sWyJwIiw3MzgsInMzIl0sWyJwIiwyODYsInM2Il0sWyJwIiw4OTksInM3Il0sWyJwIiw1NDcsInMxIl0sWyJwIiw4OTcsInM0Il0sWyJyIiwidCJdLFsiciIsInQiXSxbInIiLCJ0Il0sWyJwIiw3NzEsImIwIl0sWyJwIiw4NjYsImIxIl0sWyJwIiw2NjgsImIyIl0sWyJwIiwxOTUsImIzIl0sWyJwIiw2OTEsImI0Il1dXQ";

describe("achievement chip on the results hero (catches a run's best moment missing from its results)", () => {
  it("shows the run's most notable earn beside the finish on a shared run", async () => {
    await view(GIANT_KILLER_V6, "shared");
    expect(screen.getByTestId("results-achievement").textContent).toBe("Achievement: Giant killer");
  });

  it("shows the same chip on live results", async () => {
    await view(GIANT_KILLER_V6, "live");
    expect(screen.getByTestId("results-achievement").textContent).toBe("Achievement: Giant killer");
    expect(loadHistory()[0]!.achievements).toEqual(["hat-trick-hero", "comeback", "giant-killer"]);
  });

  it("shows no chip for a run with no notable earn or for a builder friendly", async () => {
    await view(NO_CHIP_V6, "shared");
    expect(screen.queryByTestId("results-achievement")).toBeNull();
    cleanup();
    await view(FRIENDLY, "shared");
    expect(screen.queryByTestId("results-achievement")).toBeNull();
  });
});
