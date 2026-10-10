# Dispatch 3 decision log

Lane owner: Claude Code, Opus 5.5. Branch `feat/ui`. Mode `pokedraft-mode`. Yellow tier, with the same independent review receipt as Red.

## State anchor

On 2026-10-09 fetched `origin/main` was `d97832865aa618b7f2687f7c437dd2c59e8f3701` (PR #2), with no newer commits. `shasum -a 256 src/data/scouting.json` gave `5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775`. Both match the dispatch anchor.

## GATE 0 recon

### Engine surface (`src/engine/index.ts`)

The UI builds only against these exports: the types, `ENGINE_COEFFICIENTS`, `applyAction`, `createDraft`, `eligibleSpecies`, `runDraft`, `rateTeam`, `runCup`, `replay`, `decodeToken`, `encodeToken`, `dailySeed`, `toIsoDate`, `FORMATIONS`, `SPECIES` and `speciesById`.

| Fact | Cite | UI consequence |
|---|---|---|
| `replay(token)` decodes, runs the draft, requires completion, then runs the cup | `src/engine/replay.ts:6-20` | Share links and the friendly cup both go through `replay`. A bad token raises `RunTokenError`, which the share page catches. |
| Builder tokens replay on the generic ladder | `replay.ts`, dispatch 2 carryover | The friendly cup is a builder token through `replay`, labelled "Friendly (not ranked)". |
| `DraftPhase` is `building`, `awaitingSlot`, `choosing{roll, slot}`, `complete` | `src/engine/types.ts:174-178` | The run screen switches on the phase. Position First shows "pick a slot" in `awaitingSlot`. |
| `Roll` is `combo{region, type, offers}` or `species{species}` | `types.ts:163-170` | The wheel lands on `roll.region` then `roll.type`, or on `roll.species`. Open style lists `eligibleSpecies` filtered to the combo; Classic shows `roll.offers`. |
| A region reroll re-rolls the type too | `src/engine/draft.ts:206-215` | A region reroll replays the region stage and then the type stage, because both values change. A type reroll replays only the type stage. |
| `rerollsUsed` against `REROLLS` (cup8 3, kanto151 5) | `types.ts:158-161`, `draft.ts:380-383` | Remaining count = `REROLLS[mode] - rerollsUsed`. |
| `place` on a species already in the lineup swaps the two slots | `draft.ts:396-410` | Builder "pick a species already on the field swaps them" is engine behaviour, not UI logic. |
| `notPlayed` matches carry `opponent: null` | `src/engine/cup.ts:216-219` | Unplayed games show the nominal ladder rating from `ENGINE_COEFFICIENTS.ladder.score`, labelled as approximate. |
| The opponent ladder (`buildLadder`) is not exported | `src/engine/index.ts` | The draft screen's "Road to the Final" strip shows the nominal ladder from `ENGINE_COEFFICIENTS.ladder.score`. A seed-exact strip needs an engine export. Logged in `docs/queue/engine-followups.md`. |
| Shootout after 20 level sudden-death pairs goes to the user | `src/engine/match.ts` `shootout()`, `coefficients.ts` `maxSuddenDeath: 20` | Detected from engine output: more than 25 user kicks (`kicks` 5 + `maxSuddenDeath` 20), because the decree scores one extra user kick and misses one opponent kick (`match.ts:251-254`), and shown as "Won on penalties (decided after 20 rounds)". |
| `Species` carries name, gen, region, types, fits, strengths, weaknesses but not the rationale | `types.ts:43-57` | The rationale is read from `SCOUTING` (`src/scouting/scouting-data.ts`), read-only. No scouting file changes. |
| `MatchResult.rating` is the Team Score fielded in that match (lower when someone is absent) | `cup.ts:150-152` | Each results row shows that match's rating next to the opponent's. |

### wcdraft (`b4530162c11a1057726eb15360eb75a6e8b211e1`, shallow clone outside this repo)

| File | Cite | Decision |
|---|---|---|
| `apps/web/components/game/slot-machine.tsx` | `:3-16` the reel always lands on the engine result, decorative faces are real neighbours, no randomness, parent owns `idle/spinning/settled`, reel `aria-hidden` and the result line is the live region | Adapt all of it. |
| `slot-machine.tsx` | `:64-69` `buildSpinStrip` = decoration twice then the landing face, so the strip always ends on the result | Adapt. The pokedraft strip is built by a pure function that the 500-roll test calls. |
| `slot-machine.tsx` | `:316-338` CSS keyframes translate from start to end offset, `onAnimationEnd` settles | Replace with a `requestAnimationFrame` loop, so tick sounds fire on actual face crossings and tap-to-skip snaps cleanly. Same momentum shape. |
| `game-styles/draft-spin.module.css` | `:231-237` `cubic-bezier(0.16, 0.74, 0.12, 1)`, `:548-555` reduced motion kills the animation | Adapt the easing; reduced motion settles at once in JS, not only in CSS. |
| `slot-machine.tsx` | three reels (left, right, center) with staggered stops | Not adapted. One reel per stage reads better at 360 px. |
| `draft-screen/index.tsx` | `:97-110` reactive `matchMedia("(prefers-reduced-motion: reduce)")`; `:616-639` anim lifecycle and skip | Adapt the media-query hook and the skip-to-settled transition. |
| `home/hero-spin-loop.tsx` | `:96-99` timer-driven idle, spinning, settled loop | Not needed for the game screens; the builder Randomize cascade reuses the timing idea (staggered per slot). |

### all22pokemon.com

Opened in a browser on 2026-10-10 to read the flow only: a side panel with two challenge CTAs, an action toolbar (download, copy link, randomize, reset, clear), formation, generation and legendaries controls, and a pitch as the main area. No code, CSS or assets were copied.

## Feature playbook checklist (verbatim steps)

1. `how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode.
2. `architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps. Lint chore, theme tokens, `PlayerImage`, `Pitch`, the shared UI model (`src/ui/*`) and the component-test config land before fan-out.
   - Independent workstreams. Builder (home route, picker, drag, URL state, randomize), challenge run (play route, wheel, road strip), results (results view, `/r/[token]`, PNG card and OG image, history, how-to-play). Then Playwright, CI, the image-seam guard and screenshots.
   - Shared mutable state. Each agent owns named directories. `src/ui/*`, `Pitch`, `PlayerImage`, `globals.css` and `layout.tsx` belong to the lane owner; agents ask for changes instead of editing them.
   - Smallest safe decomposition. Three agents over disjoint directories; the results view is consumed by the other two through a fixed props contract.
4. Delegate code-writing to a subagent. Done per workstream; the lane owner writes the foundation and contracts.
5. Verify on the matching surface. Real Chromium via Playwright at 390 px and 1440 px.
6. Rebase into small, ordered commits.
7. If the design is contested, `interrogate` before shipping. The independent reviewer applies the rubric.
8. Run Opening a PR.

## Decisions

| ts | phase | decision | why | evidence | result |
|---|---|---|---|---|---|
| 2026-10-10T00:44 | chore | First commit adds `scripts/calibration/out/**` to the ESLint ignores | dispatch 2 follow-up | `pnpm lint` clean | b451646 |
| 2026-10-10T00:50 | gate1 | `PlayerImage` uses inline styles only | the same component renders in the DOM and in the satori PNG renderer, which has no stylesheet | `src/components/PlayerImage.tsx` | |
| 2026-10-10T00:50 | gate4 | The pitch flips orientation with a container query at 640 px, not a viewport media query | the pitch sits beside the side panel on wide screens, so its own width decides; one SVG drawing in vertical coordinates is reused for horizontal through `matrix(0 1 -1 0 105 0)` | screenshots at 390 and 1440 show both orientations with `scrollWidth` equal to the viewport | |
| 2026-10-10T00:50 | gate2 | Builder URL state is a run token (`?b=`) with one `place` per filled slot and the fixed seed `builder`; the friendly cup uses the same shape with a fresh random seed and all 16 slots | one format, validated by `decodeToken` and `runDraft`, instead of a second ad hoc encoding | `src/ui/lineup.ts` | |
| 2026-10-10T00:50 | gate2 | Local stats live in their own store, apart from the 50-run history, and a token already in the history is not counted twice | deriving bests from a capped history would forget old bests | `src/ui/runs.ts` | |
| 2026-10-10T00:50 | gate2 | Challenge seeds are fresh random hex unless `?seed=` is given | Playwright needs fixed seeds; the daily seed belongs to the leaderboard lane | `src/ui/settings.ts` | |
| 2026-10-10T00:50 | gate4 | The PNG export and the OG image are one satori renderer behind a route handler; Download image fetches it | the dispatch requires the same renderer for both, and an OG image cannot use a DOM exporter; satori resolves every `<img>` before it rasterizes, so a future image in `PlayerImage` still lands in the PNG | | |
| 2026-10-10T00:50 | gate4 | Display font Big Shoulders, body Barlow Semi Condensed, floodlight yellow accent on deep pitch green | stadium-night broadcast direction from the dispatch; condensed scoreboard type fits 11 names at 360 px | `src/app/layout.tsx`, `globals.css` | |
| 2026-10-10T01:05 | gate2 | Show ratings applies to the builder only and is labelled "Show ratings (builder)"; challenge candidates never show fit | the toggle is "casual sighted mode", and dispatch 4 ranks challenge runs; a sighted ranked run would need its own leaderboard flag | principle-experience-first weighed against leaderboard integrity | the owner can ask for sighted challenges with a flag in dispatch 4 |
| 2026-10-10T01:05 | gate3 | A cup8 region reroll replays the region wheel and then the type wheel; a type reroll replays only the type wheel | the engine re-rolls the type on a region reroll (`draft.ts:206-215`), so both values change; replaying only the region would show a type the player never saw spin | engine recon above | |
| 2026-10-10T01:05 | gate3 | Wheel faces are deterministic: regions of the selected gens, the 18 types, or about 12 Dex-number neighbours of the rolled species inside 1 to 151 | the animation must inject no randomness | `docs/fairness.md` Animation | |
| 2026-10-10T01:05 | process | Subagents run as `general-purpose` with the `pokedraft-mode` agent definition prepended verbatim | this session started outside the repo, so `.claude/agents/pokedraft-mode.md` was not registered (`Agent type 'pokedraft-mode' not found`) | tool error | same load order and rules |
| 2026-10-10T01:05 | gate5 | `scripts/check-image-seam.sh` bans `<img`, `next/image`, `background-image`, `backgroundImage` and CSS `url(` everywhere under `src/` except `PlayerImage.tsx`, and runs in CI | a narrower "creature only" grep cannot tell creature art from other art; nothing else in the app needs images | planted `<img>` failed the guard, clean tree passed | 7009b96 |
