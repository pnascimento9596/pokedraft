# Canon movesets: a presentation-only move artifact for the match broadcast

## Decision

`src/data/movesets.json` gives every species (ids 1 to 1,025, default forms, the same ids as
`pokedex.json`) up to 4 canon signature moves plus one `keeperMove`. A future animated match
broadcast reads it through `movesetFor(speciesId)` in `src/data/movesets.ts`. Nothing in
`src/engine` or `src/scouting` imports it, and it does not change `pokedex.json` or
`scouting.json`. Engine output and Team Scores are untouched.

`pnpm data:movesets` runs `scripts/data/build-movesets.mjs`, which reads PokéAPI CSVs pinned to
commit `c80757193bd0889054e36f4209762360bdaa4b95` from the shared cache, validates the result with
`MovesetsArtifactSchema`, and writes the artifact plus `src/data/movesets.sources.json`.

## Rule

The same text ships in the artifact's `about` field.

1. Candidate tiers, in order:
   - level-up moves in the most recent version group (by `version_groups.order`, not id) where the
     default form has any level-up move;
   - level-up moves from each earlier version group, most recent first;
   - machine moves from the most recent version group where the default form has any machine move.
2. Tiers are added only while fewer than 4 damaging moves are pooled. Damaging means damage class
   physical or special with a non-null power. A move keeps the first tier it appears in.
3. Rank by earlier tier, then STAB (move type is one of the species types), then higher power, then
   higher accuracy (null counts as 101), then lower move id.
4. Pick in rank order taking at most 2 moves per type, then fill any open slot from the skipped
   moves in rank order.
5. When every tier holds fewer than 4 damaging moves, the open slots take the species' other canon
   moves from the same tiers by the same rank. These are status moves or damaging moves with
   variable power (Flail, Counter, Mirror Coat), which keep their real damage class and
   `power: null`. Nothing is invented, so a species can have fewer than 4 moves.
6. `keeperMove` is the first of Protect, Detect, Endure, Wide Guard, Baneful Bunker, Spiky Shield,
   King's Shield, Obstruct, Silk Trap, Burning Bulwark that the default form learns by any method in
   any version group, else null.

Two readings of the dispatch were settled here. "Machine moves from the most recent version group"
means the most recent group in which the species has machine moves, because Magikarp, for one, has
no Scarlet/Violet machine rows. Ranking uses the tier as its first key so an extension tier only
fills slots and never pushes a newer level-up move out.

## Sources

`src/data/movesets.sources.json` pins the sha256 of each input. The builder fails if a cached file
differs from its pin. `--refresh` re-downloads and still checks the pins. The shared files match
`pokedex.sources.json`.

| File | sha256 |
| --- | --- |
| `pokemon.csv` | `16c81c33188b0eac403aa2f759fcbe9e42c611f722d263f5b5a6a5bff9f8ce6b` |
| `pokemon_types.csv` | `f1fc4bfd657a034ea3bf6972423b10276424aa068577b304a78a08996425ba05` |
| `pokemon_moves.csv` | `22a807cef26891eeac0d0c900bd363e66baf421f7ee795bc7bc3e718f23b939e` |
| `pokemon_move_methods.csv` (new) | `78b75acfcf6dca4c82da9d4851357cbbd65e61b08154eddfc2ace0efd00e408e` |
| `moves.csv` | `8aafd37bf78f19471495c05b201545180f50f0a08a2a2a844d69f9837dd39ac9` |
| `move_names.csv` | `99e23ee38ea53d1473474d463b87651deac3cd4928750f8186feae66da45c147` |
| `move_damage_classes.csv` (new) | `b7101ceca4dff152537a2fb5c439ca4030b05f86442c643812c0b7b6ccf16f1b` |
| `types.csv` | `37f039c8d722f47d51ba1c5c5ecf9b7007235b1a9a1af2827645c777b70307c8` |
| `version_groups.csv` (new) | `28da8d89d8eb4966941f81a9e62b3990510ed4d76dd774158246551a8e7707a7` |

At this commit `version_groups.csv` lists groups up to `champions` (order 32), but no species has
level-up rows past `scarlet-violet` (order 27), so Scarlet/Violet is the newest learnset in use.

## Encoding and size

The artifact holds one move table keyed by PokéAPI identifier (395 moves) and one row per species
that cites moves by identifier. The accessor joins them, so callers see full move objects. A
per-species object encoding of the same data measured 488,535 bytes minified (28,604 gzip), so the
table form was chosen from the start.

| Measure | Bytes |
| --- | --- |
| `movesets.json` on disk | 138,526 |
| gzip -9 of the file | 18,641 |
| minified JSON (what a bundler inlines) | 131,007 |
| gzip -9 of minified JSON | 18,358 |

That is under the 150 KB raw budget, so no index-array encoding was added. Nothing imports
`movesets.ts` from a client component yet, so the current client bundle is unchanged.

## Coverage

- 1,016 species get 4 moves. 9 get fewer: Metapod, Weedle, Kakuna, Ditto, Unown, Smeargle, Cosmog,
  Cosmoem, Blipbug.
- 8 species have no damaging move in any tier and get only canon non-damaging moves: Kakuna, Ditto,
  Wobbuffet, Smeargle, Wynaut, Pyukumuku, Cosmog, Cosmoem.
- `keeperMove` is Protect for 1,003 species and null for 22. Protect is first in the list and
  nearly universal, so the other nine keeper moves never win.

## Spot checks

Each was read from the cached CSVs before it became a literal test assertion.

| Species | Moves | keeperMove |
| --- | --- | --- |
| Charizard (6) | Flare Blitz, Inferno, Air Slash, Dragon Claw | Protect |
| Blastoise (9) | Wave Crash, Hydro Pump, Flash Cannon, Bite | Protect |
| Pikachu (25) | Thunder, Thunderbolt, Iron Tail, Quick Attack | Protect |
| Gengar (94) | Shadow Ball, Hex, Dream Eater, Dark Pulse | Protect |
| Magikarp (129) | Tackle, Hydro Pump, Bounce, Splash | null |
| Ditto (132) | Transform | null |
| Wobbuffet (202) | Amnesia, Mirror Coat, Splash, Destiny Bond | null |
| Smeargle (235) | Sketch | null |

Gengar's Scarlet/Violet level-up set has no poison move, so it gets no poison STAB. Magikarp's
Hydro Pump and Bounce are its Sword/Shield machine moves.

## Tests

- `scripts/data/build-movesets.test.ts` runs the rule on small CSV fixtures. Each case fails under
  a named mutation: a per-type cap of 3, null accuracy ranked as 0, version groups sorted by id, a
  keeper picked by name, and machine moves taken from the oldest group.
- `src/data/__tests__/movesets.test.ts` checks the schema, coverage of every Pokédex id with 1 to 4
  moves, that the committed file is in the builder's canonical form, the spot checks above, and the
  `RangeError` on an unknown id.
