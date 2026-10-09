# Fairness spec

Every draft roll in pokedraft comes from a seeded generator, and the same seed and actions always give the same draft. This page states what each roll draws from. `src/engine/__tests__/fairness.test.ts` and `src/engine/__tests__/draft-runs.test.ts` check each rule.

## Generator

- The stream is cyrb128 plus sfc32 (`src/lib/rng.ts`), the same algorithm as the scouting audit sample.
- `int(n)` is unbiased. It draws 32-bit words and rejects any word at or above `2^32 - (2^32 mod n)`, then returns the word mod `n`. `pick` and `sample` (a partial Fisher-Yates shuffle) go through `int`.
- Every pool is sorted canonically before a draw: species by id, types in the fixed `TYPES` order, regions in generation order. Insertion order never changes an outcome.

## Eligibility

A species is eligible when all of these hold:

- it is not already in the squad;
- its generation is one of the selected generations (cup8, builder) or its id is 1 to 151 (kanto151);
- in cup8 and kanto151, the squad holds fewer than 3 legendary or mythical species, or the species is neither;
- in builder, the legendaries toggle is on, or the species is neither legendary nor mythical.

## Rolls

- **Region roll (cup8).** Uniform over the selected regions that still hold at least one eligible species.
- **Type roll (cup8).** Uniform over the types for which the rolled region still holds an eligible species. The roll never lands on an empty combo. Once the squad holds 3 legendary or mythical species, those species are no longer eligible, so a combo that holds only them is skipped.
- **Offer (cup8, classic3).** 3 distinct species, uniform without replacement over the eligible species in the combo. If the combo holds fewer than 3, all of them are offered. Offer order is the draw order, and no position is favoured.
- **Open style (cup8).** The player may take any eligible species in the combo.
- **151 roll (kanto151).** Uniform over the eligible species among ids 1 to 151.

## Rerolls

- cup8 has 3 rerolls shared across the draft. Each one rerolls the type (the region stays) or the region (then a fresh type).
- kanto151 has 5 rerolls, each of which rerolls the species.
- A reroll excludes the value it replaces whenever another value exists. A type reroll never returns the same type, a region reroll never returns the same region, and a species reroll never returns the same species. When nothing else exists, the reroll is refused and not spent.

## Substreams

- Round `n` (0 to 15) draws from `deriveSubseed(seed, "draft_roll", "round:<n>:reroll:<k>")`, where `k` counts the rerolls spent in that round, starting at 0.
- A reroll in one round never shifts any other round's stream. A later round's roll can still differ when the squad differs, because eligibility depends on who was drafted.
- Rolls never read ratings, Team Score or results. There is no rubber-banding and no pity timer.
- In position-first order the player commits a slot before the roll, and the roll does not read the slot.

## Animation

The engine decides every roll before any UI shows it. A spinning wheel replays an outcome that already exists.

## Daily seed

`dailySeed(date)` = `deriveSubseed("pokedraft-daily", "daily", date)`, where `date` is `YYYY-MM-DD` in America/New_York. The engine never reads a clock; the caller passes the date.

## Tests

- Chi-square goodness of fit, 200,000 draws each with fixed seeds, threshold p > 0.001: `int(n)` for n in {2, 3, 7, 9, 18, 151, 1025}; region rolls with all generations; type rolls in a fixed region; classic3 offer position; 151 rolls.
- 10,000 seeded full runs per mode assert zero empty rolls, the legendary cap, and that a reroll leaves later rounds' rolls unchanged.
