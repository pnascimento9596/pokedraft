# pokedraft platform improvement program (dispatch brief, 2026-10-17)

You are the implementing agent for the full improvement program on `pokedraft`
(`/Users/paulo/Projects/pokedraft`). This brief merges two independent read-only audits run on
2026-10-17, resolves their conflicts against the code, and records every product decision the owner
has already made. Your job is to ship the program end to end: one PR per dispatch, reviewed, merged,
and recorded, under the repo's operating contract. Do not re-audit the whole platform and do not
re-open the product decisions below. Where this brief and the audits disagree, this brief wins; where
this brief and the code disagree, the code wins and you report the discrepancy.

## 0. Ground rules (non-negotiable)

1. `CLAUDE.md` and `tools/pstack-core/pokedraft-overrides.md` are the operating contract. Work under
   the `pokedraft-mode` skill. One PR per dispatch off `origin/main`, conventional commits, explicit
   path staging, squash merge pinned to the reviewed head, `STATE.md` updated in the same PR.
2. Risk tiers decide the gate: Red (engine, data, scouting, leaderboard, deploy/env), Yellow (UI,
   display-only), Green (docs, mechanical). Every PR names its tier in the title.
3. Every behaviour fix ships a guard test that is RED before the fix and GREEN after, committed in that
   order, asserting literal values and named after the bug. Every UI PR ships browser proof: a
   Playwright scene at 390x844 (plus 360 and 320 where layout changes) and a screenshot in
   `docs/reports/<dispatch>/`.
4. Validation ladder, narrowest first: `pnpm vitest run <touched paths>`, then
   `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then the relevant Playwright specs, then
   `pnpm check:mirrors` if you touch `CLAUDE.md`, `AGENTS.md` or the skill. Report real counts.
5. Honesty: never fabricate counts, measurements, verdicts or merge status. Anything not run is
   reported as NOT RUN. Blocked means report command, output, SHA and what unblocks it.
6. Standing invariants: determinism (randomness only via `src/engine/rng.ts` and `src/lib/rng.ts`),
   goldens for any engine or data change, `PlayerImage` is the only image seam, no fabricated data,
   no em dashes or en dashes anywhere in user-facing copy or commit text, nothing copied from
   all22pokemon.com.
7. Explore before change. Both audits read `40f3c92`; `origin/main` is at `f4489cb` (#69) or later.
   Re-verify every cited `file:line` at your branch head before editing. Treat audit line numbers as
   pointers, never as facts.
8. Prompts and decision logs stay tight. Each dispatch gets `docs/decisions/<slug>.md` with: scope,
   RED output verbatim, measurements, product decisions applied, NOT RUN.
9. Merge equals ship. Vercel deploys `main`. For Red PRs, run the live check against production
   after merge (`/api/health?db=1`, the touched route) and record it in the next PR's STATE entry.

## 1. Source material

- Audit A (Opus, five parallel auditors plus a coordinator who ran headless Chromium against
  production): `~/Downloads/pokedraft-audit-2026-10-17.md`, screenshots in
  `~/Downloads/pokedraft-audit-2026-10-17-shots/`.
- Audit G (Gemini, single-pass static read): `~/Downloads/pokedraft-deep-audit-2026-10-17.md`.
- First Green PR of the program: copy both audits and the screenshots into
  `docs/reports/audits-2026-10-17/` so every later PR can cite them by repo path.

Conflicts already resolved against the code (do not relitigate):

| Claim | Verdict |
|---|---|
| G: only a non-Balanced tactic sets `managed`, via `isDefaultManager` | Wrong. `applyManager` in `src/engine/match.ts` sets `managed = true` for every action, Balanced included, and `isDefaultManager` does not exist. A's measurement (Balanced at kickoff costs 0.8 to 5.3 win-rate points) stands. The flag is pinned by `manager.test.ts` "hands the touchline to the manager". |
| G: `--sprite` is 0.48 / 0.62 / 0.78 | Values are 0.48 / 0.7 / 0.9. The mechanism is real: `.carrierBadge` (11px) and `.cardPip` are children of the scaled `.player`, so they render at about 5.3px on phones. |
| G: `RollReveal` skip "bug" (skip settles all reels) | Intended fast path, not a bug. Keep skip-all. The fast-spin preference (W4) covers the rest. |
| A: `safeNext("/..//evil.com")` returns `//evil.com` | Confirmed by reading `src/passcode.ts:44-52`. Fix in W1. |
| G: penalty spot at `x: 86` vs SVG `cx={89}` | Confirmed. Fix in W1g. |
| G: `rankOf` ignores the coach filter | Confirmed (`store.ts`). Fix in W1k. |
| G: GK radar axes are outfield axes | Confirmed (`ScoutingDossier.tsx:25-32`). Fix in W4f. |
| A and G: two `buildTimeline` calls, movesets-dependent RNG | Confirmed. The single highest-impact bug. W1a. |

Where A and G both list an item, A's measurement is the baseline and G's mechanism notes are
implementation hints.

## 2. Product decisions (made by the owner, apply as written)

1. **Manager mode forces Live pace.** When `managerMode` is on, `matchView` is treated as `live`
   and the Quick option is disabled with the hint "Manager mode plays live". Sim mode keeps Quick;
   in Quick the `Broadcast` renders `motion=false` with no per-phase SFX (beat SFX only).
2. **Builder friendlies get the matchday.** Manager mode and Live match apply to Builder cups. The
   engine already supports `mode: "builder"` with manager actions. The builder becomes the manager
   sandbox. Friendlies stay unranked.
3. **Blind challenges.** Qualitative position fit (Best / OK / Poor glyph and glow) stays visible
   everywhere, including Picker. Numbers hide when ratings are off: Team Score, deltas, fit scores,
   line strengths. Reword the setting hint to "Off hides scores and ratings during challenges.
   Position fit hints stay."
4. **Assistant after a decision.** Engine 7 splits `managed` into `tacticManaged` and
   `subsManaged`: the assistant keeps doing fatigue subs until the user makes a sub, and keeps its
   late reactive tactic until the user sets a tactic after 45'. Until engine 7 ships, the UI
   mitigates: a half-time fatigue line naming the two lowest-energy starters, and an automatic stop
   at 65' when the match is managed and any outfield starter is below 65 energy. The Touchline
   always shows the assistant status ("Assistant: subs on, tactics off").
5. **Leaderboard identity stays casual nicknames.** Close the copy bypass with a server-side run
   fingerprint, store `coached` as a column, highlight the player's own rows. Per-device keys,
   invite codes, server-committed daily attempts and signed seeds are deferred (section 6).
6. **Cross-engine boards.** Store `engine_version` per row, show it on rows, default the all-time
   board to the current engine with an "All engines" toggle.
7. **Creature images are public.** Trim the proxy matcher to skip `creatures/`, `api/health` and
   `api/csp-report`.
8. **Enforce the CSP now**, keeping `'unsafe-inline'`. Flip `Content-Security-Policy-Report-Only`
   to `Content-Security-Policy` in `next.config.ts`.
9. **Not building:** broadcast heatmap, cosmetic stoppage time, touchline shouts, video export,
   watch parties, season or league mode, weekly standings, rivalries. Rationale: fabricated-looking
   data, misleading, or premature until the core manager loop pays off.
10. **Type matchups on the pitch** are gated by a prototype: ship only if a scratch harness shows
    squad share of win variance among good drafters rising from about 11% to at least 18% with the
    win-curve targets intact. Otherwise record the measurement and defer.
11. **Defaults.** `managerMode: false`, `matchView: "quick"` stay, but the Matchday selector moves
    into the Play card and the pre-run summary so every player sees it before each cup.
12. **Ability callouts** are reserved for high-leverage phases (about 12 to 15 per match). All 18
    types get a visual and audio family. Big cut-ins only on shots on target, goals, saves and key
    duels.
13. **Legacy `MatchdayLive` text studio is retired.** Group standings fold into `MatchReplay`.
14. **Retire the "Settings confirmed?" modal.** Play goes straight to `/play`; the start card keeps
    the editable summary.

## 3. Program structure

Seven waves. Each line in a wave is one dispatch and one PR unless marked "bundle". Waves 2 and 3
touch `src/components/matchday`, `src/ui/matchday`, `src/ui/manager`; waves 4 and 5 touch the
pre-match, results and leaderboard trees. They may run in parallel worktrees. Wave 6 (engine 7) is a
single Red freeze and goes after W3h ships, because its calibration pins depend on the "Your calls"
feedback existing. Wave 7 items are small and may be interleaved at any time.

Entry gate for every wave: `origin/main` green, STATE.md current, previous wave's live check
recorded. Exit gate: every PR merged and verified in production, decision logs written, no
carryover left unrecorded.

Effort: S under a day, M one to three days, L longer.

### Wave 1. Truth pass (the UI stops showing wrong or future information)

| PR | Tier | What | Guard test (RED then GREEN) |
|---|---|---|---|
| 1a one timeline | Yellow, S | Lift `useMovesets` into `MatchPlayer`; pass the built timeline to `Broadcast` as a prop; delete the second `buildTimeline`. Make `playCallout` and `shotCallout` consume exactly one RNG draw regardless of moveset, or move callouts to substream `broadcast:<seed>:<i>:callouts`. Hold the clock at kickoff until movesets resolve. Typed ability SFX now play. | plays with and without `movesOf` identical for a pinned seed (literal `side`, `fromSlot`, `toSlot`, `kind` on three phases); `shotCallout` on a Fire mover returns `effect: "fire"` |
| 1b honest momentum | Yellow, S | `frames[].ball` and the possession bias use only windows with `to <= clock`; drop future goals from `timeline.ts:406`. HUD shows 50/50 until the first completed window. | lean is 0 at minute 0; a goal at 4' does not move the lean before 5' |
| 1c score lands with the ball | Yellow, S | Gate score, ticker line, live region and `playGoalHorn` on goal staging progress >= 0.6 (immediate under reduced motion or Quick). Scoreboard gets `role="status"`. Throttle the live region to whole-event lines. | score reads 0-0 while progress is 0.5; 1-0 at 0.6 |
| 1d injury staging | Yellow, S | Render the injured species in the `down` pose; the replacement walks on only at the sub beat. Do not reveal the assistant's pick on the pitch during the injury stop. | measured case: Roselia, not Kommo-o, lies down at 42' (A, match 5 of the golden cup8 replay) |
| 1e speed-aware staging | Yellow, S | Divide `SHOW` by `speed` in `activeBeat`. | at 2x the goal beat ends when its hold ends |
| 1f Quick is not a broadcast | Yellow, S | Decision 1. Manager forces live pace; Sim+Quick renders still, beat SFX only, no `pitch-ability` badges. | with manager on, `pace` is live regardless of saved `matchView`; in Quick no per-phase SFX call |
| 1g mobile pitch fixes (bundle) | Yellow, S | HUD wraps to two rows below 420px (the "36%3 SoT" collision). Preload the 22 sprites on `PreMatch` or pass `eager`. Move `scale(var(--sprite))` to an inner sprite wrapper so `.carrierBadge` and `.cardPip` stay 11px and 9x13px. Trails: `vector-effect: non-scaling-stroke` and a `0 0 100 64` viewBox (or `y*0.64`). Shootout spot to `x: 89 / 11`. Truncate nameplates by name length. | Playwright 390px: no HUD overlap; all 22 `img.complete` at kickoff stop; carrier badge computed font-size 11px; trail circle rendered round |
| 1h highlights honesty (bundle) | Yellow, S | `element: primaryType`; remove "Activated Ability" copy; Clean Sheet Hero and Squad Anchor skip absent or subbed keepers and 0-0 shootout losses; MVP pill tone `L` for losing records; emoji into `aria-hidden` spans; `-0` drag fix. | Arcanine star element is `"fire"`; 0W-0D-3L tone is `"L"` |
| 1i draft safety (bundle) | Yellow, S | Confirm dialog or 5 s undo on "New run" mid-draft. Gate keys 1 to 3 behind any open `dialog` or dossier. `overflow-x: clip` on html and body (fixes the sticky side panel). `.token` defaults to `touch-action: pan-y`, `none` only while dragging. Drawer backdrop `pointer-events: auto` when open with swipe-down to close. Drag drift: compensate `cos(26deg)` on `dy`. | one tap on New run keeps the round header; "2" with the dossier open signs nothing; sticky box stays at `top: 16` after a 1000px scroll |
| 1j builder matchday | Yellow, S | Decision 2. Remove `settings.mode !== "builder"` from the matchday gate in `PlayScreen` and `LiveRun`; Matchday toggles visible beside "Play a friendly cup". | a builder cup with manager on mounts `MatchdayFlow` |
| 1k security and integrity quick fixes (bundle) | Red, S | `safeNext` returns `"/"` when `url.pathname.startsWith("//")`. Key IPv6 rate limits by /64. Neon `fetchOptions: { signal: AbortSignal.timeout(4000) }`. Wrap `req.formData()` in `/gate/unlock`, 303 with error on a bad body. `rankOf` honours the coach filter and the client passes it. `coach` in URL state. | `safeNext("/..//evil.com") === "/"`, same for `"/.//evil.com"` and `"/%2e%2e//evil.com"`; two IPv6 addresses in one /64 share a bucket; JSON body to unlock returns 303; uncoached #1 ranks 1 on the uncoached board |
| 1l retained JSON dedupe | Red, S | `next.config.ts` regex `v\d+`; the loader re-exports the earliest byte-identical retained copy, not only the live file; `measure-retained-json.mjs` expects 4 payloads and runs in CI. | `node scripts/build/measure-retained-json.mjs .next/server/chunks` passes with 4 |

### Wave 2. The broadcast feels like football

| PR | Tier | What |
|---|---|---|
| 2a frame loop out of React | Yellow, M | React ticks at about 10 Hz for clock, scoreboard, ticker, touchline. A rAF loop inside `Broadcast` calls `stagePitch` and writes `transform: translate3d()` through refs for 22 players and the ball. Memoise the static pitch SVG and `PlayerImage`s. Measure before and after with a 4x CPU-throttled trace at 390x844 and record p50, p95, long tasks and DOM mutations per second in the decision log. Ship only if not worse. |
| 2b continuous ball | Yellow, M | On a turnover the ball travels from the old carrier to the defender nearest the previous ball point (tackle or interception in the first 0.24 of the phase). Goal and save flights start from the live ball position, never the centre spot. Penalties start at `x: 89 / 11`, free kicks at a fixed spot about 25% from goal. Blend back over about 300 ms after staging. After every goal, both teams lerp to kickoff shape over about 600 ms and the conceding side restarts from the centre; the `plays` generator starts the next phase from that side's midfield. Guard: max per-frame ball jump under 4% of pitch length across a whole match (A measured 79.7% today). |
| 2c smooth movement | Yellow, S | Catmull-Rom through waypoints i-1, i, i+1. Pose and facing from finite-difference velocity, not displacement since phase start. One deterministic push-apart pass for same-side players within 4%. Red cards and subbed-off players walk off instead of vanishing. |
| 2d set pieces from `goalKind` | Yellow, M | Penalty: shape freezes, taker steps up, pause, kick. Free kick: three-player wall, curled trail. Header: cross trail, scorer meets it at loft 0.85. Solo: dribble chain past the presser. Data is already in `Beat.goalKind`. |
| 2e shootout with suspense | Yellow, S to M | Pass `kickProgress = clamp01((now - kickAt) / (pace.kick / speed))` into `stagePitch`. Run-up 0 to 0.35, flight 0.35 to 0.60 with a trail, reaction 0.60 to 1.0. Keeper dives the correct side on a save and the wrong or late side on a goal. Waiting players staggered along an arc. Whistle, kick, roar or glove SFX per kick. Sudden-death banner. |
| 2f fatigue on the pitch | Yellow, S | Pass per-slot energy into `StageInput` from the latest window snapshot. Below 65: slower lerp (x0.85), sweat pip, slower stride. A small stamina arc under the sprite below 55. |
| 2g callouts and type effects (bundle) | Yellow, M | Decision 12. Callouts on final-third through balls, crosses into the box, key duels and about 15% of build-up. Extend `TYPE_EFFECT` and `sound.ts` to all 18 types (palettes from `TYPE_PALETTE` in `src/design/stadium.ts`, grouped into about ten synth profiles). Lower-third cut-in with sprite, move name and type badge on shots on target, goals, saves and key duels. Guard: a pinned seed yields between 10 and 18 open-play callouts. |
| 2h audio polish (bundle) | Yellow, S to M | `unlockAudio` on Watch live and "Go to the match". Synthesized crowd bed (band-passed noise, gain follows the ball's x, roar envelope on goals, longer on an 80'+ equaliser). `playKickPass` at most one in three phases. Keep everything synthesized, no assets. |

### Wave 3. Phone-first matchday and the manager payoff

| PR | Tier | What |
|---|---|---|
| 3a touchline bottom sheet | Yellow, M | Below 600px the Touchline is a sticky bottom sheet. Collapsed: five tactic pills, "Subs 2 of 5", the stop CTA. Expanded: bench cards and energy rows. Opening the sheet or the sub picker pauses the clock; confirming resumes. The pitch stays visible while deciding. |
| 3b follow camera | Yellow, M | One transform on the pitch layer: critically damped follow of the ball, 1.6x in open play, 1.0x for goals and saves, "Full pitch / Follow" toggle. Default Follow on phones, Full on desktop. |
| 3c landscape, fullscreen, score bug | Yellow, S to M | `max-height: 70svh` on the pitch. Fullscreen button via the Fullscreen API with a TV-style score bug inside the pitch. Safe-area insets respected. |
| 3d team readability | Yellow, S | Kit colour per side as a ring or bib under each sprite (user kit from the squad's dominant type, opponent from its theme). Sprite floor of about 44px on phones. |
| 3e haptics | Yellow, S | `navigator.vibrate` on a user goal, red card and final whistle, behind the Sound toggle renamed "Sound and haptics". Android only; say so in the hint. |
| 3f prematch merge | Yellow, S | Pick the starting tactic on `PreMatch`, where style, weakest line and key player are visible. "Kick off" launches straight into running play. The 0' stop disappears. Opponent style and Team Score stay in the match header. |
| 3g touchline intelligence (bundle) | Yellow, M | Decisions 3 and 4. Scout line at kickoff and half time generated from `ENGINE_COEFFICIENTS.manager` (never hand-written), plus an edge badge on each tactic pill against this opponent's style. Bench cards show role fit for the outgoing slot, STA, energy, yellow-card badge; the "Take off" select is replaced by tapping an energy row. `InjuryPrompt` names the role. Yellow cards on energy rows. Half-time fatigue line; 65' managed stop; assistant status line. Guard: the scout line for a possession opponent cites `press` as the favourable tactic from the coefficient table. |
| 3h "Your calls" card | Yellow, M | At full time, replay this match with the user's actions removed for this match only (`runCup` with `actionsWithoutThisMatch`, about 28 ms) and show "Assistant 1-0, You 4-0, your Attack switch at 12'". Label knock-on effects on later matches. Never show before full time. |
| 3i replay and deep links (bundle) | Yellow, M | Decision 13: retire `MatchdayLive`, fold standings into `MatchReplay`. Event-bar pips clickable in replay and post-match (seek to `minute - 1`). Instant replay of user goals at 0.5x with a REPLAY bug (`stagePitch` is pure in `(beat, progress)`). Deep link `/r/<token>?watch=<match>&t=<minute>` autoplays at that goal; results and ticker goal lines offer "Share this goal". |
| 3j accessible stops and controls | Yellow, S | Focus moves to the stop or injury prompt when it opens. `aria-label="Match momentum"` on a real `role="meter"`. Space pauses, `2` toggles speed. Skip in manager mode warns that it auto-answers remaining injury stops. |

### Wave 4. Pre-match, platform UX and design system

| PR | Tier | What |
|---|---|---|
| 4a one-tap play (bundle) | Yellow, M | Decisions 11 and 14. Remove `ConfirmPlay`; Play routes straight to `/play`; the start card keeps `SettingsSummary` with an "Edit" link to `/#settings`. Matchday selector (Sim or Manager, Quick or Live) in the Play card and the summary. Rename "See results" to "Kick off" when the matchday plays. |
| 4b home hierarchy (bundle) | Yellow, M | h1 becomes a one-line game pitch with two challenge cards (8-0, 151) and a dated Daily card. Builder demoted to an h2 "Friendly builder". Settings collapsed by default below 1024px; remove the duplicate "Challenge Hub" toggle; hub line no longer mixes draft style with builder fill count. CTA grids stack to one column below 380px. h2s no longer precede the h1 in DOM order. |
| 4c live Team Score in the draft | Yellow (display of engine output), M | Decision 3. With ratings on, the hub shows `ratePartialLineup` as a scorebug and the selected or dragged candidate shows "+4 / -2" against its best empty slot. Legendary cap warning before the third. Hidden with ratings off. |
| 4d fast spins | Yellow, S | `spinSpeed: "normal" \| "fast"` in `PanelSettings`, fast at about 40% of normal durations and pauses. Saves about 40 s per run. |
| 4e copy pass and lint (bundle) | Yellow, S | Suitability enum mapped to Best, OK, Poor everywhere. "Rating / Rating 61" fix. Sentence case. "Hide players" and "Show roll". Shared-view copy says "This squad" or the nickname instead of "You". Score format "1-0" everywhere. `HISTORY_LIMIT` in history copy. Repo-wide dash lint (U+2013, U+2014 in string literals) added to `scripts/audit/`. Blind-mode setting hint reworded. |
| 4f dossier and picker (bundle) | Yellow, M | Scout button in position-first mode with the drafted role as `slotContext`. Prev and Next (1 of 3) tabs and a compare overlay across the round's offers. GK radar axes (DIV, REF, HAN, GKP, KIC, AER) when the role is GK. Ability and move contributions shown as numbers from `attributeBreakdowns()`. Fix the double `popstate` close when the dossier sits over the Picker. Builder gets two-tap swap. Search normalises accents and punctuation. |
| 4g resilience, onboarding, a11y (bundle) | Yellow, S to M | `error.tsx` and `global-error.tsx` with "Your run is saved; reload to continue". How to play gains Daily, Manager mode, Live match, leaderboard and the 0 to 1000 scale. One-time first-draft coach mark. Skip link, `aria-current` in nav, drop the fake `role="toolbar"`, `alt=""` beside visible names, shorter pitch token names, "Trainer Dugout" out of CSS `::before`. `ThemeToggle` reads the theme before first paint and updates `meta[name=theme-color]`. |
| 4h theme and tokens (bundle) | Yellow, M | Colour lint matches `rgba?\(` and `hsla?\(`; tokenise the roughly 111 literals (RoadStrip, Pitch, SidePanel, DraftBoard, MatchHighlights, MatchList). Stadium vignette scoped to dark. `tokens.css` dark palette defined once. `TYPE_PALETTE` added to the CVD audit and the two margins under 0.01 fixed. Breakpoint tokens 480, 720, 960, 1200 replacing the 11 ad-hoc values. |
| 4i PWA and viewport (bundle) | Yellow, S to M | `src/app/manifest.ts`, icons, `display: "standalone"`, no service worker. `.page` bottom padding includes `env(safe-area-inset-bottom)`. Header and draft toast pad the top inset. `overscroll-behavior: none` on body during the draft. |
| 4j mobile pitch density and drag perf | Yellow, M | Below 540px the type stripe becomes a 3px accent bar so sprites grow from 31px to about 48px; single-line ellipsis on names. Token and candidate drag move to refs plus `translate` in rAF, state committed on drop. Measure with a 4x throttle before and after. |

### Wave 5. Social loop and leaderboard

| PR | Tier | What |
|---|---|---|
| 5a share (bundle) | Yellow, S | `navigator.share({ title, text: "7-1-0, Team Score 812. Beat it?", url })` on coarse pointers; copy fallback; read-only URL input when copy fails. Card share passes `files`, `url`, `text`. Run metadata gains `description`; OG alt carries record and score. `/?b=<token>` gets `generateMetadata` wired to `/card?b=`. Cards show a Coached chip and the nickname when submitted. Prefetch the card blob on results mount so `share()` stays inside the gesture. |
| 5b head-to-head | Yellow, M | "Challenge a friend" on live results using `challengeHref` (deletes the duplicate in `ShareActions`). `/play?...&vs=<token>` replays both runs client-side at results and renders `HeadToHead`: records, Team Scores, per-round scores, "You win the seed", "Send it back". No server change. |
| 5c exhibitions | Yellow, M | Exhibition defaults to the newest history squad, with a picker across history and the Builder save. Exhibitions play on the 2D `Broadcast` with manager controls. "Exhibition vs this squad" on history and board rows. Shareable via `?ex=<a>.<b>.<rematch>`. |
| 5d board UX (bundle) | Yellow, S | Highlight own rows from `pokedraft:nickname`. "Share my rank" after submit. Daily rows show the formation instead of the fixed ruleset. Row sprites `alt=""`; "Challenge this Seed" gets a contextual label. Tabs either complete the tablist pattern or become `aria-pressed` buttons. Hall of Fame defaults to drafted species. |
| 5e results reveal and sync (bundle) | Yellow, M | Staged hero: Team Score count-up, W-D-L flip, trophy for champions, gold for flawless, then the MVP card. CSS only, reduced-motion aware. Star badge tap scrolls the highlights stage into view; Watch live restores focus and scroll on close; highlights heading levels fixed. |
| 5f server integrity and performance (bundle) | Red, M | `run_fingerprint` = sha256(mode, seed, canonical squad, W-D-L, team score, goal minutes), unique per `(mode, daily_date)`, `DUPLICATE_TOKEN` on conflict, backfilled by replay. `coached boolean NOT NULL` and `engine_version` columns at insert, backfilled once, indexed `(mode, coached, wins desc, draws desc, team_score desc, created_at)`; delete `coachedSqlFor` and its parity test. Insert plus rank in one CTE. `dailyTaken` short-circuits for all-time. `toBoardEntry` decodes once. Drop `leaderboard_entries_ip_recent_idx`; document or drop `rate_limit_events`. Paired down migrations. Guard: A's no-op copy token (`scratchpad/noop-copy.mts` method) is rejected. |
| 5g seed and engine boards | Red, M | Decision 6: engine label on rows, current-engine default with an "All engines" toggle. `GET /api/leaderboard?mode=&seed=` and a "Friends on this seed" table on `/r/[token]` and results. |
| 5h achievements | Yellow, M | Pure functions in `src/ui/achievements.ts` over `RunRecord` and lifetime (First Flawless, Hat-trick hero, Champion with every formation, 151 champion, Comeback, Giant killer). Grid in `LifetimePanel`, chip on the card. Derived only from recorded results. |

### Wave 6. Engine truth and engine 7 (one freeze, one recalibration)

| PR | Tier | What |
|---|---|---|
| 6a `matchStory` | Yellow/Red boundary, M | Pure deterministic `matchStory(seed, matchIndex, input)` in `src/engine` that re-runs the window loop and returns per-trial `p`, outcome (goal, saved, off target), zone from role and kind, and per-window territory from the lambda ratio, without touching `CupResult`. `simulateMatch` and `matchStory` share one core; a test proves story scores equal `MatchResult`. Goldens stay byte-identical. The broadcast then biases possession by territory and renders an xG river under the HUD that fills as windows complete. Commentary lines from real fields only ("Late drama at 87'", "{scorer}'s second", "Against the run of play"). |
| 6b engine 7 bundle | Red, L | Freeze v6 under `src/engine/versions/v6` with MANIFEST and digest; `ENGINE_VERSION` 7, `RUN_TOKEN_VERSION` 7, `RETAINED[6]` adapter, proxy and challenge-link version lists. Changes: split `managed` (decision 4); larger asymmetric tactic-vs-style edges with state dependence (counter stronger when leading, press decays with energy); missable penalties and nominated penalty and free-kick takers (token field); opponent injuries with ladder-quality replacements and visible rotation incidents; goal kind weighted by attributes (AER for headers, DRI and ACC for solos); shootout band widened to about 0.18 so takers and keepers matter; type matchups only if the decision 10 prototype passes. Calibration pins: informed tactic beats auto by 3 to 6 points, ex-post oracle by at most 10; a single no-op decision costs at most 0.5 points; shootout user win rate correlates with taker and keeper quality; win-curve and flawless targets within the v4 bands. Rerun `pnpm calibrate` and `scripts/calibration/engine6-compare.mts` equivalents; update goldens; 24 h grace window accepting N-1 tokens on submit through `replayAnyVersion`. Update the Touchline assistant status and remove the 65' interim stop. |

### Wave 7. Platform hygiene (interleave anytime)

- Enforce the CSP (Red, S, decision 8).
- GitHub Actions cron every 30 min: `/api/health?db=1` status ok and `.sha` equals `origin/main`; opens or updates an issue on failure (Green, S).
- Proxy matcher trim (Red, S, decision 7).
- `/card` canonical query (only `t|b`, allow-listed `pack`, `mirror` in `0|1`, 308 to canonical) so the CDN key is stable (Red, S). WAF rate limit is an owner action.
- CI: `format:check`, `timeout-minutes: 30`, SHA-pinned actions, Node matching production, Dependabot, a `postgres:16` service job running migrate, smoke, rollback x4, migrate (Green, S).
- `rollback.mts` refuses `0000` without `--drop-data` and prints the row count first (Red, S).
- Content-addressed engine data: `src/engine/versions/_blobs/<sha256>.json` with manifests pointing at blobs, written by `scripts/engine/freeze-version.mts` (Red, M).
- Split the species chunk into a slim index (id, name, types, gen, special) plus lazy attributes and scouting (Red, L). Last item of the program.
- Refresh the 360px matchday screenshots and the GIF; correct STATE.md's claim about them (Green, S).
- Zod off the client for the daily `localStorage` parse (Yellow, S). `/daily` server-renders its first paint like `/play` (Yellow, S).

## 4. Measurement and proof requirements

- Matchday UI PRs prove in Playwright at 390x844 with touch: pitch and touchline both visible
  without scrolling after W3a; no horizontal overflow; all controls at least 44px; the existing
  `e2e/mobile-targets.spec.ts` and `e2e/mobile-acceptance.spec.ts` scenes stay green and gain
  scenes for new surfaces.
- Performance PRs (2a, 4j) record before and after under a 4x CPU throttle: p50 and p95 frame
  interval, long tasks, DOM mutations per second. Headless numbers do not include GPU raster; say so.
  A physical phone check is an owner action; request it in the PR body and mark NOT RUN.
- Engine PRs report the probe numbers that changed (squad share of variance, manager table, upset
  curve, shootout win rate) next to the audit baselines from A, Appendix E.
- Every PR body lists: tier, RED commit SHA, gates with real counts, browser proof paths, NOT RUN.

## 5. Owner actions (cannot be done by the agent; list them in each relevant PR)

- Vercel WAF rate-limit rule on `/card` and `/r/*/opengraph-image` cache misses.
- Production credential rotation after the Neon cutover (STATE.md notes it was not performed).
- Physical phone check of the matchday at the end of waves 1, 2 and 3 (iOS Safari audio included).
- Vercel MCP access for this project (the audit got 403/404), needed to read csp-report lines and
  runtime errors before and after enforcing the CSP.

## 6. Deferred, with reasons

- Passwordless friend identity, server-committed daily attempts, signed ranked seeds: real
  integrity gains, but they change the social contract of a casual friend board and need owner
  appetite after the fingerprint and coached column land.
- Weekly standings, rivalries, season mode, watch parties, video export, touchline shouts: premature
  until the manager loop (W3g, W3h, W6b) demonstrably pays off.
- Broadcast heatmap and cosmetic stoppage time: would read as fabricated data.

## 7. Reporting

Per PR, the repo's final report format: outcome first; PR URL, squash SHA, reviewed head SHA,
reviewer identity; gates run with real counts; what changed; NOT RUN; risks and carryovers;
decisions with the principles that shaped them. At the end of each wave, append a wave summary to
`docs/reports/audits-2026-10-17/program-log.md`: PRs merged, production SHA, measurements that
moved, open carryovers. At the end of the program, one closing report comparing every A and G
finding against its PR, marked fixed, partially fixed, deferred (with the section 6 reason), or
disputed (with the code evidence).
