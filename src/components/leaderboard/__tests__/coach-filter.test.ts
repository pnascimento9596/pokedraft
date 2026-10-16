import { describe, expect, it } from "vitest";
import { filterCoached } from "../format";

const ROWS = [
  { rank: 1, coached: true },
  { rank: 2, coached: false },
  { rank: 3, coached: true },
  { rank: 4, coached: false },
];

describe("filterCoached (catches a board filter that drops, reorders or re-ranks rows)", () => {
  it("keeps every row, in order, for All", () => {
    expect(filterCoached(ROWS, "all").map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("keeps only coached rows and their board ranks for Coached", () => {
    expect(filterCoached(ROWS, "coached").map((r) => r.rank)).toEqual([1, 3]);
  });

  it("keeps only uncoached rows and their board ranks for Uncoached", () => {
    expect(filterCoached(ROWS, "uncoached").map((r) => r.rank)).toEqual([2, 4]);
  });
});
