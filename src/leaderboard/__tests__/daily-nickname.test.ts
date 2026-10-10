import { describe, expect, it } from "vitest";
import { dailyDate, previousDate } from "../daily";
import { parseNickname } from "../nickname";
import { toIsoDate } from "@/engine";

describe("dailyDate (catches a daily that rolls over at UTC midnight instead of New York)", () => {
  it("uses America/New_York, across the DST change", () => {
    expect(dailyDate(new Date("2026-10-10T03:59:00Z"))).toBe("2026-10-09");
    expect(dailyDate(new Date("2026-10-10T04:00:00Z"))).toBe("2026-10-10");
    expect(dailyDate(new Date("2026-12-01T04:59:00Z"))).toBe("2026-11-30");
    expect(dailyDate(new Date("2026-12-01T05:00:00Z"))).toBe("2026-12-01");
  });

  it("steps back across month and year ends", () => {
    expect(previousDate(toIsoDate("2026-03-01"))).toBe("2026-02-28");
    expect(previousDate(toIsoDate("2027-01-01"))).toBe("2026-12-31");
  });
});

describe("parseNickname (catches untrimmed or abusive names on the board)", () => {
  it("trims and collapses spaces", () => {
    expect(parseNickname("  Ash   Ketchum ")).toEqual({ ok: true, nickname: "Ash Ketchum" });
    expect(parseNickname("verify-bot")).toEqual({ ok: true, nickname: "verify-bot" });
  });

  it("rejects bad lengths, characters and blocked words", () => {
    expect(parseNickname("a")).toEqual({ ok: false, reason: "length" });
    expect(parseNickname("x".repeat(21))).toEqual({ ok: false, reason: "length" });
    expect(parseNickname("<b>hi</b>")).toEqual({ ok: false, reason: "characters" });
    expect(parseNickname("N4zi fan")).toEqual({ ok: false, reason: "blocked" });
  });
});
