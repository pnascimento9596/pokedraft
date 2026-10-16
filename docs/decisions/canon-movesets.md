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

The same text ships in the artifact's `about` field. The rule was revised on PR #58 so each species
shows its classic signature moves (Charizard's Flamethrower, Blastoise's Water Gun). The first
version ranked the newest learnset first and dropped both.

1. Version groups are ordered by `version_groups.order`, not by id.
2. Candidate tiers, in order:
   - level-up moves in the debut version group, the earliest one where the default form has any
     level-up move;
   - level-up moves in the newest version group where it has any level-up move;
   - machine moves in the newest version group where it has any machine move.
   Version groups between the debut and the newest are not used.
3. Tiers are added only while fewer than 4 damaging moves are pooled. Damaging means damage class
   physical or special with a non-null power. A move keeps the first tier it appears in.
4. Rank by earlier tier, then STAB (move type is one of the species types), then higher power, then
   higher accuracy (null counts as 101), then lower move id. A later tier never displaces an
   earlier tier's pick.
5. Pick in rank order taking at most 2 moves per type, then fill any open slot from the skipped
   moves in rank order.
6. When the tiers hold fewer than 4 damaging moves, the open slots take the species' other canon
   moves from the same tiers by the same rank. These are status moves or damaging moves with
   variable power (Flail, Counter, Mirror Coat), which keep their real damage class and
   `power: null`. Nothing is invented, so a species can have fewer than 4 moves.
7. `keeperMove` is the first of Protect, Detect, Reflect, Light Screen, Barrier, Iron Defense,
   Harden, Withdraw, Defense Curl, Agility that the default form learns by any method in its debut
   version group. Failing that, it is the first of them learned by any method in its newest
   level-up version group. Otherwise it is null.

Readings settled here:

- **STAB stays in the ranking.** Ranking on power alone puts Tackle (id 33) ahead of Water Gun
  (id 55) for Blastoise, since both have 40 power and 100 accuracy. Blastoise would then lose Water
  Gun.
- **The Gen 1 debut.** For Gen 1 species the earliest group by `order` is `red-green-japan`, not
  `red-blue`. A build that ignored `red-green-japan` and `blue-japan` produced species and move
  tables identical to this one, so no exclusion list ships.
- **"Newest group" for the keeper fallback** means the newest level-up group, the same group as
  tier 2.

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

The artifact holds one move table keyed by PokéAPI identifier (417 moves) and one row per species
that cites moves by identifier. The accessor joins them, so callers see full move objects. A
per-species object encoding of the same data measured 486,422 bytes minified (27,465 gzip), so the
table form is kept.

| Measure | Bytes |
| --- | --- |
| `movesets.json` on disk | 139,510 |
| gzip -9 of the file | 19,043 |
| minified JSON (what a bundler inlines) | 131,859 |
| gzip -9 of minified JSON | 18,747 |

That is under the 150 KB raw budget, so no index-array encoding was added. Nothing imports
`movesets.ts` from a client component yet, so the current client bundle is unchanged.

## Coverage

- 1,015 species get 4 moves. 10 get fewer: Metapod, Weedle, Kakuna, Ditto, Unown, Smeargle,
  Wurmple, Cosmog, Cosmoem, Blipbug.
- 8 species have no damaging move in any tier and get only canon non-damaging moves: Kakuna, Ditto,
  Wobbuffet, Smeargle, Wynaut, Pyukumuku, Cosmog, Cosmoem.

`keeperMove` distribution:

| keeperMove | Species |
| --- | --- |
| protect | 889 |
| reflect | 89 |
| null | 22 |
| harden | 13 |
| agility | 8 |
| iron-defense | 2 |
| defense-curl | 1 |
| withdraw | 1 |

Protect is still 86.7% of species, above the 80% mark. Protect has been a machine move since Gen 2,
so every species debuting in Gen 2 or later that learns it in its debut group gets it first. Gen 1
species debut before Protect existed and mostly get Reflect.

The 22 null keepers are Caterpie, Weedle, Zubat, Golbat, Machop, Machoke, Machamp, Tangela,
Magikarp, Ditto, Unown, Wobbuffet, Smeargle, Wurmple, Wynaut, Kricketot, Combee, Tynamo,
Scatterbug, Cosmog, Cosmoem, Blipbug.

## Spot checks

Each was read from the cached CSVs before it became a literal test assertion.

| Species | Moves | keeperMove |
| --- | --- | --- |
| Charizard (6) | Flamethrower, Ember, Slash, Scratch | Reflect |
| Blastoise (9) | Hydro Pump, Water Gun, Skull Bash, Bite | Reflect |
| Pikachu (25) | Thunder, Thunder Shock, Swift, Quick Attack | Reflect |
| Gengar (94) | Lick, Dream Eater, Shadow Ball, Dark Pulse | Protect |
| Magikarp (129) | Tackle, Hydro Pump, Bounce, Splash | null |
| Ditto (132) | Transform | null |
| Wobbuffet (202) | Mirror Coat, Destiny Bond, Safeguard, Counter | null |
| Smeargle (235) | Sketch | null |

- Pikachu does not get Thunderbolt. Its red-blue level-up set is Growl, Thunder Shock, Thunder Wave,
  Quick Attack, Swift, Agility and Thunder. That set already holds 4 damaging moves, so the rule
  never reaches a group where Pikachu learns Thunderbolt (a red-blue TM, and level-up in later
  games). The test asserts that absence literally.
- Gengar's red-blue set has only 2 damaging moves (Lick, Dream Eater). Shadow Ball and Dark Pulse
  come from Scarlet/Violet level-up, with Shadow Ball as the second ghost move under the cap.
- Magikarp's red-blue set is Splash and Tackle. Its Hydro Pump and Bounce are Sword/Shield machine
  moves, because it has no Scarlet/Violet machine rows.

## Tests

- `scripts/data/build-movesets.test.ts` runs the rule on small CSV fixtures. In the fixtures, the
  debut, middle and newest version groups have ids that disagree with their order. Each of these
  mutations makes at least one test fail:
  - a per-type cap of 3;
  - null accuracy ranked as 0;
  - version groups sorted by id;
  - the newest group taken as the debut;
  - machine moves from the oldest group;
  - middle level-up groups included;
  - the keeper taken from the newest group before the debut group.
- `src/data/__tests__/movesets.test.ts` checks:
  - the schema;
  - that every Pokédex id is covered with 1 to 4 moves;
  - that the committed file is in the builder's canonical form;
  - the spot checks above;
  - the `RangeError` on an unknown id.
