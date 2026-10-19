// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import type { ResultsVariant } from "@/components/results/format";
import { beatKey } from "@/ui/matchday/player";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

afterEach(cleanup);

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// G1 of the golden cup8 draft under engine 6: the assistant switches the user's side to Defend at
// 75'. A sub fires on the same tick, so only the switch is marked fired here.
const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const MATCH = cup.matches[0] as PlayedMatch;
const LINEUP = toFullLineup(draft);
const TIMELINE = buildTimeline(MATCH, { matchIndex: 0, seed: cup.seed, lineup: LINEUP });

const SWITCH = TIMELINE.beats.find(
  (b) => b.kind === "tactic" && b.side === "user" && b.minute === 75,
)!;

function banner(variant: ResultsVariant | undefined) {
  render(
    <Broadcast
      match={MATCH}
      timeline={TIMELINE}
      lineup={LINEUP}
      clock={75}
      now={1_100}
      fired={{ [beatKey(SWITCH)]: 1_000 }}
      kicks={0}
      motion={true}
      speed={1}
      variant={variant}
    />,
  );
  return screen.getByTestId("tactic-banner").textContent;
}

describe("Broadcast tactic banner (catches a shared run's banner saying Your side)", () => {
  it("a shared run says This squad switches to Defend", () => {
    expect(banner("shared")).toBe("This squad switches to Defend");
  });

  it("the live run still says Your side switch to Defend", () => {
    expect(banner(undefined)).toBe("Your side switch to Defend");
  });
});
