// Literal ladders as the road strip reads them aloud, one entry per round. The numbers are cut from
// the engine once and pinned here, so a strip that drifts from the cup fails against a fixed value.

// buildLadder("golden-1", "kanto151"), the ids and scores pinned in src/engine/__tests__/cup.test.ts.
export const GOLDEN_1_KANTO151 = [
  "Group match 1, Celadon City, rating 267",
  "Group match 2, Fuchsia United, rating 302",
  "Group match 3, Pallet Town, rating 346",
  "Round of 32, Indigo Plateau United, rating 489",
  "Round of 16, Viridian FC, rating 601",
  "Quarter-final, Pewter United, rating 749",
  "Semi-final, Vermilion FC, rating 859",
  "Final, Cinnabar FC, rating 1000",
] as const;

// buildLadder(dailySeed("2026-10-10"), "cup8"), cut with a scratch script.
export const DAILY_2026_10_10_CUP8 = [
  "Group match 1, Motostoke United, rating 283",
  "Group match 2, Castelia City, rating 318",
  "Group match 3, Wyndon FC, rating 340",
  "Round of 32, Levincia City, rating 476",
  "Round of 16, Slateport United, rating 612",
  "Quarter-final, Shalour City, rating 720",
  "Semi-final, Opelucid Rovers, rating 840",
  "Final, Lumiose FC, rating 979",
] as const;
