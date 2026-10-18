// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within, screen } from "@testing-library/react";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchList } from "../MatchList";

const audio = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return { ...real, unlockAudio: () => audio.events.push("unlock") };
});

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);

afterEach(cleanup);

it("Watch live unlocks audio before the autostarted broadcast opens (catches a silent Watch live)", () => {
  audio.events.length = 0;
  render(<MatchList cup={cup} draft={draft} onWatch={(i) => audio.events.push(`watch:${i}`)} />);
  expect(audio.events).toEqual([]);
  fireEvent.click(within(screen.getByTestId("match-G2")).getByTestId("watch-live"));
  expect(audio.events).toEqual(["unlock", "watch:1"]);
});
