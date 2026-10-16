import { describe, expect, it } from "vitest";
import { encodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, type DraftSettings, type Seed } from "@/engine/types";
import { isCoached } from "../coached";

const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const BASE = { v: RUN_TOKEN_VERSION, settings: SETTINGS, seed: "coach" as Seed, actions: [] };

describe("isCoached (catches a board that marks plain runs coached or misses coached ones)", () => {
  it("is true when the token carries a touchline decision", () => {
    const token = encodeToken({
      ...BASE,
      manager: [{ type: "tactic", match: 0, minute: 0, tactic: "attack" }],
    });
    expect(token.startsWith("pd6.")).toBe(true);
    expect(isCoached(token)).toBe(true);
  });

  it("is false for a token with no decisions, empty or omitted", () => {
    expect(isCoached(encodeToken(BASE))).toBe(false);
    expect(isCoached(encodeToken({ ...BASE, manager: [] }))).toBe(false);
  });

  it("is false for retained versions and for tokens that do not decode", () => {
    expect(
      isCoached("pd5.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwib3RoZXItc2VlZCIsW11d"),
    ).toBe(false);
    expect(isCoached("pd1.abc")).toBe(false);
    expect(isCoached("pd6.not-base64!")).toBe(false);
    expect(isCoached("")).toBe(false);
  });
});
