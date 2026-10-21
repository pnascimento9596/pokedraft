// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

afterEach(cleanup);

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Match 0 of the golden cup8 draft under engine 6: the user wears poison, Goldenrod United water.
const { draft, cup } = replay(`pd7.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const MATCH = cup.matches[0] as PlayedMatch;
const LINEUP = toFullLineup(draft);
const TIMELINE = buildTimeline(MATCH, { matchIndex: 0, seed: cup.seed, lineup: LINEUP });

describe("kits on the broadcast (catches kit rings that only show while the pitch moves)", () => {
  for (const motion of [true, false]) {
    it(`sets the poison and water kits on the broadcast with motion ${motion ? "on" : "off"}`, () => {
      render(
        <Broadcast
          match={MATCH}
          timeline={TIMELINE}
          lineup={LINEUP}
          clock={30}
          now={0}
          fired={{}}
          kicks={0}
          motion={motion}
          speed={1}
        />,
      );
      const root = screen.getByTestId("broadcast");
      expect(root.style.getPropertyValue("--kit-user")).toBe("#A63EAA");
      expect(root.style.getPropertyValue("--kit-opp")).toBe("#6390F0");
    });
  }
});
