// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE, stopsFor } from "@/ui/matchday/clock";
import { START, play, type PlayEnv, type PlayState } from "@/ui/matchday/player";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

afterEach(cleanup);

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Match 5 (the quarter-final) of the golden cup8 draft under engine 6: Roselia (315) goes down in
// slot 1 at 42' and the assistant brings on Kommo-o (784) from the bench.
const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const MATCH = cup.matches[5] as PlayedMatch;
const LINEUP = toFullLineup(draft);
const TIMELINE = buildTimeline(MATCH, { matchIndex: 5, seed: cup.seed, lineup: LINEUP });
const FRAME = 16;

function envWith(managed: boolean): PlayEnv {
  return {
    timeline: TIMELINE,
    stops: managed ? stopsFor(MATCH, LINEUP) : [],
    pace: PACE.live,
  };
}

function runUntil(
  state: PlayState,
  env: PlayEnv,
  now: number,
  done: (s: PlayState) => boolean,
): { state: PlayState; now: number } {
  let s = state;
  let t = now;
  while (!done(s)) {
    t += FRAME;
    s = play(s, { type: "tick", now: t, dt: FRAME, env });
    if (s.stop?.key === "halftime") {
      s = play(s, { type: "answer", key: s.stop.key });
    }
    if (t > 200_000) throw new Error("the clock never reached the condition");
  }
  return { state: s, now: t };
}

function show(state: PlayState, now: number) {
  render(
    <Broadcast
      match={MATCH}
      timeline={TIMELINE}
      lineup={LINEUP}
      clock={state.minute}
      now={now}
      fired={state.fired}
      kicks={state.kicks}
      motion={true}
      speed={state.speed}
    />,
  );
}

function slotOne() {
  const el = screen
    .getByTestId("broadcast")
    .querySelector<HTMLElement>('[data-side="user"][data-slot="1"]');
  const src = el?.querySelector("img")?.getAttribute("src") ?? "";
  return { pose: el?.dataset.pose ?? null, species: /\/(\d{4})\.\w+$/.exec(src)?.[1] ?? null };
}

function pitchSpecies(): string[] {
  return [...screen.getByTestId("broadcast").querySelectorAll("[data-side] img")].map(
    (img) => /\/(\d{4})\.\w+$/.exec(img.getAttribute("src") ?? "")?.[1] ?? "",
  );
}

describe("injury staging (catches the replacement lying down for the injured player and the assistant's pick shown during the injury stop)", () => {
  it("manager stop at 42': Roselia, not Kommo-o, lies down in slot 1 and Kommo-o is nowhere on the pitch", () => {
    const env = envWith(true);
    const at = runUntil({ ...START, running: true }, env, 0, (s) => s.stop?.kind === "injury");
    expect(at.state.minute).toBe(42);
    expect(at.state.stop?.key).toBe("injury:42:1");

    show(at.state, at.now + 100);
    expect(slotOne()).toEqual({ pose: "down", species: "0315" });
    expect(pitchSpecies()).not.toContain("0784");
    expect(screen.getByTestId("medic").textContent).toBe("Roselia is down");
    expect(screen.queryByTestId("sub-board")).toBeNull();
    cleanup();

    show(at.state, at.now + 6_000);
    expect(slotOne()).toEqual({ pose: "down", species: "0315" });
    expect(pitchSpecies()).not.toContain("0784");
    expect(screen.queryByTestId("sub-board")).toBeNull();
  });

  it("manager stop at 42': Kommo-o walks on only once the stop is answered", () => {
    const env = envWith(true);
    const at = runUntil({ ...START, running: true }, env, 0, (s) => s.stop?.kind === "injury");
    const answered = play(at.state, { type: "answer", key: "injury:42:1" });
    const after = runUntil(answered, env, at.now + 8_000, (s) => s.minute > 42);

    show(after.state, after.now + 100);
    expect(screen.getByTestId("sub-board").textContent).toBe("Kommo-oRoselia");
    expect(slotOne().species).toBe("0784");
  });

  it("watched without stops: Roselia lies down at 42', then Kommo-o walks on at the sub beat", () => {
    const env = envWith(false);
    const at = runUntil(
      { ...START, running: true },
      env,
      0,
      (s) => s.fired["injury:42:1"] !== undefined,
    );
    const hurt = at.state.fired["injury:42:1"]!;

    show(at.state, hurt + 100);
    expect(slotOne()).toEqual({ pose: "down", species: "0315" });
    expect(pitchSpecies()).not.toContain("0784");
    expect(screen.getByTestId("medic").textContent).toBe("Roselia is down");
    cleanup();

    show(at.state, hurt + 1_900);
    expect(screen.getByTestId("sub-board").textContent).toBe("Kommo-oRoselia");
    expect(slotOne().species).toBe("0784");
  });
});
