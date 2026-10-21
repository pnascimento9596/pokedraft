import { describe, expect, it } from "vitest";
import { builderMetadata, builderTokenFromUrl } from "../builder-metadata";
import { generateMetadata as generateHomeMetadata } from "../page";

const FULL_BUILDER =
  "pd7.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsMSwiczAiXSxbImwiLDIsInMxIl0sWyJsIiwzLCJzMiJdLFsibCIsNCwiczMiXSxbImwiLDUsInM0Il0sWyJsIiw2LCJzNSJdLFsibCIsNywiczYiXSxbImwiLDgsInM3Il0sWyJsIiw5LCJzOCJdLFsibCIsMTAsInM5Il0sWyJsIiwxMSwiczEwIl0sWyJsIiwxMiwiYjAiXSxbImwiLDEzLCJiMSJdLFsibCIsMTQsImIyIl0sWyJsIiwxNSwiYjMiXSxbImwiLDE2LCJiNCJdXV0";

const PARTIAL_BUILDER =
  "pd7.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsMSwiczAiXSxbImwiLDIsInMxIl0sWyJsIiwzLCJzMiJdLFsibCIsNCwiczMiXSxbImwiLDUsInM0Il1dXQ";

describe("builderTokenFromUrl (catches invalid or malformed builder link extraction)", () => {
  it("extracts b parameter when pathname is root", () => {
    const url = new URL(`/?b=${encodeURIComponent(FULL_BUILDER)}`, "https://pokedraft.invalid");
    expect(builderTokenFromUrl(url)).toBe(FULL_BUILDER);
  });

  it("returns null when pathname is not root", () => {
    const url = new URL(`/daily?b=${encodeURIComponent(FULL_BUILDER)}`, "https://pokedraft.invalid");
    expect(builderTokenFromUrl(url)).toBeNull();
  });

  it("returns null when b parameter is missing", () => {
    const url = new URL("/", "https://pokedraft.invalid");
    expect(builderTokenFromUrl(url)).toBeNull();
  });

  it("returns null when b parameter is empty", () => {
    const url = new URL("/?b=", "https://pokedraft.invalid");
    expect(builderTokenFromUrl(url)).toBeNull();
  });

  it("returns null when multiple b parameters exist", () => {
    const url = new URL("/?b=one&b=two", "https://pokedraft.invalid");
    expect(builderTokenFromUrl(url)).toBeNull();
  });
});

describe("builderMetadata (catches missing squad preview title, description or card image)", () => {
  it("creates preview metadata for a full builder squad with Team Score", () => {
    const meta = builderMetadata(FULL_BUILDER);
    const title = "pokedraft squad: 4-3-3, Team Score 375";
    const description = "4-3-3 squad with Team Score 375. Build your own XI on pokedraft.";
    const image = {
      url: `/card?b=${encodeURIComponent(FULL_BUILDER)}`,
      width: 1200,
      height: 630,
      alt: "pokedraft squad card: 4-3-3, Team Score 375",
    };
    expect(meta).toEqual({
      title,
      description,
      openGraph: { title, description, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    });
  });

  it("creates preview metadata for a partial squad with starter count", () => {
    const meta = builderMetadata(PARTIAL_BUILDER);
    const title = "pokedraft squad: 4-3-3 (5/11 placed)";
    const description = "4-3-3 lineup with 5 of 11 starters. Build your own XI on pokedraft.";
    const image = {
      url: `/card?b=${encodeURIComponent(PARTIAL_BUILDER)}`,
      width: 1200,
      height: 630,
      alt: "pokedraft squad card: 4-3-3 (5/11 placed)",
    };
    expect(meta).toEqual({
      title,
      description,
      openGraph: { title, description, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    });
  });

  it("returns fallback title for invalid or non-builder token", () => {
    expect(builderMetadata("pd7.invalid")).toEqual({ title: "pokedraft" });
  });
});

describe("home page generateMetadata (catches missing ?b= preview on root)", () => {
  it("emits squad preview metadata when b is a valid full builder token", async () => {
    const meta = await generateHomeMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ b: FULL_BUILDER }),
    });
    expect(meta.title).toBe("pokedraft squad: 4-3-3, Team Score 375");
    expect(meta.description).toBe("4-3-3 squad with Team Score 375. Build your own XI on pokedraft.");
    expect(meta.openGraph?.images).toEqual([
      {
        url: `/card?b=${encodeURIComponent(FULL_BUILDER)}`,
        width: 1200,
        height: 630,
        alt: "pokedraft squad card: 4-3-3, Team Score 375",
      },
    ]);
  });

  it("emits fallback metadata when b is absent or invalid", async () => {
    const absent = await generateHomeMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    });
    expect(absent).toEqual({ title: "pokedraft" });

    const invalid = await generateHomeMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ b: "pd7.invalid" }),
    });
    expect(invalid).toEqual({ title: "pokedraft" });
  });
});
