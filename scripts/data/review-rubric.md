# Layer 2 scouting review rubric

You are scouting every species of one generation for a soccer game. Layer 1 already turned
game data into 17 soccer attributes (1..99). Your job is to correct the baseline where the
creature would actually play differently, pick its roles, and tag it. Be honest and consistent.

## Inputs

`scripts/data/.cache/review-packets/gen-<n>.json` holds, per species: the Pokédex fields
(id, name, genus, types, hp/atk/def/spa/spd/spe base stats, heightDm in decimetres, weightHg in
hectograms, shape, abilities with hidden flag, legendary/mythical/isBaby, evoStage, kickMoves),
the Layer 1 `baseline` attributes, `layer1Mods` (points Layer 1 already added or removed per
attribute from shape, weight, baby, moves, abilities, and type), and `roleBlends` (raw role
scores from the baseline, before your role calls).

Attributes. Outfield: PAC pace, ACC acceleration, SHO shooting, PAS passing, VIS vision,
DRI dribbling, TEC technique, DEF defending, TAK tackling, AER aerial, PHY physicality,
STA stamina. Goalkeeping: DIV diving, HAN handling, REF reflexes, GKP positioning, KIC kicking.
Each attribute's baseline is spread roughly evenly from 25 to 95 across all 1,025 species,
then shifted by `layer1Mods`. A 60 is about average.

Roles: GK, CB centre-back, FB full-back, WB wing-back, DM defensive mid, CM central mid,
AM attacking mid, WM wide mid, W winger, ST striker. Role fit is a weighted blend of attributes,
multiplied by familiarity: full for the species' three bestRoles, reduced for other roles.

## For each species, reason about

Body plan and shape, size (height, weight), speed, limbs (can it kick? does it have hands?),
temperament from genus and abilities, signature fighting style, and well-known franchise
identity (for example, a species whose genus or design is about kicking, boxing, flying,
burrowing, guarding, or being slow). Ask: on a real pitch, what would this creature be good
and bad at, and does the baseline already say that?

## Output per species

- `adjustments`: at most 6 attributes, each a non-zero integer in -12..12, added to the
  baseline. Most species need 0 to 3. Reserve 8 to 12 for strong identity calls the data
  supports. Do not repeat what `layer1Mods` already applied (for example, Layer 1 already
  rewards kicking moves, wings, and abilities like Speed Boost). If the data does not support a
  call, make no adjustment. An empty object `{}` is fine.
- Do not adjust an attribute for a field that already feeds it. Speed already feeds PAC, ACC,
  DRI, PAS and TEC; weight over 150 kg already lowers ACC, DRI, DIV, PAC and AER; the arms
  shape (no legs) already lowers DRI, TEC and KIC; height and weight already move DIV and HAN
  through the keeper frame term (a tiny body loses up to 6, a big frame gains up to 6; skipped
  when an ability such as Schooling already sets the body size); and a
  squiggle (serpentine) body's height is read as body length (unless it levitates), so it no
  longer lifts AER or DIV. Do not use GKP or any other attribute to price body size again.
  Check `layer1Mods` and the blend inputs.
- KIC is goalkeeper kicking (goal kicks and distribution) and only feeds GK. Outfield kicking
  power and technique live in SHO and TEC. Raise KIC only when GK is a best role.
- `bestRoles`: exactly 3 distinct roles, best first. These are the positions it would naturally
  play. Every best role gets full familiarity in its fit, so a wrong one inflates that fit.
  A species tagged weak on `pace` cannot have W or WB as a best role.
- `worstRoles`: exactly 2 distinct roles, not in bestRoles.
- `strengths`, `weaknesses`: 2 to 4 tags each from the closed list below, no tag in both.
- `rationale`: one or two sentences that cite the specific fields that drove the call, using
  field names (spe, atk, def, spa, spd, hp, height, weight, shape, ability, type, genus,
  kickMoves, evoStage, isBaby, legendary). Example: "Spe 130 and ability Quick Feet make it
  explosive on the wing; shape quadruped limits close control."

Tags: pace, acceleration, agility, finishing, shot-power, long-shots, kicking-technique,
passing, vision, dribbling, close-control, footwork, tackling, marking, positioning, aerial,
heading, strength, size, balance, stamina, work-rate, composure, aggression, discipline,
teamwork, reach, handling, shot-stopping, reflexes, distribution, durability, flight,
intimidation, unpredictability, limb-reach.

## Hard rules

- No invented facts. Cite only fields in the packet or widely known franchise identity
  (genus, design, signature moves). Never cite Pokédex flavor text. Never invent stats,
  lore, or numbers.
- No em dash characters anywhere. Use commas or periods.
- Calibrate like a scout who reviews all 1,025 species: be no harsher or kinder to your
  generation than to any other. Legendary status alone is not a reason to adjust; the base
  stats already carry it.
- Treat the default form only (the packet's stats, shape, and abilities).

## File format

`src/scouting/review/gen-<n>.json`:

```json
{
  "gen": 1,
  "entries": [
    { "id": 1, "name": "Bulbasaur", "adjustments": { "DRI": -3 }, "bestRoles": ["DM", "CB", "CM"],
      "worstRoles": ["W", "GK"], "strengths": ["stamina", "positioning"],
      "weaknesses": ["pace", "footwork"], "rationale": "..." }
  ]
}
```

Entries are ordered by id and cover every species of the generation exactly once. `name`
must match the packet. Validate with `pnpm -s tsx scripts/data/validate-review.ts <n>` until it
prints VALID.
