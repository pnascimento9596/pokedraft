import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseDailySaved } from "../dailySaved";

const savedSchema = z.object({
  screen: z.enum(["draft", "results", "matchday"]),
  token: z.string(),
  daily: z.string().nullable(),
});

describe("DailyScreen bundle boundaries (catches zod imported into client DailyScreen)", () => {
  it("DailyScreen source does not import zod directly", () => {
    const filePath = path.resolve(__dirname, "../DailyScreen.tsx");
    const source = readFileSync(filePath, "utf-8");
    expect(source).not.toMatch(/from\s+["']zod["']/);
    expect(source).not.toMatch(/import\s+["']zod["']/);
  });
});

describe("parseDailySaved (catches divergence from savedSchema accept and reject behavior)", () => {
  const cases: readonly { readonly name: string; readonly input: unknown }[] = [
    { name: "null", input: null },
    { name: "undefined", input: undefined },
    { name: "number", input: 42 },
    { name: "boolean true", input: true },
    { name: "boolean false", input: false },
    { name: "string", input: "foo" },
    { name: "empty string", input: "" },
    { name: "empty array", input: [] },
    { name: "primitive array", input: [1, 2, 3] },
    { name: "empty object", input: {} },
    { name: "missing token and daily", input: { screen: "draft" } },
    { name: "missing daily", input: { screen: "draft", token: "tok" } },
    { name: "missing token", input: { screen: "draft", daily: "2026-10-21" } },
    { name: "missing screen", input: { token: "tok", daily: "2026-10-21" } },
    { name: "invalid screen value", input: { screen: "other", token: "tok", daily: null } },
    { name: "screen as number", input: { screen: 1, token: "tok", daily: null } },
    { name: "token as number", input: { screen: "draft", token: 123, daily: null } },
    { name: "token as object", input: { screen: "draft", token: {}, daily: null } },
    { name: "daily as number", input: { screen: "draft", token: "tok", daily: 20261021 } },
    { name: "daily as boolean", input: { screen: "draft", token: "tok", daily: false } },
    { name: "daily as undefined", input: { screen: "draft", token: "tok", daily: undefined } },
    { name: "daily as empty object", input: { screen: "draft", token: "tok", daily: {} } },
    {
      name: "valid draft with date",
      input: { screen: "draft", token: "pd7.abc", daily: "2026-10-21" },
    },
    {
      name: "valid draft with null daily",
      input: { screen: "draft", token: "pd7.abc", daily: null },
    },
    {
      name: "valid results with null daily",
      input: { screen: "results", token: "pd7.res", daily: null },
    },
    {
      name: "valid matchday with extra properties",
      input: {
        screen: "matchday",
        token: "pd7.md",
        daily: "2026-10-21",
        matchday: { match: 0, view: "field" },
      },
    },
    {
      name: "empty string token is allowed by schema",
      input: { screen: "draft", token: "", daily: null },
    },
    {
      name: "empty string daily is allowed by schema",
      input: { screen: "draft", token: "t", daily: "" },
    },
  ];

  it.each(cases)("matches savedSchema for $name", ({ input }) => {
    const expected = savedSchema.safeParse(input);
    const actual = parseDailySaved(input);

    if (!expected.success) {
      expect(actual).toBeNull();
    } else {
      expect(actual).not.toBeNull();
      expect(actual).toEqual(expected.data);
    }
  });
});
