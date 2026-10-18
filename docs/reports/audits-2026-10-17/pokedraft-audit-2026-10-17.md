# pokedraft deep audit (2026-10-17)

Read-only audit of the whole platform: frontend, backend, engine, the share and leaderboard loop, mobile, and Manager mode with the Live match broadcast (the priority area). Nothing in the repo was edited, staged or committed. Production received only GET requests and one headless, unsubmitted cup run.

## How to read this report

- **Part 1** gives the verdict and the 15 findings that matter most.
- **Part 2** is the sequenced roadmap. Each item is shaped as a single PR, with its risk tier from `CLAUDE.md`.
- **Part 3** is the deep dive on Manager mode and the Live match, plus a "Matchday 2.0" vision.
- **Part 4** covers the other areas in short form, with ideas.
- **Appendices A to E** are the five full area reports, unedited. They hold every `file:line` cite, the measurements and the long improvement lists.

**Baseline.** Code was read at local `main` `40f3c92` (#70). Production and `origin/main` are at `f4489cb` (#69, "open the picker centered over the pitch"). PR #69 touched only `DraftBoard.tsx`, `DraftBoard.module.css`, the draft tests and docs. Draft-screen line numbers in Appendix B can therefore be off by a few lines. No other area is affected.

**Evidence labels.** Every claim carries one of these labels:

- **measured:** a script or browser run made this session.
- **code:** read from the cited lines.
- **inferred:** follows from the code but was not observed.
- **guess:** an educated guess, marked as such.

**Method.**

- Five parallel read-only auditors covered separate areas: the Live match, the pre-match UI, results and social, backend and platform, and engine and gameplay.
- The coordinator re-checked the headline claim of each auditor directly in code before relying on it. Those spot checks are marked "verified" below.
- The coordinator also ran one headless mobile session against production: an iPhone-sized 390x844 viewport, touch on, a 4x CPU-throttle sample, and a landscape sample. It played a cup8 run in Manager mode with Live match.
- Throwaway vitest and tsx scripts measured timeline divergence, ball jumps, manager impact, luck vs skill, and the leaderboard copy bypass.

---

# Part 1. Verdict and top findings

## Verdict

pokedraft is a careful, well-tested codebase:

- 1,313 of 1,313 unit tests pass (measured).
- The server recomputes every score.
- The engine is deterministic and golden-pinned.
- The mobile tap targets are policed by tests.

The weaknesses are not hygiene. They sit in three places.

1. **The Live match does not yet tell the truth or look like football.** The pitch, the sounds, the scoreboard and the momentum bar disagree with each other and with the engine. Some of them show the future. On a phone, you cannot see the pitch and the touchline at the same time.
2. **Manager mode punishes coaching.** Any single decision turns off the assistant for the rest of the match, including its fatigue subs. The tactic-vs-style edges are too small to reward a good read. The player gets no feedback on what their calls did.
3. **The friend-group loop is thin.** Sharing is clipboard-only. Challenges have no head-to-head payoff. Leaderboard identity is a free-text nickname that anyone can copy.

## Top 15 findings (ranked by user impact × confidence)

| # | Finding | Area | Evidence |
|---|---|---|---|
| 1 | **The sounds and the pitch play two different matches.** `MatchPlayer` builds the timeline without movesets and `Broadcast` builds it with them. `playCallout` draws from the RNG only when a moveset exists, so the streams split. Effects: per-phase SFX follow plays you are not watching, typed ability sounds never play, and (inferred) the pitch reshuffles when the movesets chunk lands. | Live match | measured, twice and independently: 69 of 72 phases differ on the test fixture; 416 of 456 (91%) over 6 real matches. Code: `MatchPlayer.tsx:80-83`, `Broadcast.tsx:117-120`, `moves.ts:78` |
| 2 | **The momentum bar spoils the next 5 minutes.** It counts goals and saves inside the current window `(from, to]`, so it leans toward a side before its shot or goal happens. At 0' it already showed 36/64 (measured, screenshot). It reads a flat 50/50 in 56 to 72% of windows. | Live match | verified, code: `timeline.ts:362-375`, `MatchPlayer.tsx:231-233` |
| 3 | **The scoreboard and screen reader announce a goal about 1.5 s before the ball goes in.** | Live match | code: `MatchPlayer.tsx:190-192` vs `timeline.ts:579-583` |
| 4 | **The wrong Pokémon lies injured.** The "down" pose goes to whoever holds the slot, which is already the replacement. At the injury stop this gives away the assistant's pick. | Live match | measured: Kommo-o lies down for Roselia (`timeline.ts:221-227`, `1153`, verified) |
| 5 | **The ball teleports.** It jumps more than 8% of the pitch in one frame 13 to 19 times per match, up to 79.7%. Unassisted goals and penalties start from the centre spot. | Live match | measured (`timeline.ts:973-974`, `1070-1073`) |
| 6 | **The phone layout splits watching from deciding.** At 390 px the pitch is 326x209 px, the touchline starts at y=746 of an 844 px screen, and the page is 1,959 px tall. In landscape the pitch sits below the fold. The HUD text collides ("36%3 SoT"). Sprites lazy-load, so opponents are empty rings at kickoff. | Live match, mobile | measured, headless 390x844 against production; code: `Broadcast.tsx:161` (no `eager`) |
| 7 | **Manager mode plus the default Quick view is frantic.** Phases last about 61 ms, SFX fire about 16 times a second with sound on, and a 2.6 s goal animation runs over about 53 match minutes. At 2x, the goal staging also outlives its hold. | Live match | code: `clock.ts:29-35`, `Broadcast.tsx:81-85`, `player.ts:136` |
| 8 | **One touchline tap fires the assistant for the rest of the match.** Picking "Balanced" at kickoff, a no-op, costs 0.8 win-rate points for good squads and 5.3 for random ones. | Engine, manager | measured; verified code: `match.ts:605-629` |
| 9 | **Tactics barely matter.** Reading the opponent's style and countering it gives 0.846 vs the auto coach's 0.848. Perfect hindsight is worth only +3.8 to +5.9 points. | Engine, manager | measured (Appendix E §2.4) |
| 10 | **Squad choice explains only 7 to 11% of win variance among competent drafters.** Shootouts are a coin flip (49.4%). The draft feels like it matters less than it should. | Engine | measured: 150 squads × 40 seeds per bot |
| 11 | **The highlights card shows wrong Pokémon types.** An ability's hard-coded element replaces the species' type for 156 of 1,025 species, e.g. Arcanine (Fire) shown as Dark. This breaks the "no fabricated data" invariant. | Results | measured; verified code: `abilityEffects.ts:101-107` |
| 12 | **"New run" mid-draft throws the run away in one tap**, with no confirm or undo. | Draft | verified code: `DraftBoard.tsx:608-615` → `LiveRun.tsx:166-178` |
| 13 | **Leaderboard: a coached leader's run can be copied under any nickname** by adding one redundant tactic decision. The new token gives an identical result and passes the dedupe guard. | Backend | measured on a production token (`scratchpad/noop-copy.mts`) |
| 14 | **The open redirect from the earlier audit (SE-14) is still in the code.** `safeNext("/..//evil.com")` returns `//evil.com`, which resolves to `https://evil.com/`. The production gate is off today, so exposure is low. | Backend | verified, reproduced with node (`passcode.ts:44-52`) |
| 15 | **Builder friendlies silently ignore Manager mode and Live match.** The toggles sit on the same home panel as the builder with no hint. In the headless run, "Play a friendly cup" went straight to results with both toggles on. | UX | measured; code: `LiveRun.tsx:115` ("Builder runs are friendlies; the matchday belongs to the drafted cups.") |

Honourable mentions (details in the appendices):

- The sticky home side panel is broken by `overflow-x: hidden` on `html, body`; switching to `clip` fixes it (measured in a minimal copy, `globals.css:21-27`).
- Keys 1 to 3 sign a candidate while the scouting dossier is open (code, not reproduced).
- Share never opens the native share sheet.
- The species data chunk is 178 KB gzipped.
- The CSP is still report-only.
- The `coached` filter base64-decodes every token in SQL on every read.
- The retained engine data copies are 7.1 MB, mostly identical files.

### Things that are good and should be protected

- Score integrity. The server replays the token and never trusts a client score (`handlers.ts:236-257`).
- Determinism discipline. The ESLint bans, the seeded substreams and the byte-pinned goldens.
- Mobile tap-target coverage. 31 scenes enforce 44 px targets and an 11 px text floor.
- Accessibility basics on the broadcast. The pitch is `aria-hidden` and the ticker has a polite live region.
- Frame pacing. Measured headless: p50 and p95 frame of 16.7 ms, 0 long tasks, both unthrottled and at 4x CPU throttle. About 3,100 broadcast DOM mutations per second. Caveat: rAF intervals in headless Chromium do not capture GPU raster or real-phone thermal limits. Physical phone: NOT RUN.

---

# Part 2. Sequenced roadmap

Each line is one dispatch and one PR off `origin/main`, under the repo's tier rules. Engine items are grouped so v6 is frozen and recalibrated once. Effort sizes: S is under a day, M is 1 to 3 days, L is longer.

### Wave 1. Truth pass (Yellow, about 1 week, highest value per hour)

These stop the UI from showing wrong or future information. Each one gets a RED-then-GREEN guard test.

| PR | What | Effort | Guard test |
|---|---|---|---|
| 1a | **One shared timeline.** Make `playCallout`/`shotCallout` consume a fixed number of RNG draws regardless of movesets, or move callouts to their own substream `broadcast:<seed>:<i>:callouts`. Lift `useMovesets` into `MatchPlayer` and pass the built timeline to `Broadcast`. | S | plays with and without `movesOf` are identical (literal `side`/`fromSlot`/`toSlot` for a pinned seed) |
| 1b | **Honest momentum.** Build the frame lean only from windows that have finished (`to <= clock`). Drop future goals from the possession bias too (`timeline.ts:406`). | S | at minute 0 the lean is 0; a goal at 4' does not move the lean before 4' |
| 1c | **Score lands with the ball.** Gate the score, ticker, live region and goal horn on staging progress ≥ 0.6, or apply them at once under reduced motion or in quick view. | S | score is 0-0 while the ball is still in flight |
| 1d | **Injury staging.** Render the injured species in the "down" pose and walk the replacement on afterwards. | S | Roselia, not Kommo-o, lies down at 42' |
| 1e | **Speed-aware staging.** Divide `SHOW` by `speed` in `activeBeat`. | S | the 2x goal beat ends when its hold ends |
| 1f | **Quick view is not a broadcast.** Recommended: Manager mode forces Live pace, since nobody can manage a 5-second match. Fallback: render Quick as `motion=false` with no per-phase SFX. This is a product call (see Decisions). | S | no per-phase SFX in quick view |
| 1g | **Mobile HUD and sprite fixes.** Wrap the HUD into two rows below 420 px (the "36%3 SoT" collision). Pass `eager` to the pitch `PlayerImage`s, or preload the 22 sprites during the prematch screen. Truncate nameplates by name rather than CSS width. | S | Playwright at 390 px: no overlap in the HUD; all 22 sprites `complete` at the kickoff stop |
| 1h | **Highlights type fix.** `element: primaryType`, and drop "Activated" ability copy the engine never recorded. | S | Arcanine star element is `"fire"` |
| 1i | **Draft safety.** Confirm or 5 s undo on "New run" mid-draft. Gate keys 1 to 3 while a dialog is open. `overflow-x: clip`. | S | one tap on New run keeps the round header |
| 1j | **Builder clarity.** Under "Play a friendly cup", add "Friendlies skip the matchday. Use Watch live on the results." Or allow the matchday for friendlies, which is the better product (it makes the builder a manager-mode sandbox). Product call. | S | n/a |
| 1k | **Security quick fixes (Red, deploy and env).** Make `safeNext` reject a pathname starting with `//`. Key IPv6 rate limits by /64. Add a Neon fetch timeout. Return 400 for a non-form body to `/gate/unlock`. | S | `safeNext("/..//evil.com") === "/"` |

### Wave 2. The broadcast feels like football (Yellow)

| PR | What | Effort |
|---|---|---|
| 2a | **Move the frame loop out of React.** The reducer and React tick at about 10 Hz for the clock, scoreboard, ticker and touchline. A rAF loop inside `Broadcast` calls `stagePitch` and writes `transform: translate3d()` through refs. Memoise the static pitch SVG and the sprites. Measure before and after with a 4x-throttled trace. Today it is fine in headless Chromium (measured), but it re-renders 33 `PlayerImage`s and the full touchline 60 to 120 times a second (code). The real-phone cost is unknown. | M |
| 2b | **Continuous ball.** On a turnover, the ball goes to the defender nearest the previous ball point (a tackle or interception animation). Goal and save flights start where the ball is. Penalties start from the spot and free kicks from a fixed spot. Blend back after staging. | M |
| 2c | **Smooth movement.** Catmull-Rom paths through the waypoints, so players do not stop every 0.69 s. Pose and facing from velocity. One cheap push-apart pass for overlapping sprites. | S |
| 2d | **Set pieces and restarts from the engine's `goalKind`.** Penalty: the shape freezes, the taker steps up, pause, kick. Free kick: a wall and a curled trail. Header: a cross trail and the scorer meets it high. Solo: a dribble chain past the presser. After every goal, both teams reset to kickoff shape and the conceding side kicks off. | M |
| 2e | **Shootout with suspense.** Run-up, pause, strike, an interpolated ball, and a keeper who dives the correct way. A sudden-death banner. | S to M |
| 2f | **Fatigue on the pitch.** Players below 65 energy move slower, carry a sweat pip and stride slower, so the pitch matches the touchline energy rows. | S |

### Wave 3. Phone-first matchday (Yellow)

| PR | What | Effort |
|---|---|---|
| 3a | **Touchline as a bottom sheet below 600 px.** Collapsed: tactic pills plus "Subs 2 of 5" plus the stop CTA. Expanded: the sub picker and energy rows. The pitch stays in view while you decide. Optionally auto-pause while the sheet is open. | M |
| 3b | **Broadcast camera.** One transform on the pitch layer. It follows the ball with critically damped smoothing, zooms 1.6x in open play and 1.0x for goals and saves, with a "Full pitch / Follow" toggle. Every position is already in pitch percentages, so this is cheap. | M |
| 3c | **Landscape and fullscreen.** Cap the pitch at `max-height: 70svh`. Add a "Fullscreen" button using the Fullscreen API, with the scoreboard as an overlay bug inside the pitch (TV style). Respect the safe-area insets. | S to M |
| 3d | **Team readability.** A kit colour per side shown as a shirt bib or ring under each sprite, plus a sprite size floor of about 44 px on phones. Option: derive the user kit from the squad's dominant type and the opponent kit from its theme. | S |
| 3e | **Haptics.** `navigator.vibrate` on a user goal, a red card and the final whistle, behind the existing Sound toggle (Android only; iOS has no Vibration API). | S |
| 3f | **Unlock audio on Watch live and "Go to the match".** | S |

### Wave 4. Manager payoff (Yellow, then one Red engine 7)

| PR | What | Tier | Effort |
|---|---|---|---|
| 4a | **Matchup scout note.** One line at kickoff and half time, generated from `ENGINE_COEFFICIENTS.manager` for the opponent's style (e.g. "Possession sides struggle against Press"). It must be generated from the coefficients, never written by hand. | Yellow | S |
| 4b | **"Your calls" card at full time.** Replay the match with the assistant in charge (one deterministic `runCup`, about 28 ms) and show "Assistant 1-0, You 4-0, your Attack switch at 12'". This is engine output, not invented. Show it only after full time. | Yellow | M |
| 4c | **`matchStory` feed with no version bump.** A pure function that re-derives, without changing results: per-chance xG, outcome (goal, saved, off target), zone and per-window territory. The broadcast then biases possession by real territory, so a 950 squad looks stronger than a 450 squad. It also enables an honest xG river under the HUD. The goldens prove no outcome moved. | Yellow/Red boundary | M |
| 4d | **Engine 7 bundle (one freeze, one recalibration).** <br>• Split `managed` into tactic and subs flags, so the assistant keeps doing fatigue subs until you make a sub. <br>• Larger, asymmetric tactic-vs-style edges, so a good read beats auto by 3 to 6 points and a bad read costs. <br>• Missable penalties and nominated set-piece takers. <br>• Opponent injuries and visible rotations. <br>• Goal kind weighted by attributes (aerial teams score headers). <br>Pin "informed choice beats auto by 3 to 6, oracle by no more than 10" in calibration. | Red | L |
| 4e | **Type matchups (prototype first).** Opponents are type-themed and shown pre-match, so a small type edge (±8% cap) creates a draft-time counter-pick puzzle. Measure the squad share of variance in a scratch harness against today's 11% before committing. | Red | M |

### Wave 5. Social loop (Yellow, then Red)

| PR | What | Tier |
|---|---|---|
| 5a | Native share sheet with text and URL. Show the URL when the copy fails. Add the metadata description. | Yellow |
| 5b | "Challenge a friend" on your own results, with a `vs=<token>` head-to-head card. Both runs replay client-side, so no server is needed. | Yellow |
| 5c | Exhibition against your latest drafted squad, not only the Builder save. | Yellow |
| 5d | Highlight your own rows on the board, plus "Share my rank". | Yellow |
| 5e | A staged results reveal: Team Score count-up, W-D-L flip, a trophy for champions. CSS only, reduced-motion aware. | Yellow |
| 5f | A server-side run fingerprint (squad + seed + result) to block the copy bypass. Store `coached` as a column at insert. | Red |
| 5g | Weekly cup and season standings, rivalries, locally computed badges. | Red / Yellow |
| 5h | Passwordless friend identity: a per-device key, or a group invite code that claims a nickname. This retires nickname squatting. | Red |

### Wave 6. Platform hygiene (Green, Yellow, Red as marked)

- Enforce the CSP (Red).
- A GitHub Actions cron on `/api/health?db=1` for uptime alerts (Green).
- Extend the colour lint to `rgb()`/`rgba()`; there are 111 literals today (Yellow).
- Breakpoint tokens to replace the 11 ad-hoc values (Yellow).
- Content-addressed engine data, so the identical `pokedex.json`/`scouting.json` copies are stored once. Also fix the `next.config.ts:41` regex that misses v5 (Red).
- Split the species chunk into a slim index plus lazy attributes (Red).
- `error.tsx` and `global-error.tsx` (Yellow).
- Refresh the stale 360 px matchday screenshots and fix STATE.md's claim that they were updated (Green).

---

# Part 3. Manager mode and Live match deep dive

Full detail is in Appendix A (broadcast) and Appendix E §2.4 and §3 (engine). This part gives the synthesis and the vision.

## 3.1 What the engine knows vs what the screen shows

- **What the engine emits:**
  - goals, with kind (open play, header, solo, free kick, penalty) and assist
  - saves
  - cards, user injuries, subs and tactic changes
  - a 5-minute snapshot of energy, tactic, the XI and the score
- **What the engine does not record:** misses, possession, territory, fouls and corners.
- **What the broadcast invents between events:** every pass, dribble, duel, cross and run, drawn from its own seeded stream (`timeline.ts:382-489`). The consequence is that a 950-rated squad and a 450-rated squad look identical between goals.

This is honest today only in that the choreography is labelled as nothing. The `matchStory` feed (4c) is the cheapest route to a broadcast where the better team visibly dominates. It needs no token or engine version change, because it re-derives from the same draws.

## 3.2 The manager loop today

1. A stop opens at kickoff, half time, before extra time and at each user injury. You can also act at any whole minute while play runs.
2. You choose from five tactics (with one-line hints) and up to 5 subs.
3. The decision replays the whole cup deterministically (`runCup`).
4. Feedback is the tactic pill, a few percent of line-height shift, and eventually goals.

The problems:

- **Invisible stakes.** The opponent's style is shown, but the tactic-vs-style table that decides the matchup is never surfaced.
- **A hidden penalty.** Any decision fires the assistant, fatigue subs included.
- **Weak levers.** A correct read is worth about 0 points today (measured).
- **No closure.** Nothing tells you whether your calls helped.

Measured on match 0 of the golden squad, switching to Attack early turned 1-0 into 4-0. So tactics can swing a single match. They just do not pay off on average, and the player cannot see why a call worked.

## 3.3 Matchday 2.0, the target experience

A phone held in portrait, one thumb.

1. **Prematch card.** Opponent crest, type theme, style chip, and a generated scout line ("Possession side. Press hurts them, Counter does not"). It is also where the 22 sprites preload.
2. **Kickoff.** The pitch fills the top 60% of the screen with a follow camera. A TV-style score bug sits inside the pitch. The touchline is a slim bottom sheet: five tactic pills and "Subs 0 of 5". Tapping a pill applies it at the next minute, with no scroll and no stop.
3. **Open play.** The ball never teleports. The stronger side holds territory because `matchStory` says so. An honest xG river fills in under the score bug as each window completes. Tired players visibly slow and sweat. Crowd noise rises in the final third.
4. **A goal.** The ball goes in, then the score ticks, then the horn and haptic, then a 1.5 s instant replay at half speed with a REPLAY bug. Both teams reset to kickoff shape.
5. **Set pieces.** Penalties and free kicks are staged as moments. With engine 7, penalties can be missed and your nominated taker matters.
6. **Half time.** A team-talk sheet: energy list, suggested subs (the assistant's pick marked) and the scout line again. Choosing nothing keeps the assistant in charge. That requires the engine 7 split.
7. **Full time.** A "Your calls" card shows the assistant's result vs yours and the decisive change. Then a share chip ("I turned 1-0 into 4-0 with a 12' switch") that deep-links to `/r/<token>?watch=<match>&t=<minute>`.

### Creative extras, ranked by delight per effort

- **Instant replay of user goals** (M). The staging is a pure function of `(beat, progress)`, so a replay is free to compute.
- **Goal deep links** (S). `/r/<token>?watch=2&t=67` autoplays the replay at that goal, which makes for great group-chat bait. A video export with `MediaRecorder` comes later (L; iOS support is a guess).
- **Synthesized crowd bed** (M). Band-passed Web Audio noise whose gain follows the ball's x position, with a roar envelope on goals and a longer one for late equalisers. Zero assets.
- **Commentary lines from real fields** (S to M). E.g. "Late drama at 87'", "{scorer}'s second of the match", and "Against the run of play" once xG exists. No flavor text, no em dashes.
- **Stadium theming by opponent region** (S). A pitch tint, crowd colour, and night lighting with floodlight glows for the final. Purely visual.
- **Champion trophy lift** (S). After the final whistle of a won final, the XI gathers at the centre circle and the MVP sprite hops with a trophy.
- **Watch party** (L, Red). A shared clock across friends' devices so a group watches the final together. Built on the deterministic replay plus a server start timestamp; no streaming is needed.
- **Touchline shouts** (L). Cosmetic first ("Push up!" nudges the line animation). Make them mechanical only after 4b shows players understand the existing levers.
- **Broadcast heatmap** (S to M). Optional, and it must be labelled "broadcast heatmap". It is choreography, not a stat, and the most likely of these to read as fabricated data.

## 3.4 Coordinator-measured browser evidence (production, headless, 390x844, touch)

| Measure | Result |
|---|---|
| Frame interval, live play, 5 s | p50 16.7 ms, p95 16.8 ms, 0 frames over 33 ms, 0 long tasks |
| Same under 4x CPU throttle | p50 16.7, p95 16.8, 0 over 33 ms, 0 long tasks |
| Broadcast DOM mutations | 3,126 in 1 s |
| Broadcast box | 326 x 209 px at y=301 |
| Touchline top | y=746 (viewport is 844), height 1,124 px |
| Page height during the match | 1,959 px |
| Horizontal overflow | 0 px |
| Control sizes | all ≥ 44 px tall |
| Landscape 844x390 | pitch starts below the fold (screenshot) |
| Kickoff stop | several opponent slots show only a shadow ring, no sprite (screenshot; consistent with lazy `PlayerImage`) |
| HUD | "36%3 SoT" and "50%1 SoT" text collision at 390 px |

Interpretation:

- Main-thread frame pacing is not the problem on a fast machine. Layout and screen real estate are.
- Headless rAF timing does not include GPU raster, so the real-phone cost of 24 `left`/`top` layout writes per frame stays unknown.
- Physical phone: NOT RUN.

Screenshots are in `~/Downloads/pokedraft-audit-2026-10-17-shots/`.

---

# Part 4. Other areas, short form

## 4.1 Pre-match: home, draft, builder (Appendix B)

**Friction.**

- It takes three taps and two reads of the same settings before the first roll: Play, then "Settings confirmed?", then the start card.
- On phones the settings panel starts open, so the builder's h1 lands far down the page (measured screenshot: the first fold is all settings).
- The challenge draft never shows a live Team Score or a per-pick change, even with ratings on, though the partial rating is already computed.

**Biggest wins.**

- One-tap play.
- A home hierarchy rewrite: two challenge cards plus a dated Daily card, with the builder demoted.
- A live projected Team Score with "+4 / -2" on each candidate when ratings are on.
- A fast-spin preference that saves about 40 s per run.

**Creative ideas.**

- Tap-to-explain chemistry lines.
- Synergy previews on candidate cards.
- Reroll tension cues ("Was: Water").
- A 16-pick film strip.
- A PWA manifest (no service worker).
- Haptics.

**Product call.** Blind mode still shows Best/OK/Poor slot hints. That contradicts "Off keeps challenges blind".

## 4.2 Results, share, leaderboard, history (Appendix C)

- **Data honesty.** Fix the type icon now (finding 11). The "Activated Ability" box describes something the engine never records. The Clean Sheet Hero award goes to `starters[0]` even when the keeper missed the match.
- **Social payoff.** Native share, Challenge a friend, a `vs=` head-to-head, exhibition against your own latest squad, "Share my rank".
- **Accessibility.** Rows carry 16 sprite alts each. The "Challenge this Seed" links all have the same name. Closing Watch live loses focus. The leaderboard tabs lack the panels and arrow keys their role promises.
- **Theme.** 78 rgba literals in the highlights styles slip past the hex-only colour lint.

## 4.3 Backend and platform (Appendix D)

- **No P0 hole.** The server recomputes scores, errors are PII-free, and the limiter is one serialized statement.
- **Integrity gaps, by design:**
  - client-chosen all-time seeds (seed shopping)
  - a public daily seed with no recorded first attempt (save-scumming)
  - unauthenticated nicknames
  - the no-op decision copy bypass (measured)
- **Ops:** no alerting. Neon calls have no timeout. The proxy runs on every image. The `/card` render costs 2.29 s on a miss with no cap.
- **Maintainability:** the engine version vendoring is worth keeping but stores identical data many times. CI lacks a format check, job timeouts, SHA-pinned actions and a real-Postgres migration run.

## 4.4 Engine and gameplay (Appendix E)

- A match is 18 five-minute windows of Bernoulli chance trials. λ comes from attack vs defence and keeper, scaled by midfield.
- **The design gap is skill share.** Good-vs-random drafting is worth +2.6 wins, but among good drafters the squad explains only about 11% of win variance.
- No formation or type build dominates (all within 0.25 wins).
- Types never touch the match itself.
- **Highest-leverage design change:** type matchups against the themed opponents. Prototype it first.
- **Highest-leverage manager change:** the engine 7 bundle in 4d.

---

# Decisions for the owner (product calls no experiment can settle)

1. **Manager mode with Quick view.** Recommended: force Live pace when Manager mode is on. Alternative: keep Quick but render it still and silent.
2. **Friendlies and the matchday.** Recommended: allow Manager mode and Live match for Builder friendlies, so the builder becomes a manager sandbox. Alternative: keep skipping them, with a one-line hint.
3. **Blind challenges.** Hide the Best/OK/Poor slot hints when ratings are off, or reword the setting's hint.
4. **Assistant behaviour after a decision.** The engine 7 split (recommended), or a visible "Assistant on/off" toggle.
5. **Leaderboard identity.** Stay casual with nicknames, or add a friend-group invite code that claims a nickname.

# NOT RUN (whole audit)

- Physical phone (any model), real 120 Hz devices, iOS Safari audio. Only headless Chromium was used.
- A React profiler or GPU raster trace of the broadcast.
- Listening to the SFX; the audio conclusions come from code and the timeline measurement.
- Repo gates on a clean checkout of `f4489cb`. The backend auditor ran the full vitest at `40f3c92` (1,313 of 1,313 passed, 25.2 s); the engine auditor ran `src/engine` (273 of 273 passed).
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, Playwright, Lighthouse, axe, theme contrast and CVD scripts.
- `pnpm calibrate` and the full 90k-cup sweep; kanto151 and builder probes; confidence intervals on the manager tables.
- Production POSTs, Vercel logs (the MCP returned 403/404 for this project) and Neon inspection.

# Evidence files (scratchpad, session-local)

Base: `/private/tmp/claude-501/-Users-paulo-Projects-pokedraft/854f3f50-b741-4766-8d1d-05bc30586c64/scratchpad/`

- **Area reports:** `audit-matchday.md`, `audit-draft-ui.md`, `audit-results-social.md`, `audit-backend.md`, `audit-engine.md`. These are reproduced below as Appendices A to E.
- **Coordinator probes:** `divergence.test.ts`, `vitest.scratch.mts`, `live-probe.mjs`.
- **Screenshots (copied next to this report in `~/Downloads/pokedraft-audit-2026-10-17-shots/`):** `shots/kickoff-stop.png`, `shots/live-play-1.png`, `shots/live-seq-*.png`, `shots/live-landscape.png`, `shots/draft-r1.png`, `shots/prematch.png`.
- **Engine probes:** `probe.mts`, `mgr-good.json`, `mgr-random.json`, `luck.jsonl`, `upsets.jsonl`, `form-*.jsonl`.
- **Backend probes:** `noop-copy.mts`, `replay-time.mts`, `vitest.json`, `board-*.json`.
- **Sticky repro:** `sticky/t.mjs`.

The scratchpad is temporary. Copy anything you want to keep.

---


# Appendix A. Manager mode and Live match

## Audit: Manager mode and the Live match broadcast

Read-only audit of `main` at `40f3c92` (PR #70, the sim overhaul). Nothing in the repo was edited.

Evidence labels used below:

- **Measured.** I ran a throwaway `tsx -e` script against the real engine and timeline on the
  engine-6 replay of the golden cup8 draft (`"pd6." + GOLDEN_CUP8_V5.slice(4)`, 6 played matches).
  No file was written. The numbers are from that one squad, so treat them as one sample.
- **Code.** Read directly from the cited lines.
- **Inferred.** Follows from the code, but I did not watch it on screen.
- **Guess.** Labelled as such.

Browser checks were NOT RUN. The coordinator ruled out visible browsers, and I chose static reading
over a headless profile. So there are no frame-time, React render-cost or real-phone numbers in
this report.

---

### 0. Top findings (read this first)

1. **The broadcast and the match player build two different choreographies.** Measured: 416 of
   456 open-play phases (91%) differ between them. `MatchPlayer` builds its timeline without
   movesets (`MatchPlayer.tsx:80-83`). `Broadcast` builds it with them (`Broadcast.tsx:117-120`).
   `playCallout` only draws from the shared `plays` RNG when a moveset exists (`moves.ts:78`), so
   the two streams split at the first callout. This causes three problems:
   - Per-phase SFX come from a timeline the viewer is not watching (`MatchPlayer.tsx:173-186`).
   - Ability sounds always play the `impact` profile, because the moveset-free timeline never has
     a typed effect (`moves.ts:79-81`). Goals behave the same way (`MatchPlayer.tsx:154`).
   - When the movesets chunk lands (`Broadcast.tsx:38-57`), all 22 players and the ball cut to a
     different choreography in one frame (inferred). In Watch live, autoStart can start the clock
     before the chunk loads.
2. **The ball teleports.** Measured: with no event being staged, 13 to 19 frames per match move
   the ball more than 8% of the pitch in a single 60 fps frame, and the largest jump is 79.7%. The
   cause is possession changes. A "duel" phase hands the ball to a player on the other side without
   carrying it there (`timeline.ts:416-434`, `1070-1073`). Goals are worse (measured):
   - 23 of 27 goals jump the ball at the start of the goal staging.
   - 27 of 27 jump it again when the staging ends and the ball returns to the phase position.
   - Penalty, solo and free-kick goals have no assist, so the ball starts at the centre spot
     `{50,50}` (`timeline.ts:973-974`). 13 of 27 goals were unassisted.
3. **The scoreboard shows the goal about 1.5 s before the ball goes in.** The score counts a goal
   as soon as its beat is revealed (`MatchPlayer.tsx:190-192`). The ball only reaches the net at
   progress 0.6 of a 2.6 s staging (`timeline.ts:579-583`), and the GOAL flash shows at 0.6 to 0.9
   (`Broadcast.tsx:335`). The ticker and its `aria-live` line announce the goal at the same early
   moment.
4. **The injury animation shows the wrong player lying down.** Measured, match 5:
   - At 42', Roselia is injured, but Kommo-o (her replacement) is drawn with `pose=down`.
   - At 63', Dragalge is injured, but Duraludon lies down.

   The `changes` list removes or replaces the injured player at the injury minute
   (`timeline.ts:221-227`), and the "down" pose is applied by slot (`timeline.ts:1153`). At an
   injury stop, the pitch therefore shows the assistant's pick on the floor while the dialog asks
   you to choose a replacement. That also spoils the assistant's pick.
5. **Manager mode plus the default Quick view gives a frantic broadcast.** `matchView` defaults to
   `quick` (`src/ui/settings.ts:46`). `Broadcast` mounts in both views (`MatchPlayer.tsx:293`).
   Quick pace is 48.9 ms per match minute (`clock.ts:29-35`), so each 1.25-minute phase lasts about
   61 ms. Inferred consequences:
   - Players re-target about 16 times a second.
   - With sound on, the per-phase kick or ability SFX fires about 16 times a second
     (`MatchPlayer.tsx:173-186`).
   - The goal staging still lasts 2.6 s (`Broadcast.tsx:30`) while about 53 match minutes run
     underneath it, because `holdGoal` is 0 in quick (`clock.ts:33`).
6. **At 2x speed, the goal staging outlives its hold.** The hold is divided by speed
   (`player.ts:136`), but the on-pitch staging time `SHOW` is not (`Broadcast.tsx:81-85`). At 2x,
   play resumes 1.3 s into a 2.6 s goal. The ball sits in the net while the rest of the team plays
   on around it, then snaps back (inferred).
7. **Momentum barely moves, and it peeks at the future.**
   - Flat: `frames[].ball` counts only goals and saves inside each 5-minute window
     (`timeline.ts:362-380`). Measured: it is exactly 0, so the HUD reads 50% / 50%, in 10 to 14 of
     18 windows per match. The 1280 screenshot shows 50% / 50% at 1-2.
   - Future-leaking: the window is `(from, to]`, so the bar and the possession bias
     (`timeline.ts:406`) lean toward a goal before it happens.
8. **The whole match tree re-renders on every animation frame.** Each frame does a `dispatch` and
   a `setNow` (`MatchPlayer.tsx:108-113`). That re-renders `MatchPlayer`, `Broadcast` (not
   memoised), 22 `PlayerImage`s, the full `Touchline` (11 more `PlayerImage`s and 2 `<select>`s),
   and the `Ticker`. Sprites and the ball move with `left`/`top` percentages
   (`Broadcast.tsx:91-93`, `157`), so every frame also triggers layout. On a 120 Hz phone that is
   120 renders a second.
   - The pitch maths is not the cost. Measured `stagePitch`: 0.007 to 0.032 ms per call in Node.
   - The React and layout cost is inferred, not measured (NOT RUN).
9. **The 360 px evidence is stale.** `touchline-kickoff-360.png`, `touchline-stop-360.png`,
   `prematch-360.png` and `live-match-move-callout.gif` were last committed in #62 (`35b99cf`), and
   they still show the old plain white-dot ball. STATE.md's overhaul section says "updated
   screenshots are in `docs/reports/manager-mode/`", but only the 1280 shots and
   `live-move-callout.png` were refreshed in `40f3c92`. STATE.md also lists the physical phone
   check as NOT RUN.

---

### 1. How it works now

#### Data flow

```
engine runCup ──► MatchResult {goals[kind,assist], saves[], incidents[], windows[5-min snapshots], shootout}
   │                         (src/engine/types.ts:262-410; produced in match.ts:727-829)
   ▼
MatchdayFlow (holds cup + actions; each decision = full runCup replay)   MatchdayFlow.tsx:65-94
   ▼
MatchPlayer
   ├─ buildTimeline(match)  (no movesets)        MatchPlayer.tsx:80-83
   ├─ stopsFor(match)       kickoff/45/90/injuries clock.ts:51-68
   ├─ useReducer(play)      clock, holds, fired  player.ts:100-180
   ├─ rAF loop: dispatch(tick) + setNow(t)       MatchPlayer.tsx:104-117
   ├─ HUD / scoreboard / ticker / touchline / SFX
   ▼
Broadcast
   ├─ buildTimeline(match, movesOf)  (WITH movesets, separate memo)  Broadcast.tsx:117-120
   ├─ activeBeat(fired, now)         Broadcast.tsx:66-89
   ├─ stagePitch(timeline, {clock, active, kicks, motion})   timeline.ts:751-1222
   └─ React DOM: SVG pitch, 22 absolutely-positioned divs, ball div, trail SVG, overlays
```

#### Engine side (what really happens)

- The engine plays 18 regulation windows of 5 minutes (`match.ts:831-839`), plus 6 more in extra
  time.
- Each window has per-side "chance trials" with a goal probability `p`. A failed trial becomes a
  recorded save with probability `saveProbability` (`match.ts:779-815`).
- Misses, off-target shots, fouls, corners and possession are not recorded. The only on-pitch
  facts are goals (with `kind`: open-play, header, solo, free-kick, penalty), saves, cards,
  injuries, subs, tactic changes and window snapshots (energy, tactic, on-pitch XI, score).
- Decisions apply before the items of the next minute (`match.ts:752-768`, `applyDecisionsUpTo`).
  Per-window subseeds keep replays deterministic. Measured: a tactic decision at 12', 31', 47' or
  63' changed none of the already-shown phases (0 changed in 8 trials).

#### Timeline (`src/ui/matchday/timeline.ts`)

- **Beats** (`212-347`). Goals, saves, cards, injuries, subs, tactics and whistles, sorted by
  minute and then by rank.
- **Frames** (`362-380`). One per 5-minute window, holding a `ball` lean from goals and saves in
  `(from, to]` and a `line` height from the snapshot tactic (`TACTIC_LINE`, `158-164`).
- **Plays** (`382-489`). 72 phases of 1.25 minutes (96 with extra time), from the RNG
  `broadcast:<seed>:<i>:plays`.
  - Possession is forced to the attacking side in a phase that contains a goal or a save
    (`400-405`).
  - Otherwise possession is held or flipped by `holdProb` and `userBias` (`406-410`).
  - The kind is duel, dribble, through, cross or pass (`422-455`). The play also picks two runners
    and a presser (`457-465`), and maybe a callout (`467-472`).
- **`phaseWaypoint`** (`656-749`). One target position per player per phase:
  - The carrier moves to `focus` (home plus a surge, `684-693`).
  - The presser goes next to the focus (`718-729`).
  - Runners get a +11% push (`735-737`).
  - Everyone else shifts with the team and with the focus, plus a per-player cadence (`730-741`).
  - The keeper's y follows the focus y at 0.22 gain, clamped to 38-62 (`703-713`).
- **`stagePitch`** (`751-1222`).
  - Players lerp from waypoint(i-1) to waypoint(i) with `smoothstep` (`906-932`).
  - The ball is at the carrier's feet (`1045-1069`, `1102-1114`) or flies from `fromSpot` to
    `toSpot` between u = 0.24 and 0.86, with ease-out and parabolic `loft` (`1074-1101`).
  - Goal beats override the scorer, assist, keeper and ball (`942-1001`).
  - Save beats override the attacker, keeper and ball, then deflect the ball (`1002-1040`).
  - A sub beat walks the new player in from the touchline (`1127-1129`).
  - Poses come from displacement since the phase start (`1152-1182`). Facing comes from `dx`
    (`1184-1186`).
  - Reduced motion returns still slots (`789-822`).
  - The shootout has its own static layout (`824-904`).

#### Clock (`player.ts`, `clock.ts`)

- Live pace (`clock.ts:21-28`):
  - 25 s per half, which is 556 ms per match minute.
  - 533 ms per extra-time minute.
  - 1.2 s per penalty kick.
  - A hold of 2.6 s on goals and 0.9 s on saves.
- `tick` (`player.ts:100-148`):
  - Advances the clock up to the next stop, hold beat or final minute.
  - Stamps `fired[key] = now` for each newly revealed beat. That stamp drives the beat's staging
    progress in `Broadcast.activeBeat`.
  - Enters `pens` and then `done`.
- Skip jumps to full time and marks every stop answered (`167-178`).

#### Determinism

- The timeline only uses `createRng` seeded by `seed:matchIndex` (`timeline.ts:253`, `384`,
  `491`).
- `performance.now` and the rAF timestamps only drive presentation timing, so they never touch the
  engine or the token.
- The one determinism defect is the moveset-dependent RNG draw (finding 1). The same match at the
  same minute can look different depending on whether the movesets chunk has loaded.

---

### 2. Animation quality

| Aspect | State | Evidence |
| --- | --- | --- |
| Frame loop | rAF, but via React state. Two `setState` calls per frame, auto-batched into one render of the whole subtree. A second rAF loop keeps `now` ticking for 3 s after a pause or stop so CSS-adjacent staging finishes. | `MatchPlayer.tsx:104-133` |
| Render cost per frame | 24+ moving divs restyled through `left`/`top` (layout, not compositor). The static pitch SVG (10 stripes, about 20 marks) is rebuilt as React elements every frame. `will-change: left, top` does not promote these to compositor-only motion. | `Broadcast.tsx:143-180`, `201-230`; `Broadcast.module.css:137-147`, `473-482` |
| Interpolation | C0-continuous waypoints with `smoothstep` per 1.25-minute phase. Velocity drops to zero at every phase boundary (every 0.69 s live), so all 22 players accelerate and brake in lockstep. Inferred: a visible "breathing" rhythm. | `timeline.ts:573-576`, `909-928` |
| Player speed | Measured peak of 2.8 to 3.5% of pitch length per 60 fps frame (about 1.7 to 2.1 pitch lengths per second). The time compression is 108x, so "realistic" is relative, but the peaks come from the presser and the runners snapping between roles, not from steady running. | `timeline.ts:718-737` |
| Poses and facing | Pose comes from displacement since the phase start, not from velocity. Every player resets to `idle` and default facing at the start of each phase, then flips once it has moved 1.2% (inferred flicker every 0.69 s). | `timeline.ts:1138-1152`, `1184-1186` |
| Overlap | Measured at 1280 scale: about 1 pair of players within 3% of each other per sample. No separation or collision pass. At 360 px a sprite is about 38 px on a pitch about 328 px wide (11.6% of its width), so inferred overlap is much heavier. | `Broadcast.module.css:16-29`, `143-145` |
| Ball flight | The ease-out lerp plus `sin` loft and a shadow that scales with loft is decent. But turnovers teleport the ball (measured above), spin is `clock * 290`, a constant rate unrelated to speed (`timeline.ts:1215`), and spin freezes during goal holds because the clock is held. | `timeline.ts:1074-1101`, `1215` |
| Trails | Drawn in a `100x100` viewBox with `preserveAspectRatio="none"` on a 100:64 box, and `.trailGlow`/`.trailLine` have no `vector-effect: non-scaling-stroke`. Inferred: strokes are thicker horizontally than vertically. | `Broadcast.tsx:233-243`; `Broadcast.module.css:108-122` |
| Formation shape | Real formation slots, tactic line height (+7 attack to -7 defend), team shift toward the focus. Readable at 1280 (screenshot). Lines rarely compact or stretch, and a defensive block never forms. | `timeline.ts:527-534`, `733-734` |
| Goalkeeper | Tracks the phase focus y (not the ball) at 0.22 gain, clamped to 38-62. Dives on goals and saves with a CSS keyframe rotation, positioned at y=43 for goals. A save pushes the keeper to the shot line. There is no sweeper, distribution or goal-kick behaviour. | `timeline.ts:703-713`, `963-968`, `1018-1024` |
| Camera | None. The pitch is fixed full-width with no zoom, pan or follow. The pitch height has no cap, so a landscape phone cannot fit the pitch (inferred). | `Broadcast.module.css:12-17` |
| Goal celebration | The scorer and assist get the `celebrate` hop after progress 0.65, plus a GOAL flash, an elemental burst at the mouth and the move callout. There is no team huddle, no reset to the centre and no kickoff restart. Play resumes from wherever the phase model is. | `timeline.ts:1155-1161`; `Broadcast.tsx:321-347` |
| Replays | None in-match. Results have Watch live (whole match) and a separate legacy text studio. | `MatchReplay.tsx:55-63`; `MatchdayLive.tsx` |
| Set pieces | The engine records `kind` header, free-kick and penalty (`match.ts:353-361`), but the broadcast ignores it. A penalty is staged as a run from the centre spot. | `timeline.ts:277` (stored only), `973-974` |
| Cards | A banner plus a yellow pip on the sprite. A red-carded player vanishes on the spot (measured: Ludicolo is not rendered during his own red-card beat). | `Broadcast.tsx:166-172`, `357-362`; `timeline.ts:225` |
| Subs | The incoming player walks from (50,94) with smoothstep and a sub board shows. The outgoing player vanishes. | `timeline.ts:1127-1129`; `Broadcast.tsx:369-376` |
| Injuries | Medic banner. The `down` pose lands on the replacement (finding 4). | `timeline.ts:1153` |
| Half time | Manager stop plus whistle banner. Teams do not change ends and do not walk off. | `clock.ts:55`; `Broadcast.tsx:383-387` |
| Shootout | Teams line up on halfway, the taker is on the spot, the keeper stands on the line. The kick is a jump cut: the ball goes from the spot to the net or wide in one frame (`trail.progress: 1`, no interpolation). The keeper dives to y=43 when the kick scores and y=54 when it does not, so the dive goes the wrong way on a goal. | `timeline.ts:824-904` |
| Score and minute consistency | The final score always matches the engine, because it is derived from `match.goals`. The in-play score runs about 1.56 s ahead of the ball (finding 3). The "SoT" count is goals plus saves, which is honest to the engine. | `MatchPlayer.tsx:190-192`, `225-230` |
| Reduced motion | OS preference only, with no in-app toggle. Positions freeze, poses go idle, CSS animations stop. The rAF tick still re-renders the tree every frame to move the clock. | `useReducedMotion.ts`; `MatchPlayer.tsx:104-117` |

---

### 3. Gameplay and manager depth

**Decisions available.**

- Five tactics, each with a one-line hint (`Touchline.tsx:67-84`, `format.ts:96-102`).
- Up to 5 subs from the available bench (`Touchline.tsx:86-139`). You can click an energy row to
  pick who comes off (`147-195`).
- An injury replacement choice with the assistant's pick preselected (`MatchPlayer.tsx:456-512`).
- Decisions are allowed at the forced stops (kickoff, 45', 90' before extra time, user injuries,
  `clock.ts:51-68`) and at any integer minute while play runs (`MatchPlayer.tsx:204-210`,
  `player.ts:183-190`).

**Impact is large but hard to read.**

- Measured on match 0 of the golden squad: switching to Attack at 12', 31' or 47' turned 1-0 into
  4-0, and at 63' into 3-0. Defend left it at 1-0.
- The engine-6 log puts the ceiling at about +0.5 wins per cup for a replaying coach
  (`engine-6-manager.md:13-18`).
- After a change, the player sees only these signals:
  - The tactic pill (`MatchPlayer.tsx:271-291`).
  - A line-height shift of a few percent, applied from the window snapshot (`timeline.ts:376-377`).
  - Eventually the goals and saves.

  Nothing says "your Attack switch is creating more chances", because the engine only exports
  converted chances and saves.
- The engine's tactic-versus-style matchup table exists (`coefficients.ts:170-183`, for example
  `possession: { press: [1.18, 0.98], counter: [0.92, 0.82] }`). The prematch shows the opponent
  style (`MatchdayFlow.tsx:172-177`), but the touchline hints never mention the matchup. That is
  the single most decision-relevant fact, and it is hidden.

**Feedback loop.**

- After full time, the footer gives the result only (`MatchdayFlow.tsx:127-144`).
- There is no "your calls" summary and no comparison with what the assistant would have done.
  - Such a comparison is cheap and honest. `decide`/`runCup` is deterministic
    (`touchline.ts:245-271`), so the cup with and without this match's actions can be shown side
    by side.
  - Caveat: later matches can differ because of knock-on effects.

**Energy.**

- The touchline meters update once per 5-minute window snapshot (`touchline.ts:135-140`).
- Fatigue is invisible on the pitch. Tired players move and pose exactly like fresh ones.

**Pacing.**

- Pause, 2x, skip to full time and sound are all there (`MatchPlayer.tsx:305-352`).
- Missing: scrub, rewind, slow motion, "skip to next event" and keyboard shortcuts.
- Skip in manager mode silently answers every remaining stop, including injury choices
  (`player.ts:176`), with no warning.

**Tension and drama.**

- The engine records no near misses, so between saves the only build-up is the cosmetic phase
  chain.
- There is no stoppage time, no late-game camera or audio swell, no crowd, and no "VAR"-style
  beat.
- The momentum bar is flat most of the time (finding 7).

**Two results surfaces.**

- Results shows the legacy "Silph Cup Broadcast" text studio (`ResultsView.tsx:145-160`,
  `MatchdayLive.tsx`). It advances 3 match minutes every 80 ms (`37-48`) and only plays a horn for
  user goals.
- Results also shows per-match Watch live with the real broadcast (`MatchReplay.tsx`).
- Having both is confusing, and it duplicates the event formatting and the standings logic.

---

### 4. Mobile

**Layout at 360 px** (stale screenshot `touchline-kickoff-360.png` plus the current CSS).

- Everything is one column, in this order:
  - scoreboard
  - progress bar
  - HUD
  - pitch, about 328x210 px
  - controls, which wrap to 2 rows
  - stop prompt
  - touchline: 5 stacked tactic cards, about 330 px; sub selects; 11 energy rows at 44 px, about
    480 px
  - ticker
- Inferred: the page is about 1,700 px tall. While play runs, you cannot see the pitch and the
  touchline at the same time, so a mid-match tactic change means scrolling away from the pitch.
- The stop prompt sits below the controls. At kickoff, the call to action is under the fold on
  short phones.

**Sprites.**

- `--sprite: 0.48` makes an 80 px box about 38 px (`Broadcast.module.css:16`).
- Carrier nameplates are 11 px (`354-367`).
- Callout badges are clamped at a minimum of 10 px (`432`).
- 22 sprites of about 38 px on a 210 px tall pitch crowd each other (inferred).

**Orientation.** No landscape handling and no `max-height` on the pitch. Inferred: in landscape the
pitch is taller than the viewport.

**Touch targets.**

- Controls, tactics, energy rows, injury choices and the stop button are all at least 44 px
  (`MatchPlayer.module.css:139-142`, `151-154`, `173`; `Touchline.module.css:50,125,137,160`).
  Good.
- Sub selection uses native `<select>`, which works fine on phones.
- `e2e/mobile-targets.spec.ts` covers the matchday per STATE.md.

**Low-end performance.** This is the per-frame full re-render plus layout from finding 8.
High-refresh phones double the work. Not measured (NOT RUN).

**Audio policy.**

- Sound defaults off (`sound.ts:13`).
- `unlockAudio` runs on Pause/Kick off, the sound toggle and the stop button
  (`MatchPlayer.tsx:314`, `347`, `367`).
- Watch live (`MatchList.tsx:124-131`) and "Go to the match" (`MatchdayFlow.tsx:199`) do not call
  it. Inferred: after a reload, or on a fresh `/r/` visit with sound saved as on, the match runs
  silent until the user taps a control.
- An iOS context suspended by backgrounding is only resumed on those taps.

---

### 5. Bugs, risks, performance and accessibility

#### Bugs (concrete)

| # | Bug | Where | Severity |
| --- | --- | --- | --- |
| B1 | Two timelines diverge (91% of phases): wrong SFX, typed sounds never play, and the pitch reshuffles when the movesets load | `MatchPlayer.tsx:80-83`, `Broadcast.tsx:117-120`, `moves.ts:78` | High |
| B2 | Injured player's "down" pose drawn on the replacement, which also spoils the assistant's pick at the injury stop | `timeline.ts:221-227`, `1153` | High |
| B3 | Scoreboard, ticker and `aria-live` announce a goal about 1.56 s before the ball crosses the line | `MatchPlayer.tsx:190-192`, `442`; `timeline.ts:579-583` | Medium |
| B4 | Ball teleports on turnovers (13 to 19 per match) and at goal start and end (23 and 27 of 27); unassisted goals start at the centre spot | `timeline.ts:416-434`, `973-974`, `1070-1073` | High (believability) |
| B5 | At 2x, `SHOW` is not divided by speed, so the goal staging overlaps resumed play | `player.ts:136`; `Broadcast.tsx:81-85` | Medium |
| B6 | Quick view plus manager mode: about 61 ms phases, SFX spam, 2.6 s goal staging over about 53 minutes of play | `clock.ts:29-35`; `MatchPlayer.tsx:173-186`, `293` | High (default path for managers) |
| B7 | Momentum and possession bias use goals and saves later in the same window (future leak), and the bar is flat in 56 to 72% of windows | `timeline.ts:365-375`, `406`; `MatchPlayer.tsx:231-233` | Medium |
| B8 | Shootout keeper dives toward y=43 on goals, so the save direction is inverted relative to the visual, and the ball jump-cuts | `timeline.ts:848`, `877-881` | Low |
| B9 | Red-carded and subbed-off players vanish with no walk-off | `timeline.ts:225`, `1127` | Low |
| B10 | Facing and pose reset at every phase start (flicker every 0.69 s) | `timeline.ts:1138-1186` | Low (inferred) |
| B11 | Watch live and Go to the match do not unlock audio | `MatchList.tsx:124-131`; `MatchdayFlow.tsx:199` | Low |
| B12 | Skip silently auto-answers the injury stops in manager mode | `player.ts:176` | Low |
| B13 | Stale 360 px screenshots and GIF cited as updated evidence | `docs/reports/manager-mode/*-360.png`, `.gif` (git: `35b99cf`) | Process |

#### Performance hotspots (inferred, not profiled)

- Per frame: the `MatchPlayer` render with `timeline.beats.filter(revealed)`, `touchlineAt`, the
  HUD, `Touchline` (11 rows, 11 `PlayerImage`s, 2 selects) and the `Ticker` (all lines rebuilt and
  reversed) (`MatchPlayer.tsx:188-233`, `416-454`).
- Per frame: the `Broadcast` render, which rebuilds the static SVG pitch, 22 `PlayerImage` hook
  calls (`useImageSettings` and `resolvePack` each) and `left`/`top` style writes.
- None of the per-frame work above needs to happen per frame except the 24 position writes.

#### Accessibility

- Good:
  - The pitch is `aria-hidden` (`Broadcast.tsx:200`).
  - The ticker has a polite live region carrying the latest line (`MatchPlayer.tsx:442-444`).
  - The energy rows are keyboard operable (`Touchline.tsx:162-174`).
  - Meters have labels.
- Gaps:
  - Stop and injury prompts are `role="dialog"`, but focus is not moved to them. A screen-reader
    or keyboard user is not told the clock stopped, except through the ticker.
  - `aria-label="Match momentum"` sits on a plain `div` with no role (`MatchPlayer.tsx:278`), so
    it is not announced.
  - The score is not in a live region, so a goal is only announced through the ticker line (and
    early, see B3).
  - In quick view the live region updates several times a second (inferred announcement flood).
  - There are no keyboard shortcuts for pause or speed.

---

### 6. Prioritized improvements

Effort: S is under a day, M is 1 to 3 days, L is longer. All are UI-only (Yellow tier) unless they
are marked **Engine (Red)**, which needs goldens and an engine version bump.

#### P0: correctness and believability (fix before adding anything)

1. **One timeline, an RNG that does not depend on movesets.** Effort S.
   - In `moves.ts` `playCallout`/`shotCallout`, always consume exactly one `rng.next()` and
     index the move pool with it. Alternatively, draw callouts from a separate substream
     `broadcast:<seed>:<i>:callouts`.
   - Lift `useMovesets` into `MatchPlayer` and pass the built `timeline` to `Broadcast` as a prop,
     removing `Broadcast.tsx:116-120`.
   - Hold the clock at kickoff until the movesets resolve (or accept generic callouts for that
     match).
   - Guard test: the plays with and without `movesOf` are identical, asserting literal
     `side`/`fromSlot`/`toSlot` for a pinned seed.
2. **Continuous ball.** Effort M.
   - On a duel phase, make the new possessor's `fromSlot` the defender nearest to the previous
     ball point, chosen from `pts` at u=0. Animate the first 0.24 of the phase as a tackle or
     interception where the ball travels from the old carrier to the new one
     (`timeline.ts:416-434`, `1070-1073`).
   - For goals and saves, seed `fromSpot` from the ball position at fire time, not from the
     assist or `{50,50}` (`timeline.ts:973-974`).
   - Penalty goals start at the spot (`{86,50}` / `{14,50}`). Free kicks start at a fixed spot
     about 25% from goal.
   - After the staging ends, blend back over about 300 ms by storing the last staged ball point.
   - Guard test: max per-frame ball jump under 4% across a whole match (measured today: 79.7%).
3. **Score lands with the ball.** Effort S. Count a goal in the score, the ticker and the live
   region only once `now - fired[key] >= 0.6 * SHOW.goal`, or in reduced or quick mode at once.
   Use the same gate for `playGoalHorn` (`MatchPlayer.tsx:151-153`).
4. **Injury staging uses the injured player.** Effort S. In `stagePitch`, during an active injury
   beat, render `b.player.species` in that slot with `pose: "down"` and keep the replacement
   hidden until the sub beat walks them on. Add a guard test with the measured case
   (Roselia/Kommo-o).
5. **Quick view is not a broadcast.** Effort S.
   - In `quick`, render `Broadcast` with `motion=false`, or a goals-only mini pitch, and suppress
     the per-phase SFX (`MatchPlayer.tsx:173-186`).
   - Alternatively, make manager mode force the `live` pace, since a manager cannot manage a 5 s
     match.
   - This is a product call. I recommend the second option. The first is the safe fallback.
6. **Divide `SHOW` by speed** in `activeBeat` (`Broadcast.tsx:81-85`). Pass `speed` through. Effort
   S.
7. **Move the frame loop out of React.** Effort M.
   - Keep `play` in the reducer, but tick the clock at about 10 Hz for React (scoreboard, ticker,
     touchline).
   - Drive positions per frame through refs. `Broadcast` holds `useRef` arrays of 22 player
     elements and the ball, calls `stagePitch` inside its own rAF, and writes
     `style.transform = translate3d(x%, y%, 0)`. For example, wrap each player in a full-pitch
     layer and translate with `cqw`/`cqh`, or convert `%` to px from a `ResizeObserver`.
   - Memoise the static pitch SVG and the `PlayerImage`s, which only change when the XI changes.
   - Prove it with a 4x CPU-throttled trace (the same method as STATE's 27.7 ms decision
     measurement).
8. **Refresh the 360 px evidence and correct STATE.md's claim.** Effort S, Green.

#### P1: legibility and the feedback loop (where manager mode gets fun)

9. **Matchup scout note.** Effort S.
   - At kickoff and half time, show one line derived from `ENGINE_COEFFICIENTS.manager` for the
     opponent's `tacticalStyle`, for example "Possession sides struggle against Press."
   - This is generated from `coefficients.ts:178-183`, never written by hand, so it cannot drift
     from the engine.
   - Put it in `Touchline.tsx` beside `TACTIC_HINT`.
10. **"Your calls" post-match card.** Effort M.
    - At full time, replay this match with only the actions before it, letting the assistant
      coach this match, using `runCup(ctx.lineup, seed, mode, undefined, actionsWithoutThisMatch)`
      (the same call as `touchline.ts:266`).
    - Show "Assistant: 1-0. You: 4-0. Your Attack switch at 12'".
    - This is deterministic engine output, not fabricated, and it is the clearest feedback the
      game can give.
    - Show it only after full time, because it reveals counterfactual futures. Label knock-on
      effects on later matches.
    - About one `runCup` per match (about 28 ms per STATE).
11. **Honest momentum: an xG river.** Engine (Red), effort M.
    - Add `xg: {user, opp}` (the sum of trial `p`, `match.ts:779-782`) to `WindowSnapshot`, which
      needs goldens and a token or engine version.
    - Render a stacked area chart under the HUD (`MatchPlayer.tsx:271-291`) that fills in as each
      window completes, so it never shows the future.
    - The UI-only alternative uses `snapshot` tactic, energy and vacancies to compute a
      "pressure index", but that is weaker. Never use future goals (fixes B7).
12. **Touchline in a bottom sheet on phones.** Effort M.
    - Below 600 px, make `Touchline` a sticky bottom drawer: a collapsed bar with the tactic pills
      and "Subs 2 of 5", expanding to the sub picker and the energy list.
    - The pitch stays visible while you decide.
    - Put the stop prompt CTA in the sheet header.
    - Optionally pause automatically when the sheet opens. A decision while running uses
      `decisionMinute` already.
13. **Fatigue on the pitch.** Effort S.
    - Pass `energy` per slot into `StageInput` from the latest `windows` snapshot.
    - Below 65, slow that player's waypoint lerp (multiply `smoothU` by 0.85), add a small
      sweat-drop pip, and slow the `runStride` animation.
    - The energy rows and the pitch then tell the same story.
14. **Set-piece staging from `goalKind`.** Effort M.
    - Penalty: freeze the shape, put the taker on the spot, short pause, kick.
    - Free kick: a wall of 3 defenders at a fixed spot, then a curled trail (raise the quadratic
      control point).
    - Header: a cross trail, then the scorer at loft 0.85 meets it.
    - Solo: a dribble chain past the presser.
    - All of this data is already in `Beat.goalKind` (`timeline.ts:277`).
15. **Goal restart.** Effort S.
    - After a goal's staging, lerp both teams to kickoff shape over about 600 ms and place the
      ball on the centre spot with the conceding side in possession.
    - Needs a small change to the `plays` generator so the next phase starts from slot 9 or 10 of
      the conceding side.
16. **Shootout with suspense.** Effort S to M.
    - Use `now - kickAt` (already in `PlayState`) as progress: run-up, pause, strike, ball flight
      interpolated over about 400 ms.
    - The keeper dives to a seeded side, the correct side on a save.
    - Show a sudden-death banner and ticks for each team's kick.
17. **Announce stops accessibly.** Effort S.
    - Move focus to `stop-go` / the injury fieldset when a stop opens.
    - Make the scoreboard `role="status"` with the gated score from P0.3.
    - Throttle the live region to whole-event lines.
    - Add keyboard shortcuts: Space for pause, `2` for speed.
18. **Retire `MatchdayLive`.** Effort S. Fold its group standings into the `MatchReplay` header and
    remove the duplicate "Watch Matchday Broadcast" button (`ResultsView.tsx:145-160`).

#### P2: broadcast polish and drama

19. **Broadcast camera.** Effort M.
    - On phones, wrap the pitch layer in a container with
      `transform: scale(z) translate(-cx, -cy)`.
    - The camera centre follows the ball with critical-damped smoothing.
    - Zoom 1.6x in open play and 1.0x during a goal or save for context.
    - Everything is already in pitch percentages, so this is one transform on one element.
    - Add a "Full pitch / Follow" toggle and cap the pitch `max-height: 70svh` for landscape.
20. **Instant replay of goals.** Effort M.
    - The staging is a pure function of `(beat, progress)`, so a replay is
      `stagePitch(timeline, {clock: b.minute, active: {beat: b, progress: p}})` with `p` driven
      at 0.5x speed.
    - Add a letterbox and a "REPLAY" bug, auto-play after a user goal, and a "Replay" chip on each
      goal line in the ticker.
21. **Crowd bed and dynamic audio.** Effort M.
    - Use a Web Audio noise source through a band-pass filter. Its gain follows the ball's x
      toward the attacking goal, and the final third swells it.
    - Goals trigger a roar envelope. A late equaliser (minute 80 or later) gets a longer one.
    - Keep everything synthesized in `sound.ts`, with no assets.
    - Rate-limit `playKickPass` to one in three phases.
22. **Commentary lines.** Effort S to M.
    - Template commentary from facts that already exist, such as "Late drama at 87'!",
      "{scorer}'s second of the match" (counted from beats) and "Against the run of play" (from
      xG after #11).
    - Lines must cite real fields. No flavor text, no em dashes, per CLAUDE.md.
23. **Shouts from the touchline.** Effort L. Engine (Red), only if it is meant to affect the
    result.
    - A cosmetic shout ("Push up!", "Keep it tight!") is UI only. It is a short line nudge
      animation on the waypoint `line`.
    - A shout with an effect is a new `ManagerAction` type, which needs a token version and
      goldens. Not recommended until #10 shows players understand the current levers.
24. **Heatmap and pass network at full time.** Effort S to M.
    - Accumulate the `stagePitch` player points at 1 Hz into an 8x5 grid per side and render a
      heatmap tab under the footer.
    - Caveat: this choreography is cosmetic, not engine output. Label it "broadcast heatmap" so it
      does not read as a stat. Of the full-time extras, this one is the most likely to look like
      fabricated data, so it is optional.
25. **Separation pass.** Effort S. After the waypoints, run one iteration of pairwise push-apart
    for same-side players within 4% (deterministic and cheap). This reduces the overlap measured
    in section 2.
26. **Velocity-based poses and Catmull-Rom paths.** Effort S.
    - Interpolate through waypoints i-1, i and i+1 with a Catmull-Rom spline, so players do not
      stop at each phase boundary.
    - Derive pose and facing from finite-difference velocity at `clock ± ε` rather than from
      displacement since the phase start (fixes B10).
27. **Stoppage time.** Effort S, UI only. Show "+2" on the clock at 45' and 90'. Cosmetic, with
    no engine effect. Guess: this is low value unless the engine ever models it, so it should be
    skipped if it would mislead.

#### Suggested sequencing

1. P0.1, then P0.4, then P0.3, then P0.6. These are small, test-pinned and stop wrong information
   reaching the screen.
2. P0.2 and P0.5.
3. P0.7, the performance rewrite, measured before and after.
4. P1.9, P1.10 and P1.12. These are the manager-mode payoff.
5. The rest.

Each step can be its own PR under the Yellow tier, except P1.11 (Red).

---

### NOT RUN

- Browser rendering, frame timing, React profiler and layout cost. The user rule allowed only
  headless browsers, and I chose static reading.
- Physical phone, landscape and 120 Hz behaviour.
- Listening to the audio. The SFX conclusions come from code only.
- The unit, e2e, lint and typecheck gates. I changed no code.
- Measurements on squads other than the golden cup8 draft.


# Appendix B. Pre-match frontend

## Pre-match frontend audit (landing to "See results")

Read-only audit of `main` at `40f3c92`. Scope: `src/app` pages, `src/components/{home,run,builder,wheel,pitch,scouting,squad,daily,ui}`, `src/design`, `src/ui` (minus matchday and manager), the mobile and draft-flow e2e specs, and the two prior audit reports.

**Evidence labels.** *Read* means traced in source with a `file:line` cite. *Measured* means I ran something (one headless Chromium and WebKit repro, chunk sizes from an existing local `.next`). *Guess* means an inference I did not run. No dev server, no app browser session, no test suite was run for this audit.

**NOT RUN.** The app in any browser, `pnpm test`, `pnpm build`, Playwright suites, Lighthouse, axe, the theme contrast and CVD scripts. Every UI claim below is from code unless marked Measured.

---

### 0. Headline findings

1. **"New run" mid-draft wipes the run with one tap and no confirm.** `DraftBoard.tsx:608-615` calls `onNewRun`, which runs `forgetRun` (`LiveRun.tsx:166-178`). It sits in the draft footer next to the ratings legend on every round. *Read.*
2. **Keys 1, 2 and 3 sign a candidate even while the Scouting dossier modal is open.** The draft's `keydown` listener is on `window` (`DraftBoard.tsx:365-393`) and only skips `input`, `textarea` and `select`. The dossier stops only Escape (`ScoutingDossier.tsx:156`). Pressing "2" while reading a dossier would sign card 2 behind the modal. *Read; not reproduced.*
3. **The desktop Home side panel's `position: sticky` does not stick in Chromium.** `globals.css:21-27` sets `overflow-x: hidden` on both `html` and `body`, which makes `body` a scroll container. *Measured* with a minimal repro in headless Chromium: the sticky box ended at `top: -984` after a 1000 px scroll with `hidden`, and at `top: 16` with `clip` or `visible`. Prior audit SA-37 predicted this; it is still open. The fix is one word (`overflow-x: clip`).
4. **Three confirmation layers before the first roll.** Play 8-0 Challenge (`SidePanel.tsx:149-155`), then the "Settings confirmed?" modal (`ConfirmPlay.tsx:54-80`), then the `/play` start card that repeats the settings summary and the matchday settings (`PlayScreen.tsx:196-229`), then Start run. That is 3 taps and 2 reads of the same settings.
5. **The challenge draft never shows a live Team Score, even with ratings on.** The draft hub shows only `Draft n/16 · x% Chem` (`DraftBoard.tsx:474-480`). `ratePartialLineup` is already computed on every render (`DraftBoard.tsx:434`), so a projected score is a display change. Pick-time feedback is the weakest part of the loop.
6. **No em dashes or en dashes in any in-scope file.** I scanned every `.ts`, `.tsx` and `.css` file under `src/app`, `src/components`, `src/ui` and `src/design`, excluding tests, matchday and manager. Zero hits. *Measured.* The guard is still page-local (`src/app/how-to-play/__tests__/page.test.tsx:8-9`, `ResultsView.test.tsx:23-24`), not repo-wide (SB-19 partly open).

---

### 1. User journey map and friction

| Step | Screen | What happens | Friction |
|---|---|---|---|
| 0 | Gate (`/gate`) | Passcode form (`gate/page.tsx:36-64`). | Fine. Clear errors (`gate/page.tsx:30-34`). |
| 1 | Home `/` | `HomeScreen` renders `SidePanel` plus `Builder` (`HomeScreen.tsx:186-217`). The page h1 is "Build your XI", the Friendly builder (`Builder.tsx:234-241`). | **Hierarchy.** The ranked challenges (the actual game) live in a side panel titled "Trainer Dugout / Play" (`SidePanel.tsx:139-180`). The h1 belongs to the friendly mode. No one-line pitch of the game anywhere on `/` (SB-18 still open). Four primary buttons compete: Play 8-0, Play 151 (`SidePanel.tsx:149-162`), Randomize (`Builder.tsx:297-304`), Play a friendly cup (`Builder.tsx:362-369`). |
| 1m | Home on a phone | Below 1024 px the panel becomes `display: contents !important` (`SidePanel.module.css:5-7`) and grid rows reorder: hub (row 1), Play card (row 2), settings (row 3), builder (row 4) (`HomeScreen.module.css:1-5`, `SidePanel.module.css:8-16`). Settings start **open** (`SidePanel.tsx:99`). | The builder (the h1) lands below formation, 9 generation chips, 2 segmented controls, 5 switches, matchday settings and a records table. Two buttons toggle the same region: "Challenge Hub" (`SidePanel.tsx:125-133`) and "Settings and records" (`SidePanel.tsx:170-178`). |
| 1h | Home hub line | `"{style} · Draft: n/16 · x% Chem"` (`SidePanel.tsx:134-137`). | Mixes the challenge draft style with the builder's fill count. A first-time player reads "Draft: 0/16" as a challenge in progress. |
| 2 | Confirm modal | "Settings confirmed?" plus a summary, "No, edit settings" or "Yes, play" (`ConfirmPlay.tsx:54-80`). | An extra modal on every play. "No" scrolls to the formation select (`SidePanel.tsx:103-114`). Copy reads as a quiz question. |
| 3 | `/play` start card | Eyebrow, title, description, settings summary again, `MatchdaySettings`, Start run, road strip (`PlayScreen.tsx:196-229`). | Third read of the same settings. The Start button is below two settings blocks on phones (*guess* at 320 to 390 px; the e2e "play start" scene measures targets, not fold position). |
| 4 | Draft, Squad First | Wheel spins region then type (`Wheel.tsx:30-34`: 1.7 s and 2.1 s, plus 320 ms and 260 ms pauses in `RollReveal.tsx:22-23`). Candidates render. Tap a card, then a slot (`DraftBoard.tsx:267-279`, `395-430`). | About 4.4 s of spin per round, so about 70 s across 16 rounds before rerolls (*arithmetic from constants*). "Tap to skip" exists (`Wheel.tsx:136-145`), but there is no persistent "fast spins" preference. On phones the drawer covers the pitch until a card is tapped (`DraftBoard.module.css:342-373`). |
| 4p | Draft, Position First | Tap a slot first, then the wheel rolls (`DraftBoard.tsx:413-417`, `523-525`). | Fine. The help line is clear. |
| 5 | Each pick | Live region announces "Signed X at ST. Round n of 16." (`DraftBoard.tsx:74-98`). The chemistry lines update. | No visible delta. Nothing tells the player that the pick moved the squad up or down. Chemistry % sits in a small hub line (`DraftBoard.tsx:474-480`). |
| 6 | Reroll | `Reroll type n/3`, `Reroll region n/3` (`DraftBoard.tsx:558-582`). | No preview of what the reroll risks. The 151 label is just "Reroll". |
| 7 | Draft complete | "Tap or drag two players to swap them before kick-off." plus **See results** (`DraftBoard.tsx:588-600`). | Good. But "See results" may lead to the matchday flow, not results (`LiveRun.tsx:117-125`), so the label over-promises when manager mode or live view is on. |
| x | Anywhere in draft | **New run** ghost button (`DraftBoard.tsx:608-615`). | One tap discards the draft (finding 0.1). |

**Tap count, home to round 1 roll (Squad First):** 3 taps and 2 duplicated settings reads. With a one-tap path ("Play" then straight into the draft, settings editable on the start card), it would be 1 or 2.

---

### 2. UI and UX issues

#### 2.1 Hierarchy

- Home h1 is the builder (`Builder.tsx:234-241`, `headingLevel={1}`). In DOM order the side panel's h2s ("Setup", "Rules", "Matchday", "Your records" at `SidePanel.tsx:189,234,268,284`) come **before** the h1 (SC-18 still open).
- The draft page title row (`DraftBoard.tsx:483-489`) is hidden on phones unless the hub is open (`DraftBoard.module.css:416-418`), so the mode name only shows in the hub button "Challenge Hub · 8-0 Challenge" (`DraftBoard.tsx:470`). On desktop the hub button is hidden and a CSS `::before` prints "Trainer Dugout" (`DraftBoard.module.css:231-237`). Pseudo-content is not reliably read by screen readers and is untranslatable copy hidden in CSS.
- The bench, legend and "New run" share one footer row (`DraftBoard.tsx:602-616`). The destructive action sits beside an informational legend.

#### 2.2 Copy

- **No em or en dashes found** (section 0.6).
- **Enum values leak into copy.** The Picker swap line prints `getSlotSuitability(...)` raw: "Pikachu to ST: recommended fit. Onix to CB: bad fit." (`Picker.tsx:417-420`). The empty-slot accessible name does the same: "Empty ST slot (recommended fit)" (`Pitch.tsx:109-112`), while the visible prompt says "★ Best", "OK Fit", "Poor Fit" (`PitchCard.tsx:53-59`). Use one vocabulary: Best, OK, Poor.
- **Duplicated word.** The road strip tooltip row is `{ key: "Rating", value: "Rating 61" }` (`RoadStrip.tsx:84`), so it renders "Rating / Rating 61".
- **Case drift.** Title Case in "Tap to Draft!", "Poor Fit", "OK Fit" (`PitchCard.tsx:53-59`), "Sort: Role Rating", "Sort: Raw Fit" (`Picker.tsx:331-337`), "Challenge Hub", "Trainer Dugout". Sentence case elsewhere ("Play a friendly cup", "Clear all").
- **Jargon.** "Minimize draft picker" and "View spinner" (`DraftBoard.tsx:535`); "Spin results" with aria-label "Back to spin results" (`DraftBoard.tsx:655-665`); "Casual sighted mode" (`SidePanel.tsx:255`); "Settings confirmed?" (`ConfirmPlay.tsx:56`).
- **Terminology.** "Chemistry", "Chem", "links", "Synergy" (the engine field) all show up. SB-15 (36 inconsistent terms) is still open in spirit.
- **"Reset" is broader than it looks.** It resets and saves every panel setting, including challenge settings, then clears slots (`HomeScreen.tsx:208-214`, `Builder.tsx:318-328`). There is no confirm and no undo, and it sits next to "Clear all" (SB-14 still open).

#### 2.3 Empty, loading and error states

- Good: Picker "No matches" explains when settings hide players (`Picker.tsx:379-411`). Start-run load failure has a retry message (`PlayScreen.tsx:222-226`). Builder load failure says "Check your connection" (`Builder.tsx:169`). Invalid `/play` link has a recovery card (`PlayScreen.tsx:53-71`).
- Missing: no `error.tsx`, `global-error.tsx` or `loading.tsx` anywhere under `src/app` (directory listing). A render crash in the draft shows the unthemed Next error page (SB-24 and SC-28 still open).
- `/daily` is client-only after hydration. The server sends "Loading the daily challenge" (`daily/page.tsx:10`, `DailyScreen.tsx:61-63`), so SD-09 is still open, unlike `/play`, which was fixed with `connection()` (`play/page.tsx:14-17`).
- "Loading the players" status is set but there is no spinner or skeleton on the pitch (`Builder.tsx:163`). *Guess:* on a cold, slow connection the first slot tap looks dead for the length of the species-chunk download (178 KB gzip, section 6).

#### 2.4 Onboarding and How to play

- How to play covers builder, both challenges, cup, Team Score, fair rolls and friendlies (`how-to-play/page.tsx:10-69`). It has **no section on Daily, Manager mode, Live match or the leaderboard**, even though Manager mode and Match view are on the Home panel (`SidePanel.tsx:267-281`). SB-08 is still open.
- There is no first-run hint in the draft itself. The only teaching copy is the candidate kicker "Tap a player, then an open slot" (`DraftBoard.tsx:742-745`) and the swap hint after draft complete.
- Keyboard shortcuts 1, 2 and 3 exist (`DraftBoard.tsx:383-389`) but are never shown on screen.

#### 2.5 Feedback on draft choices

- Strong pieces already exist. Suitability glow on empty slots for the selected or dragged candidate (`DraftBoard.tsx:680-684`, `Pitch.module.css:172-192`). Dashed preview chemistry lines (`DraftBoard.tsx:443-446`, `Pitch3DStage.tsx:71-86`). Chemistry list with reason filters (`SquadFeedback.tsx:68-122`), which also closes prior SC-26 (links were aria-hidden only).
- Gaps:
  - No Team Score delta, and no projected score during a challenge draft (finding 0.5).
  - The legendary cap (3) only appears in the hub as "Legendaries: n/3" when at least one is signed (`DraftBoard.tsx:479`). Nothing warns before the third.
  - **Blind mode is not fully blind.** With "Show ratings (challenges)" off, the Best/OK/Poor suitability legend and glow still render (`DraftBoard.tsx:633-646`, `680-684`, neither gated by `showRatings`). That may be intended (position hints versus numbers), but the setting hint "Off keeps challenges blind" (`SidePanel.tsx:262`) over-promises. A product call; flag, do not assume.
  - The weak-spot ring and the selected, highlight and drop rings share one colour and outline (`Pitch.module.css:166-171` versus `193-197`), so "weak" and "selected" look the same.

#### 2.6 Explainability of Team Score

- Builder: score appears only at 16/16, else "Fill all 16 to see your Team Score" (`Builder.tsx:242-256`). Line strength per line shows when ratings are on (`SquadFeedback.tsx:54-67`).
- Challenge draft: no score at all until results.
- How to play explains the inputs in prose (`how-to-play/page.tsx:46-54`) but never says the scale (SB-08 noted the 0 to 1000 scale is never stated).
- There is no "why this score" breakdown before results. Results breakdown is outside this scope.

---

### 3. Mobile friendliness

The repo has strong phone coverage: `e2e/mobile-targets.spec.ts` walks 31 scenes at 320, 360, 390 and 430 px and fails on any control under 44x44 or text under 11 px (`mobile-targets.spec.ts:1-4, 33-37, 101-133`). `mobile-acceptance.spec.ts` covers full flows with real touch, overflow, picker, drag, keyboard and landscape (`:845-1410`). `mobile-draft.spec.ts` and `draft-flow.spec.ts` cover drawer, swap hint, landscape cards and 44 px pitch targets in all formations. So I do not re-claim target sizes the suite measures. Gaps follow.

#### 3.1 Breakpoints

There is no shared breakpoint scale. Media and container queries in scope use 479, 480, 500 (height), 520, 540 (container), 599 and 600, 719 and 720, 768, 800 (media and container), 959 and 960, and 1023 and 1024 (grep of `@media` and `@container`). Home switches layout at 1024 (`HomeScreen.module.css:13`), the draft at 960 (`DraftBoard.module.css:225`), and the start card at 800 (`PlayScreen.module.css:17`). Between 960 and 1023 px the draft is two-column but Home is one column. *Guess:* that is the iPad portrait range where the jump feels inconsistent.

#### 3.2 Touch targets

- Global floor is 44 px for `.btn`, `.btn--sm`, `.chip` (`globals.css:113-118, 169-180, 461-467`), segments and switches (`SidePanel.module.css:150-187`), and inputs (`globals.css:578-581`).
- Picker search and gen select declare `min-height: 40px` (`Picker.module.css:76-84`). The global rule `:is(input, select, textarea):not(...)` (`globals.css:578`) has the same specificity, so which wins depends on stylesheet order. The targets suite includes a "picker open" scene (`e2e/mobile/scenes.ts:312`), so it is probably 44 in practice (*guess*). Delete the dead 40 px rule either way.
- Image settings select `min-height: 36px` on desktop (`globals.css:437`). Phones get 44 (`globals.css:532-534`).
- Pitch tokens under 44x44 only produce an annotation, not a failure (`mobile-targets.spec.ts:114-124`).

#### 3.3 Safe areas

- `viewportFit: "cover"` (`layout.tsx:24-31`, which closes SA-16). Body pads left and right insets (`globals.css:41`). Footer, Picker, drawer and Sheet pad bottom insets (`globals.css:265`, `Picker.module.css:8`, `DraftBoard.module.css:372, 420`, `primitives.css:354-357`).
- Not padded: the fixed draft error toast at `top: 8px` (`DraftBoard.module.css:436-443`), with no `safe-area-inset-top`. *Guess:* in landscape on notched iPhones, or in a future standalone PWA, it would sit under the notch or status bar. The site header does not pad the top inset either (`globals.css:283-291`). That is fine in Safari's browser chrome but matters if a PWA ships.

#### 3.4 Viewport units

- `dvh` and `svh` are used correctly: body `min-height: 100dvh` (`globals.css:40`), `/play` `100svh` (`play/page.module.css:2`), Picker `calc(100dvh - 56px)` (`Picker.module.css:5`), drawer `calc(100dvh - 225px)` (`DraftBoard.module.css:364`), dialogs (`ConfirmPlay.module.css:4`, `ScoutingDossier.module.css:4`).
- `100vw` with `max-width: 100vw` on html and body (`globals.css:25`) includes the scrollbar on desktop. It is masked by `overflow-x: hidden`.
- The drawer's magic `225px` and the scroll padding `156px` (`DraftBoard.module.css:364, 428`) encode header plus hub height by hand. The comment at `globals.css:470-472` says the draft sizes its pitch from `--site-header-h`, but no file in scope reads that variable except `play/page.module.css:2`.

#### 3.5 Horizontal overflow

- `overflow-x: hidden` on html and body (`globals.css:21-27`) hides overflow instead of preventing it, and breaks sticky (finding 0.3, *Measured* in Chromium). The acceptance suite checks `documentScrollWidth` even when html and body clip (`mobile-acceptance.spec.ts:306`), which is good. Switch to `overflow-x: clip` (Chromium 90+, Safari 16+) or remove it.

#### 3.6 Sticky and fixed elements

- Home aside sticky is broken (finding 0.3).
- Mobile draft drawer is `position: fixed` at the bottom with a non-interactive backdrop (`DraftBoard.module.css:349-373`). The backdrop is `pointer-events: none`, so taps go through to the pitch. That is intended for drag-to-slot, but it is a "modal look" without modal behaviour. *Guess:* a tap on the dimmed pitch selects a slot the player cannot see well.
- The RoadStrip tooltip panel is fixed at `bottom: 80px` (`RoadStrip.module.css:128-135`). It can overlap the fixed drawer on phones (*guess*).
- No `overscroll-behavior` on html or body (grep), so pull-to-refresh can fire mid-draft (SA-41 still open). Drag gestures are `touch-action: none` on tokens (`Pitch.module.css:107`), which limits it to non-token areas.

#### 3.7 Keyboard (soft keyboard)

- Picker defers focus on touch so the keyboard does not cover the list (`Picker.tsx:93-96`). Search has `inputMode="search"` and `enterKeyHint` (`Picker.tsx:262-271`), which closes SA-14 for search.
- Search does not normalize accents or punctuation (`Picker.tsx:137-139`), so "flabebe", "farfetchd" and "mr mime" miss (SC-37 still open).

#### 3.8 Landscape

- Covered by explicit rules: drawer only when `min-height: 500px` (`DraftBoard.module.css:342`), full-screen Picker at `max-height: 500px` (`Picker.module.css:415-420`), compact wheel (`RollReveal.module.css:52`, `Wheel.module.css:151`), plus e2e "7 landscape" scenes.
- Pitch height is fixed at `580px` (`520px` in the draft) in narrow containers (`Pitch.module.css:366-373`). On a 375x667 iPhone SE with a 57 px header, the 520 px field plus bench and selection bar cannot fit one viewport (*arithmetic*). The draft scrolls the wheel into view each roll (`DraftBoard.tsx:166-175`) to compensate.

---

### 4. Design system consistency

- **Two token layers plus a third palette.** `tokens.css` defines a light-first system (`--canvas`, `--surface`, `--text-*`), then a legacy alias layer (`--ink`, `--flood`, `--night`, `--grass-*`, `--chalk`: `tokens.css:118-171`). `stadium.css` adds a dark-only `--stadium-*` palette that does **not** change in light mode except `--stadium-shell` and `--stadium-glass` (`stadium.css:1-44`). Components mix all three. `.kicker` uses `--ink-soft` (`globals.css:110`), `.btn--primary` uses `--flood` (`globals.css:153-157`), and the draft uses `--stadium-*`.
- **Light theme is half dark.** Pitch, tokens, candidate cards, brand chip and drawer stay navy (`--stadium-card: #0f172a`) on a cream page (`--canvas: #E7EAE2`). `--stadium-border` is the same blue in both themes (`stadium.css:4`). The contrast scripts presumably pass (they exist in `package.json`; NOT RUN here), but the look is two products stitched together.
- **Dark palette is duplicated twice.** It appears once under `[data-theme="dark"]` and once under the media query, for both the base and the game blocks (`tokens.css:56-116, 213-279`). That is 4 copies of the same values to keep in sync. `--border-control` is set at `tokens.css:13` and silently overridden at `tokens.css:119`.
- **Raw colours escape the lint.** `scripts/audit/theme-color-lint.mjs` flags only hex (`/#[\da-f]{3,8}\b/`), so 33 `rgb()` and `rgba()` literals in scope pass it. RoadStrip has 14 (`RoadStrip.module.css:47-62, 111-120`), Pitch 8, SidePanel 6 (`:26, 92, 102` gold and mint glows), DraftBoard 3 (`:327, 353, 371`) and globals 2.
- **Spacing and type are raw px everywhere.** There are no spacing tokens beyond `--gutter: 16px` (`tokens.css:166`). Font sizes are hard-coded. 20 declarations of `font-size: 11px`: DraftBoard 9, Pitch 9, RoadStrip 1, primitives 1. Body type is pinned to 15 px or 14 px (`globals.css:47, 584`), so SC-29 and SA-36 are still open.
- **Duplicated components and logic.**
  - `whenIdleAfterLoad` is copy-pasted (`HomeScreen.tsx:31-42`, `PlayScreen.tsx:28-39`).
  - Two hand-rolled drag systems: candidate drag (`DraftBoard.tsx:281-363`, window listeners with duplicated `overDrawer` maths at `:300-306` and `:331-337`) and token drag (`Pitch.tsx:157-198`, pointer capture).
  - Two "hub" blocks with the same markup and styles (`SidePanel.tsx:124-138` plus `.module.css:39-48`; `DraftBoard.tsx:462-481` plus `.module.css:23-34`).
  - Candidate card fit markup duplicates the Picker row fit (`DraftBoard.tsx:776-793` versus `Picker.tsx:446-463`).
  - The ratings legend string appears twice (`Builder.tsx:290`, `DraftBoard.tsx:605`).
- **Dead CSS.** `.title` and `.lede` in `PlayScreen.module.css:33-51` are unused (no `s.title` or `s.lede` reference). `.hero` is declared twice with conflicting `display` (`PlayScreen.module.css:26-31, 75-77`). The narrow nav override at `globals.css:319-330` is declared before the base rule at `:338-347` and loses (SA-39 still open). `globals.css:589-604` re-declares nav link styles a third time.

---

### 5. Accessibility

Good foundations: the polite Announcer for every draft action (`DraftBoard.tsx:183-199`), focus-to-heading on screen swaps (`LiveRun.tsx:99-101`, `PlayScreen.tsx:103-107`), focus back to the slot after the Picker closes (`Builder.tsx:99-108`), native `<dialog>` with `showModal` for Confirm, Picker and Dossier, `aria-pressed` on cards and tokens, raw fit as `aria-describedby` outside the button name (`DraftBoard.tsx:788-793`), and a global reduced-motion reset (`globals.css:362-370`).

Issues:

- **Shortcut keys fire behind modals** (finding 0.2).
- **No skip link and no `aria-current` in the nav** (grep: none). The nav renders 5 links plus Image settings plus Theme before content (`layout.tsx:40-54`). SC-17 and SB-28 are still open.
- **`role="toolbar"` without arrow-key handling** (`Builder.tsx:296`). SB-27 and SC-15 are still open. Drop the role or implement roving tabindex.
- **Names read twice.** Candidate card `PlayerImage alt={sp.name}` plus visible name inside the same button (`DraftBoard.tsx:766-768`). The Picker row has the same pattern (`Picker.tsx:433-435`). SC-20 is still open. Use `alt=""` when the name is adjacent.
- **Pitch token names are long and redundant.** An empty token's name concatenates its own `aria-label`, role, slot label and prompt, for example "Empty CB slot CB CB Tap to Draft!" (`Pitch.tsx:109-139`, *read; exact string inferred*).
- **`display: contents !important` on an `<aside aria-label>`** (`SidePanel.module.css:5-7`). *Guess:* older WebKit drops the landmark from the accessibility tree under `display: contents`. Verify in VoiceOver.
- **Last-generation chip does nothing and says nothing** (`SidePanel.tsx:116-120`). SC-31 is still open.
- **Generic CSS-only text.** "Trainer Dugout" via `::before` (`DraftBoard.module.css:234-237`).
- **Colour-only state.** Suitability glow uses green, amber and red (`stadium.css:28-33`). The text prompt carries the meaning on empty tokens (`PitchCard.tsx:53-59`), but the suitability colour on the prompt applies only in the narrow container (`Pitch.module.css:411-422`). The weak and selected rings are identical (section 2.5).
- **Reduced motion.** Wheel uses `instant` under reduced motion (`DraftBoard.tsx:126, 542`), randomize cascade skips (`Builder.tsx:186`), and the dialog rise is off (`ConfirmPlay.module.css:31-35`). No in-scope infinite animations (grep). SC-34 pulses live in `results/MatchHighlights.module.css`, out of scope.
- **Focus ring on the draft h1 is removed** (`DraftBoard.module.css:60-62`, `outline: none` on `.round:focus`). It is programmatic focus only, so this is acceptable. It is noted because it is pinned by a test (`mobile-draft.spec.ts:217`).

---

### 6. Performance

- **Code splitting is already deliberate.** The builder engine loads on intent, either hover, focus, tap or `?b=` (`HomeScreen.tsx:26-28, 81-110`), plus an idle prefetch (`:143`). The draft engine loads at Start with preload on pointer enter (`PlayScreen.tsx:24-26, 114-118`). `/play` server-renders the start card (`play/page.tsx:11-17`).
- **Chunk sizes (Measured, from an existing local `.next` built at 02:18 on Oct 17, before HEAD's 02:50 commit, so likely the #70 branch; not rebuilt).** The largest client chunk is 836,925 B raw and 178,040 B gzip. It contains species data (`"Bulbasaur"`, `bestRoles`). The next is 484,563 B raw and 61,100 B gzip (species names plus Picker). The react-dom chunk is 72,089 B gzip. The Zod chunk is 111,520 B raw and 31,483 B gzip. Total `.next/static/chunks` is 2.8 MB raw. *Guess:* the 178 KB gzip data chunk is the first-tap latency on the builder and Start for cold phones. Splitting scouting attributes (needed for ratings and dossier) from the name, type and gen index (needed to draw and filter) would cut the critical path. That is a Red-tier data change.
- **Zod on the client** for one `localStorage` parse in `DailyScreen.tsx:15-19` (SD-07 still open). A hand-written guard is 10 lines.
- **Images.** `PlayerImage` is the single seam (`PlayerImage.tsx:21-39`), a plain `<img>` with `width`, `decoding="async"` and `loading` lazy or eager (`PlayerPicture.tsx:88-94`). `public/creatures` is 17 MB. The wheel loads faces eagerly (`Wheel.tsx:55`) and animates a CSS `filter: blur()` every frame (`Wheel.tsx:110`). SA-24 is still open: blur on a moving element forces repaint per frame on low-end phones (*guess*, unmeasured).
- **Pitch rendering.** 3D transforms with `preserve-3d` (`Pitch.module.css:14-28`), SVG `filter: drop-shadow` on the line layer (`:38`), and per-token glows. Every drag move calls `setDrag`, which re-renders the whole Pitch (`Pitch.tsx:171-181`). The candidate drag re-renders the whole DraftBoard on every pointermove (`DraftBoard.tsx:298`). *Guess:* that is jank risk on mid-range Android during drag. A ref-plus-transform approach avoids React renders per frame.
- **Per-render work.** `HomeScreen` calls `fullLineup()` twice and `rateTeam` on every render (`HomeScreen.tsx:193-199`). `Builder` calls `rateTeam` again (`Builder.tsx:138-143`). `DraftBoard` calls `rateTeam(full)` unmemoized (`DraftBoard.tsx:432-433`) and `ratePartialLines` inline in JSX (`:692`). Cheap today (*guess*), but it is duplicated work.
- **Fonts.** Self-hosted Inter subsets plus a metric-matched fallback (`globals.css:5-13`, `src/design/fonts/inter.ts`). No issue found.
- **Hydration.** Theme is applied pre-paint by `THEME_BOOT_SCRIPT` (`layout.tsx:37`), which closes SA-18, SC-38 and SD-12. Home reads settings after hydration (`HomeScreen.tsx:130-141`), so the side panel renders defaults first. A shift is possible if saved settings differ (*guess*; e2e has CLS specs for other pages only).
- **Client components.** `PitchCard`, `Pitch3DStage` and `RoadStrip` have no `"use client"` but are imported by client trees, so they ship to the client anyway. That is fine. `how-to-play` is a server component (good).

---

### 7. Prioritized improvements

Effort: S is under half a day, M is 1 to 2 days, L is more. Tier follows CLAUDE.md risk tiers.

#### P0

1. **Confirm or undo for "New run" mid-draft.** S, Yellow. In `DraftBoard.tsx:608-615`, when `filledCount(state.lineup) > 0 && phase.kind !== "complete"`, open a small `<dialog>` ("Abandon this draft? Round 9 of 16 will be lost.") or show a 5 s "Draft discarded. Undo" toast. `forgetRun` would run only after the toast expires (`LiveRun.tsx:166-178`). Add a test that a single tap keeps `round-header` text unchanged.
2. **Gate shortcut keys behind open modals.** S, Yellow. In `DraftBoard.tsx:380-382`, bail when `document.querySelector("dialog[open]")` exists or when `inspectId !== null`. Write a RED test first: open the dossier, press "2", expect no `Signed` announcement.
3. **Fix sticky by replacing `overflow-x: hidden` with `clip`.** S, Yellow. `globals.css:21-27`. The repro is in section 0.3. Re-run `mobile-acceptance` overflow scenes, since the suite already checks clipping.

#### P1

4. **One-tap play.** M, Yellow. Remove `ConfirmPlay` (`SidePanel.tsx:328-335`) and route straight to `/play`. The start card already shows `SettingsSummary` (`PlayScreen.tsx:207`). Add an inline "Edit" link there back to `/#settings`. Saves 1 tap and 1 modal per run.
5. **Home hierarchy rewrite.** M, Yellow.
   - Make the h1 a one-line game pitch with two big challenge cards (8-0, 151) plus a "Daily" card with today's date (DailyScreen already computes it).
   - Demote the builder to an h2 section "Friendly builder" with one primary button.
   - Default `open` to false below 1024 px (`SidePanel.tsx:99`) and remove the duplicate "Challenge Hub" toggle (`:125-133`).
6. **Live projected Team Score in the draft (ratings on).** M, Red-adjacent (display only, but it reads engine rating). Show `ratePartialLineup(lineup)` as a scorebug in the hub (`DraftBoard.tsx:474-480`). On candidate select, show the delta: compute `ratePartialLineup` on `applyAction(... pick ...)` for the selected or dragged species and render "+4" or "-2" next to the selection bar name (`DraftBoard.tsx:625-631`). With ratings off, keep it hidden for honest blind play. This is the single biggest "draft tension" win, because every choice gets a number.
7. **Fast-spin preference.** S, Yellow. Add a `spinSpeed: "normal" | "fast"` to `PanelSettings` (`src/ui/settings.ts:25-37`) and scale `DURATION_MS` (`Wheel.tsx:30-34`) and the pauses (`RollReveal.tsx:22-23`). Fast is about 40 percent of normal. It cuts about 40 s from a run and keeps the reveal.
8. **Copy pass.** S, Yellow.
   - Map the suitability enum to Best, OK and Poor in `Picker.tsx:419` and `Pitch.tsx:111`.
   - Fix "Rating / Rating 61" (`RoadStrip.tsx:84`, value `String(opponent.score)`).
   - Use sentence case in `PitchCard.tsx:53-59` and `Picker.tsx:328-337`.
   - Rename "Minimize draft picker" and "View spinner" to "Hide players" and "Show roll".
   - Rename "See results" to "Kick off" when `playsMatchday(panel)` (`DraftBoard.tsx:597`, needs a prop).
   - Add a repo-wide dash lint, a 15-line extension of `scripts/audit/theme-color-lint.mjs` scanning string literals for U+2013 and U+2014.
9. **Extend the colour lint to `rgb()` and `rgba()`** and tokenise the 33 literals into `stadium.css` (`--road-group`, `--road-knockout`, `--road-final`, `--cta-glow`). S, Yellow.
10. **Skip link, `aria-current`, and drop the fake `role="toolbar"`.** S, Yellow. `layout.tsx:40` and `Builder.tsx:296`. Use `alt=""` on images beside visible names (`DraftBoard.tsx:766`, `Picker.tsx:433`).
11. **How to play: add Daily, Manager mode and Live match sections**, plus one sentence on the Team Score scale. S, Green (copy only, `how-to-play/page.tsx:10-69`). Also add a "first draft" coach mark: a one-time dismissible tip over the candidate drawer ("Tap a player, then a glowing slot. Keys 1 to 3 work too."), stored in `localStorage` with try/catch through `src/ui/storage.ts`.
12. **`error.tsx` and `global-error.tsx`** under `src/app` using `ModuleCard` and `StatusNote`, with a "Your run is saved; reload to continue" line, since `savedRun` checkpoints exist. S, Yellow.

#### P2 (creative)

13. **Chemistry-line legend and tap-to-explain.** M. Tap a line on the pitch to show "Pikachu + Raichu: same evolution line, shared type". The data is already on the element (`Pitch3DStage.tsx:56-60` `data-chemistry-reasons`). Make lines hit-testable with a thicker transparent stroke, plus a popover reusing `Tooltip`. It also gives SC-26 a visual twin.
14. **Synergy preview on candidate cards.** M. Under each card, show "+2 links" computed with `previewCandidateEdges` against the best empty slot (`src/ui/partial-rating.ts`). Pure display, and it makes Open mode decisions less random.
15. **Reroll tension.** S to M. Before spending a reroll, show "Type has 7 other options in Johto" (count from the eligible pool). After a reroll, briefly ghost the discarded roll ("Was: Water") so the gamble is legible. The reroll count chip can pulse at 1 left (respect reduced motion).
16. **Draft recap strip.** M. A horizontal "16 picks" film strip under the road strip, one mini sprite per round with region and type badges. Tapping one scrolls to its slot. It doubles as progress.
17. **Haptics.** S. `navigator.vibrate?.(10)` on sign, `[8, 40, 8]` on a legendary reveal, behind the existing Sound toggle (`components/wheel/SoundToggle.tsx`) renamed "Sound and haptics". Android only; iOS Safari has no Vibration API. SA-23 is still open.
18. **PWA.** M. Add `src/app/manifest.ts` (Next metadata route), 192 and 512 icons, `apple-icon.png`, `display: "standalone"`, and theme colours from `src/design/theme-color.ts`. Then pad `safe-area-inset-top` on `.site-header` and the draft error toast (section 3.3). SA-17 is still open. Skip the service worker. The draft engine is already lazy-loaded, and offline is not needed for a friend group.
19. **Breakpoint tokens.** M. Pick 480, 720, 960 and 1200. Use `@custom-media` through PostCSS, or document the four and migrate the 11 distinct values found in section 3.1.
20. **Drag performance.** M. Move token and candidate drag offsets to a ref plus `element.style.translate` in a rAF loop, and commit state only on drop (`Pitch.tsx:171-181`, `DraftBoard.tsx:291-316`). Measure first with a 4x CPU throttle trace, as #67 did for touchline decisions.
21. **Split the species chunk.** L, Red. Ship a slim index (id, name, types, gen, special) for drawing and filtering, and load attributes and scouting with the dossier and ratings. Needs golden and artifact discipline per CLAUDE.md.

---

### 8. Prior audit status (spot-checked, front-end only)

| ID | Status at `40f3c92` | Evidence |
|---|---|---|
| SA-16 viewport export | Fixed | `layout.tsx:24-31` |
| SA-18, SC-38, SD-12 theme flash | Fixed | `layout.tsx:37` boot script |
| SA-14 search keyboard attrs | Fixed for Picker | `Picker.tsx:262-271` |
| SA-21 touch defaults | Partly fixed | `globals.css:29-35` |
| SA-43 nested candidate scroller | Fixed on phones | `DraftBoard.module.css:403-407` |
| SC-26 synergy only aria-hidden | Fixed | `SquadFeedback.tsx:68-122` |
| SA-17 manifest and icons | Open | no `manifest.*` or `apple-icon` in `src/app` |
| SA-23 haptics | Open | no `vibrate` in `src` |
| SA-24 wheel blur per frame | Open | `Wheel.tsx:110` |
| SA-37 overflow-x hidden breaks sticky | Open, now Measured | section 0.3 |
| SA-39 nav override order | Open | `globals.css:319-330` before `:338-347` |
| SA-41 overscroll | Open | no html or body rule |
| SB-08 How to play gaps | Open | no Daily, Manager or Live sections |
| SB-14 Reset scope | Open | `HomeScreen.tsx:208-214` |
| SB-18 Home hierarchy | Open | section 2.1 |
| SB-19 dash guard | Partial | two page-local tests only |
| SB-24, SC-28 error pages | Open | no `error.tsx` or `global-error.tsx` |
| SB-27, SC-15 toolbar role | Open | `Builder.tsx:296` |
| SB-28 nav current page | Open | no `aria-current` |
| SC-17 skip link | Open | none |
| SC-18 h2 before h1 on Home | Open | `SidePanel.tsx:189` and following, DOM before `Builder.tsx:234` |
| SC-20 names read twice | Open | `DraftBoard.tsx:766`, `Picker.tsx:433` |
| SC-29, SA-36 px body type | Open | `globals.css:47, 584` |
| SC-31 last gen chip silent | Open | `SidePanel.tsx:118` |
| SC-37 search normalization | Open | `Picker.tsx:137-139` |
| SD-07 Zod on client | Open | `DailyScreen.tsx:15-19`, 31 KB gzip chunk |
| SD-09 /daily client LCP | Open | `DailyScreen.tsx:61-63` |

`docs/reports/audit-baseline.md` was not cross-walked line by line. It predates `platform-audit.md`, whose S2 items were assigned to fix PRs 7C to 7L. I did not re-verify each S2 closure.


# Appendix C. Results, share and social loop

## Audit: post-match frontend and social loop

Repo: /Users/paulo/Projects/pokedraft at `40f3c92` (main, clean). Read-only static audit. No browser was opened, per the coordinator's rule. No tests, lint or build were run.

Evidence labels: **measured** means I ran a script and saw the output. **read** means the cited code says so. **inferred** means it follows from the code but I did not run it. **guess** means unverified.

Scope read in full: `src/components/results/{ResultsView,ShareActions,SharedRun,BrokenRun,MatchList,MatchHighlights,starCalculation,abilityEffects,ExhibitionMatchModal,exhibition,MatchReplay,format}.ts(x)` and the relevant CSS modules. Also `src/components/share/{card,download,useCardDownload,card-images (head)}.ts(x)`, `src/components/leaderboard/{Board,SubmitPanel,LeaderboardScreen,client,format,useToday}.ts(x)`, `src/components/history/{HistoryList,LifetimePanel,store}.tsx`, `src/ui/lifetime.ts`, `src/ui/challenge-href.ts`, `src/app/{r/[token]/*,card/route.tsx,leaderboard/page.tsx,history/page.tsx}`, `src/proxy.ts`, and `src/components/run/LiveRun.tsx:150-215`. MatchdayLive was skipped because another auditor owns it.

---

### 1. Journey after the cup

#### 1.1 Flow as built (read)

1. The matchday ends. `LiveRun.finishMatchday` replays the token, saves it, swaps to `ResultsView variant="live"` and calls `window.scrollTo({top:0})` (`src/components/run/LiveRun.tsx:150-163`).
2. `ResultsView` writes the run into history and lifetime once, on mount (`ResultsView.tsx:80-87`, `src/ui/lifetime.ts:269-274`).
3. Page order: hero (record, Team Score, finish, Flawless banner) → `ShareActions` (Share, Download image, New run) → `SubmitPanel` (live, non-builder only) → Sound plus "Watch Matchday Broadcast" toggle → `MatchHighlights` stage → match list and group table/awards → squad fit → grading `<details>` (`ResultsView.tsx:98-381`).
4. Share copies `/r/<token>` to the clipboard (`ShareActions.tsx:52-61`). Download fetches `/card?t=` and uses the share sheet on coarse pointers, a download link elsewhere (`src/components/share/download.ts:25-67`).
5. A recipient opens `/r/[token]`. That page renders `ResultsView variant="shared"` with Play your own, Challenge this Seed, Open in Builder and Play Exhibition vs Squad (`ShareActions.tsx:86-108`). OG metadata and the image come from `src/app/r/[token]/page.tsx:7-11` and `opengraph-image.tsx`.
6. The challenger plays `/play?...&seed=`. The link carries settings and seed only (`src/ui/challenge-href.ts:6-29`).
7. Leaderboard rows and history rows link to `/r/<token>` and to "Challenge this Seed" (`Board.tsx:195-234`, `HistoryList.tsx:211-238`).

#### 1.2 Friction and drop-off points

| # | Where | What happens | Why it costs the loop |
|---|---|---|---|
| F1 | `ShareActions.tsx:52-61` | "Share" only calls `navigator.clipboard.writeText`. It never calls `navigator.share` for the link. | On a phone the group chat is one tap away through the share sheet. Here the player copies, leaves the app, opens the chat and pastes. When the clipboard fails (in-app browsers, permission denied), the only feedback is "Could not copy the link" and the URL is never shown, so the share dead-ends. |
| F2 | `ShareActions.tsx:52-61` and `src/app/r/[token]/page.tsx:7-11` | The copied text is a bare URL with no message. The metadata has `title` but no `description`. | Chat previews show "pokedraft run: 7-1-0, Team Score 812" plus the card. Nothing says "beat this" or names the sender. |
| F3 | `src/components/share/download.ts:30` | `navigator.share({ files: [file] })` sends the PNG with no `url` or `text`. | A friend who gets the image cannot tap through to replay or challenge it. The image and the link compete instead of travelling together. |
| F4 | `ShareActions.tsx:81-108` | A live run offers no "Challenge a friend" action. Challenge only appears on the shared page, the board and history. | The fastest loop is "play, send a challenge, friend plays the same seed". Today the friend opens the shared run first and then finds a secondary button. |
| F5 | `src/ui/challenge-href.ts:16-25` | The challenge URL carries no reference to the run being challenged. | After the friend finishes, nothing compares the two runs ("You 6-1-1 vs Ash 7-0-1"). The head-to-head moment, which is the social payoff, does not exist. |
| F6 | `ShareActions.tsx:70-71` on the shared variant | "Share" is the `btn--primary` even for a recipient. Six equal-weight buttons wrap below it. | The recipient's real next step is Challenge this Seed or Play your own, and neither is primary. |
| F7 | `ExhibitionMatchModal.tsx:163-166`, `:375-384` | Exhibition needs a saved Builder squad in `localStorage["pokedraft.builder"]`. Without one, the empty state links to `/` with "Build your squad". | A friend who just drafted a cup team (not a Builder squad) cannot play "my team vs yours". They are bounced out of the shared page. Their most recent drafted lineup is already in history (`src/ui/runs`, `squadSpeciesIds`) and could serve as the default challenger (inferred). |
| F8 | `ShareActions.tsx:86` | Exhibition exists only on `variant === "shared"`. It is missing from the player's own results and from history rows. | The player cannot replay a rival's squad from their own board or history. |
| F9 | `SubmitPanel.tsx:68-101` | After a successful submit the panel shows the rank and a "View leaderboard" link only. | The best brag moment ("I'm #2 on today's daily") offers no share action. |
| F10 | `ResultsView.tsx:161-168`, `MatchReplay.tsx:29-32` | "Watch live" mounts the replay above the highlights and scrolls to it. Close unmounts it without restoring focus or scroll. | On a phone the player is thrown from the match list to the top and must scroll back down to find their place (inferred from the code). See A3. |
| F11 | `MatchList.tsx:99-112` → `ResultsView.tsx:187` | Tapping a match's star badge sets `selectedHighlightRound`, but the highlights stage is above the list and nothing scrolls it into view. | On mobile the tap appears to do nothing. The change happens off screen (inferred). |
| F12 | `Board.tsx:188-236` | The board never marks the player's own rows, though the nickname sits in `localStorage["pokedraft:nickname"]` (`SubmitPanel.tsx:11`). | In a 50-row board, a friend group wants "where am I and who beat me". |
| F13 | `src/proxy.ts:46-63` | When `FRIENDS_PASSCODE` is set, every non-public path, `/r/*` included, redirects to `/gate?next=`. | This is the intended private gate. Still, every first-time recipient of a share link must enter the passcode before seeing anything. I did not read `PUBLIC` in `src/passcode.ts`, so whether the OG image route is public stays **unknown**. If it is not public, chat unfurls would show no card. The `share.spec.ts:66` test name ("the passcode gate previews a query destination with its canonical public card") suggests it is handled (guess). |
| F14 | `LiveRun.tsx:200` | Daily results pass `onNewRun={undefined}`, so the daily has no New run button. Only the inline "Play a regular challenge" link appears (`LiveRun.tsx:205-211`). | This is intentional, but the daily ending is a weak CTA. It would be a natural moment for "Share your daily" and "See today's board". |

---

### 2. UI, UX and copy

#### 2.1 Em dashes
I grepped every file in scope for `—` and `–`, outside `__tests__`, and found **0 hits** (measured). The rule holds.

#### 2.2 Copy issues
- **C1. The shared view says "You" and "Your" to a stranger.** The hero says "Your record, Team Score and cup finish." (`ResultsView.tsx:105`). The group table says "Your team" (`:225`). The match list scoreline says "You" (`MatchList.tsx:93`). The rating meter says "You" (`MatchList.tsx:143`). On `/r/[token]` the reader is not the owner, and no owner name exists to substitute. Suggested fix: on `shared`, use "This squad" or the submitted nickname when the token is on the board.
- **C2. Emoji in headline strings.** `starCalculation.ts:121-148,214` builds headlines like "⚽ Hat-Trick Hero (3 Goals)", "🎯 Key Playmaker", "🧤 Clean Sheet Hero" and "🏆 Player of the Tournament". Screen readers announce "soccer ball Hat-Trick Hero". The same strings render inside the match-list badge (`MatchList.tsx:111`). Emoji also sit in `MatchHighlights.tsx:149,245,262` ("⏸ Pause Motion", "⚽ Unleash", "⚽ GOAL!") and `ResultsView.tsx:155` ("▶ Watch Matchday Broadcast"). Move the emoji into `aria-hidden` spans.
- **C3. Mixed title case and exclamation tone in highlights.** Examples are "Match Brace", "Hat-Trick Hero", "Unleash X!", "Continue Dribbling" and "Activated Ability:" (`MatchHighlights.tsx:230,245,269`). The rest of the app uses sentence case and calm statements, such as "Watch live" and "Run results".
- **C4. "Activated Ability" is presented as a match event.** `MatchHighlights.tsx:228-234` shows "Activated Ability: <dex.abilities[0]>" with invented flavor copy from `abilityEffects.ts:9-92`. The engine records no ability activation for that match. The footer kicker "Illustrated highlights. Actions do not change the recorded match result." (`:279-281`) softens this, but the box still reads as fact. It brushes against the "no fabricated data" invariant. See B1 for the factual error it causes.
- **C5. Score formatting is inconsistent.** Exhibition uses "1 - 0" (`ExhibitionMatchModal.tsx:101,348`). Everywhere else uses "1-0" (`MatchList.tsx:95`, `format.ts:35`).
- **C6. Page title style is inconsistent.** History uses "pokedraft history" (`src/app/history/page.tsx:8`). Leaderboard uses "Leaderboard · pokedraft" (`src/app/leaderboard/page.tsx:10`). Runs use "pokedraft run: …" (`title.ts:9`).
- **C7. A hardcoded "50".** History's header says "Your last 50 runs" (`history/page.tsx:17`) and "past the last 50 runs" (`:25`), while the list uses `HISTORY_LIMIT` (`src/ui/runs.ts:88`). They drift if the constant changes.
- **C8. "Weak-spot drag" shows "-0" when drag is 0** (`ResultsView.tsx:309`) (inferred).
- **C9. The OG alt text is static.** It reads "pokedraft run card" (`opengraph-image.tsx:8`) and could carry the record and score that `runTitle` already computes.

#### 2.3 Empty, error and loading states
- Good (read). Board has distinct loading, error (role="alert", with Try again and focus management), filter-empty and empty-with-CTA states (`Board.tsx:116-176`). SubmitPanel maps every server code to plain copy (`SubmitPanel.tsx:13-32`). History has an empty state (`HistoryList.tsx:30-39`). BrokenRun gives a clear dead-end recovery (`BrokenRun.tsx`). The OG image has a broken-run fallback (`opengraph-image.tsx:15-34`).
- Gap. Clipboard failure gives no fallback UI. Show the URL in a read-only input (`ShareActions.tsx:58-60`).
- Gap. `LifetimePanel` shows errors and successes in the same `role="status"` paragraph (`LifetimePanel.tsx:140-142`). A restore error should be `role="alert"`.
- Gap. The exhibition empty-state CTA goes to `/` (`ExhibitionMatchModal.tsx:381`). Whether `/` lands on the Builder is unverified (guess: HomeScreen is the builder desk, per `HomeScreen.tsx:150-200`).
- Gap. "Loading the broadcast" (`ResultsView.tsx:44-46`) has no `role="status"`.
- Gap. The Hall of Fame defaults to "All species". It shows 1,025 species, mostly "No recorded squads", 30 per page (`HistoryList.tsx:25,41-50`). Defaulting to "Drafted species" would make the first view meaningful.

---

### 3. Mobile

- **Breakpoints (read).** `ResultsView.module.css` stacks to one column below 960px (`:253-266`) and shrinks `.record` from 32px to 28px at 768px or wider (`:248-252`). Bigger on phones is intentional. `MatchList.module.css:193` splits scorers into two columns at 520px or wider. `MatchHighlights.module.css:676-709` stacks the stage below 640px with a 140px player area. `Board.module.css:93-99` *drops* row text to 12px at 768px or wider, which is smaller on desktop than on phone. 12px tabular figures are hard to read on a laptop.
- **Touch targets (read).** Results, highlights, board, history and the exhibition modal hold 44px minimums: `.starBadge` 44px (`MatchList.module.css:302-307`), `.watch` (`:333-336`), `.navArrow` and `.matchChip` 44px (`MatchHighlights.module.css:95-136`), board `.link` and `.challenge` (`Board.module.css:25,124`), and `btn--sm` gets `min-height: 44px` (`globals.css:170`). I found no sub-44px interactive element in scope.
- **Overflow (read).** The group table scrolls inside a focusable region (`ResultsView.tsx:199-204`). The highlights chip strip scrolls sideways (`MatchHighlights.module.css:85-93`) with 9 chips (8 matches plus MVP). On a 320px screen most chips sit off screen and nothing hints that more exist (inferred). Board rows use fixed columns, `28px 1fr 52px 72px` (`Board.module.css:20`). At 320px the middle column is about 110px, so 16 squad sprites at 24px wrap into about 4 lines, which makes every row tall (inferred arithmetic). History rows do the same (`HistoryList.tsx:219-227`).
- **Shared-view action bar.** It holds up to six buttons plus a status span in one wrapping flex row (`ShareActions.tsx:69-118`, `.actions` in `ResultsView.module.css:62-67`). On a phone that is three rows of equal-weight buttons before any result content.
- **Share sheet (read).** `navigator.share` is used only for the card file, only on `(pointer: coarse)`, and handles `AbortError` and NotAllowedError (`download.ts:25-37`). The fetch and PNG render run *before* `share()` inside the same tap, so a slow cold render can outlive transient activation. The code falls back to a download link, which iOS handles unevenly (comment at `download.ts:23-24`). Prefetching the blob when results mount, or on hover/focus, would keep `share()` inside the gesture (inferred). The link Share never uses the share sheet (F1).
- **OG image size (read).** `CARD_SIZE` is 1200×630 (`card-layout.ts:3`), which is correct for OG and Twitter `summary_large_image` (`page.tsx:10`). Cache is `public, max-age=86400, s-maxage=31536000` (`card-images.ts:113`). The broken-run image caches for 1h. No portrait (1080×1920) story variant exists for Instagram or WhatsApp status.

---

### 4. Accessibility

- **A1. Board and history sprites have meaningless alts inside links.** Each row link holds 16 `PlayerImage`s with `alt="Squad species 25"` and so on (`Board.tsx:210`, `HistoryList.tsx:222`). The link's accessible name becomes "3 Ash Open, Squad First, All regions Squad species 25 Squad species 6 … W-D-L 7-1-0 Team Score 812". That is 16 extra tokens per row across 50 rows. Use `alt=""` and add a hidden summary, or use real species names.
- **A2. "Challenge this Seed" repeats with identical text** on every board and history row (`Board.tsx:231-233`, `HistoryList.tsx:235-237`). This fails WCAG 2.4.4 and 2.4.9 out of context. Add `aria-label={\`Challenge ${nickname}'s seed\`}`.
- **A3. Watch live loses focus on close.** `MatchReplay` focuses its heading on open (`MatchReplay.tsx:29-32`), but `onClose` only clears state (`ResultsView.tsx:166`). Focus drops to `<body>`. Return focus to the invoking `watch-live` button, the way `ExhibitionMatchModal.tsx:180-189` already does.
- **A4. Leaderboard tabs are half-implemented.** They use `role="tablist"` and `role="tab"` (`LeaderboardScreen.tsx:55-68`) with no `aria-controls`, no `tabpanel` and no arrow-key roving. Screen-reader users hear "tab 1 of 2" and expect arrow keys. Either finish the pattern or use `aria-pressed` buttons, as the coach chips do.
- **A5. Highlights motion.** Reduced motion stops the idle aura, sprite, ball and shadow animations (`MatchHighlights.module.css:658-674`). It does not cover `.goalOverlay` (`goalBannerEnter`) or `.goalTitle` (`goalPop`) (`:488,498`). `e2e/silph-stadium.spec.ts:110` covers reduced-motion controls. The "Pause Motion" toggle exists (good for WCAG 2.2.2).
- **A6. Highlights heading level.** The star name is an `<h2>` (`MatchHighlights.tsx:216`) inside a section with no heading, sitting between ModuleCards. It changes on every chip, so the outline reads "h2 Pikachu".
- **A7. Hard-coded dark island.** `MatchHighlights.module.css` has **75** `rgba(...)` literals, and `MatchList.module.css` has 3 (measured with grep). `scripts/audit/theme-color-lint.mjs:16` flags only hex, so rgba bypasses the theme gate. In the light theme, `.starBadge` gets a 5% white background and a 10% white border on a light card (`MatchList.module.css:310-312`), so the button outline effectively disappears (inferred). Contrast inside the dark highlights stage is not checked by `check:theme-contrast` (guess). `e2e/contrast.spec.ts` runs axe on results pages, which would catch text contrast but not a missing button border.
- Good (read). The SubmitPanel success line takes focus (`SubmitPanel.tsx:52-54`). Board error and retry focus is handled carefully (`Board.tsx:65-92`). The group table is a focusable scroll region. The exhibition dialog uses native `<dialog>` with focus return.

---

### 5. Bugs and risks

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| B1 | **High (data honesty)** | The highlights card shows a type icon and type color the Pokémon does not have. `getAbilityMeta` replaces the species type with a hard-coded ability "element" (for example `intimidate → dark`, `clear-body → steel`). `MatchHighlights` renders that as `<TypeIcon type={currentStar.element}>` next to the name and tints the stage with it. **Measured:** 156 of 1,025 species have a first ability whose catalog element is not one of their types. Examples are Arcanine (fire) shown as Dark, Tentacruel (water/poison) as Steel, and Golbat (poison/flying) as Fighting. Fix: always use `primaryType` for the icon and color, and keep any ability tint separate. | `abilityEffects.ts:9-71,101-107`, `starCalculation.ts:156,163,176`, `MatchHighlights.tsx:62,215` |
| B2 | Medium | The ability is always `dex.abilities[0]`. Neither the engine nor the scouting data picks it. Hidden abilities and the ability that `src/scouting/ability-traits.json` might weigh are ignored. It is shown as "Activated". | `starCalculation.ts:154-155,190-191` |
| B3 | Medium | Star selection ignores absences and substitutions. "Clean Sheet Hero" and "Squad Anchor" always pick `starters[0]` (the GK slot, per `formations.ts:75`) even if that keeper missed the match (`m.absences`) or was subbed off. A 0-0 match lost on penalties also gives the losing keeper "Clean Sheet Hero" (`score.opp === 0` uses `finalScore`, which excludes pens). | `starCalculation.ts:137-150`, `format.ts:23-29` |
| B4 | Low | The tournament MVP pill outcome is `cup.flawless ? "W" : cup.wins >= cup.losses ? "W" : "D"`. A losing record shows a neutral D pill, and "W" is used for a group exit with 1W-1D-1L. It is a cosmetic mislabel. | `starCalculation.ts:222` |
| B5 | Low | `getMatchStar` falls back to `1 as SpeciesId` (Bulbasaur) when starters are empty. That cannot happen for a valid run, but it is a silent default and not an honest failure. | `starCalculation.ts:74,142,147` |
| B6 | Low (drift) | `ShareActions` re-implements the challenge URL instead of calling `challengeHref` (`ShareActions.tsx:38-50` vs `src/ui/challenge-href.ts:16-25`). The two can drift, for example on how retained-version tokens are read. | read |
| B7 | Low | The backup download revokes the object URL synchronously right after `click()`. `download.ts:49` deliberately defers with `setTimeout(…, 0)`, which suggests a known Safari or iOS problem with sync revoke. The backup may fail there (guess, not reproduced). | `LifetimePanel.tsx:18-25` |
| B8 | Low | The first "Unleash" strike is probably silent. `unlockAudio()` creates or resumes the AudioContext asynchronously, and `playGoalHorn()` bails out unless `ctx.state === "running"` in the same tick (inferred). | `MatchHighlights.tsx:86-87`, `wheel/sound.ts:37-46,99-100` |
| B9 | Low | `useToday` subscribes to nothing (`subscribe` returns a no-op), so the date only moves past midnight when something else re-renders. The page comment says the client "re-reads the date after hydration, so a page left open past midnight moves on". That holds only on re-render (inferred). | `useToday.ts:7-18`, `leaderboard/page.tsx:12-14` |
| B10 | Info | `/card?t=` is unauthenticated (subject to the proxy gate) and replays any token on the server. The CDN cache (`s-maxage` 1 year) blunts repeats, but unique tokens are cheap to mint. I did not check rate limits (guess, low risk for a private friend game). | `card/route.tsx:8-24` |
| B11 | Info | The theme lint only catches hex, so rgba literals escape the theme system (A7). This is a structural gap, not a one-off. | `theme-color-lint.mjs:16` |
| B12 | Info | Exhibition `Play rematch` rerolls without limit and is unranked, which is fine. Two-legs runs up to 20,000 synchronous `simulateMatch` calls on the main thread in the worst case. The code comment puts the expected count near 70 (`exhibition.ts:36-39,115-134`). This is not a real risk. | read |

---

### 6. Prioritized improvements

Effort: S is under half a day, M is 1 to 2 days, L is several days. Tier per CLAUDE.md is in brackets.

#### P0
1. **Fix the wrong type icon in highlights (B1).** [Yellow, S] In `starCalculation.ts`, set `element: primaryType` and add `abilityTint` separately if wanted. Add a test that names the bug: Arcanine's star element is `"fire"`. Consider also dropping "Activated" from the copy (C4).
2. **A real share sheet for the link (F1, F2, F3).** [Yellow, S] In `ShareActions.tsx` add `shareRun()`. On a coarse pointer with `navigator.share`, call `share({ title, text: "7-1-0, Team Score 812. Beat it?", url })`. Otherwise copy, and when the copy fails, show a read-only `<input>` with the URL. In `download.ts:30`, pass `{ files, url, text }`, guarded by `canShare`. In `r/[token]/page.tsx`, add `description` to the metadata.
3. **A "Challenge a friend" button on live results (F4).** [Yellow, S] Reuse `challengeHref(token)`, which also fixes B6. It shares `…/play?…&seed=…&vs=<token>`, or the `/r/` link with a challenge intent.
4. **Accessibility quick wins (A1, A2, A3).** [Yellow, S] Decorative sprite alts on board and history rows, a contextual aria-label on "Challenge this Seed", and focus return on MatchReplay close.

#### P1
5. **Head-to-head result (F5).** [Yellow or Red depending on token change, M] Add an optional `vs=<runToken>` query on `/play` (UI only, no engine change). At results, replay both tokens client-side, which is already deterministic, and render a `HeadToHead` card: both records, Team Scores, per-round scores side by side, "You win the seed" or "Ash wins the seed", and a "Send it back" share. Files: `src/ui/settings.ts` (playHref parse), `src/components/run/LiveRun.tsx` (pass `vs`), new `src/components/results/HeadToHead.tsx`. No server needed.
6. **Exhibition against your latest drafted squad (F7, F8).** [Yellow, S to M] In `ExhibitionMatchModal.tsx:163-166`, fall back to (or let the player choose) the newest history record with `squadSpeciesIds`, then the Builder save. Add an "Exhibition vs this squad" button on history and board rows. Make the exhibition result shareable through `/r/`-style query params `?ex=<a>.<b>.<rematch>` (inferred feasible, since `playSingle` is deterministic from seed, lineups and rematch).
7. **Highlight your own rows on the board, plus "Share my rank" (F9, F12).** [Yellow, S] `Board.tsx` reads `NICKNAME_KEY` and sets `data-me` on matching rows. `SubmitPanel` done state gets a Share button with "I'm #3 on the {date} daily".
8. **A results reveal moment.** [Yellow, M] There is no reveal today. Everything renders at once (`ResultsView.tsx`). Add a staged hero: count up the Team Score, flip the W-D-L in, show a trophy and confetti burst for `champion` and a gold treatment for `flawless`, then a "Your MVP" card. Respect `prefers-reduced-motion`, keep it deterministic and display-only, and use CSS only.
9. **Scroll and sync behavior (F10, F11).** [Yellow, S] A star-badge tap calls `scrollIntoView` on the highlights stage. Watch live opens inline under its match card, or restores scroll on close.
10. **Theme-safe highlights (A7, B11).** [Yellow, M] Move the 78 rgba literals into `src/design/stadium.css` tokens and extend `theme-color-lint.mjs` to flag `rgba?\(` outside `src/design`.

#### P2 (friend-group features)
11. **Weekly cup and season standings.** [Red (leaderboard), L] Use the daily board as a base: a weekly seed (ISO week), with standings that sum points per nickname across the week's dailies (3/1/0 per match, or rank points). Server: add a `scope=week` query in `src/leaderboard` and the API route. UI: a `Season` tab in `LeaderboardScreen`.
12. **Rivalries.** [Red, M to L] Run a nickname-pair query over shared daily boards: "Ash vs Misty: 5-3 on dailies this month". UI: a `/rivals?me=&them=` page. Nicknames are unauthenticated, so treat this as a casual comparison, not an integrity feature.
13. **Badges and achievements.** [Yellow, M] Compute them locally from `RunRecord` and lifetime: First Flawless, Hat-trick hero, Champion with every formation, 151 Challenge champion, Comeback (won after losing G1), Giant killer (beat an opponent rated 150 or more higher). They are pure functions in `src/ui/achievements.ts`, with a grid in `LifetimePanel` and a chip on the share card. They need no server and fit the "no fabricated data" rule because they derive from recorded results.
14. **Story-size share card.** [Yellow, S to M] Add `/card?t=…&format=story`, 1080×1920, with the MVP sprite, the eleven, the record and a short URL. Reuse `card-layout.ts`.
15. **A shareable goal clip.** [Yellow, L] The match broadcast is deterministic (`MatchPlayer`, seeded timeline). Record a goal with `canvas.captureStream()` and `MediaRecorder` to WebM or MP4 on the client, or share a deep link `/r/<token>?watch=<matchIndex>&t=<minute>` that autoplays the replay at that goal. The deep link is S and gets most of the value. The video export is L and depends on browser support (guess: MediaRecorder MP4 on iOS Safari is inconsistent).
16. **The card names the player.** [Yellow, S] When the run was submitted, add the nickname and MVP to `card-panel.tsx`, so screenshots in a group chat identify their owner.
17. **Hall of Fame defaults to drafted species** and the history header uses `HISTORY_LIMIT` (C7). [Yellow, S]

---

### NOT RUN
- No browser or device check. The coordinator's rule forbids visible browsers, and I chose static reading. Every mobile and visual claim above is read or inferred from CSS, not seen.
- No `pnpm lint`, `typecheck`, `test`, `build` or Playwright run.
- `src/passcode.ts` `PUBLIC` list not read (F13 unknown).
- MatchdayLive and Broadcast internals are out of scope (another auditor has them).

### Measurements taken
- Em dash and en dash grep over the scope: 0 hits.
- rgba literal count: `MatchHighlights.module.css` 75, `MatchList.module.css` 3.
- Wrong-type star element: 156 of 1,025 species. I parsed the 52 `ABILITY_CATALOG` entries with a regex in a one-off node script and compared them against `src/data/pokedex.json` `abilities[0]` and `types`.


# Appendix D. Backend and platform

## pokedraft backend and platform audit

Read-only audit. Code is local `main` at `40f3c92` (#70). Production `/api/health` reports `f4489cb` (#69). `git ls-remote origin main` shows `f4489cb`, so origin moved one commit past this checkout (#69, "open the picker centered over the pitch", UI only by its title). Nothing in the repo was edited, staged or committed. Production saw only GET requests.

Evidence labels used below:
- **measured**: I ran it this session and the number is from that run.
- **read**: static reading of the cited lines.
- **inferred**: follows from the code but I did not run it.
- **guess**: plausible, unverified.

Prior work: `docs/reports/platform-audit.md` (dispatch 7) listed backend findings SE-01..SE-25. Many were fixed. Several S3 items were deferred and are **still open in code** (noted as "still open, SE-xx" below). I re-checked each one against current code. I did not take any of them on trust.

---

### 0. Executive summary

The backend is small, careful and well tested. The server recomputes every score (`replay(run)` in `handlers.ts:236-242`). The rate limiter is a single serialized SQL statement. Errors are logged without PII. Retained engines keep old links replayable. No P0 security hole was found.

The real gaps are integrity and ops, not code hygiene.

1. **Leaderboard integrity is weak by design.** The all-time board accepts any client-chosen seed. The daily seed is public and deterministic. The engine ships to the client. Nicknames are unauthenticated. So seed-shopping, daily save-scumming and nickname squatting are all possible. I also **measured** a new bypass of the duplicate-run guard: a redundant coach decision re-keys a coached run with an identical result.
2. **Open redirect still present** (SE-14, deferred, never fixed). Reproduced with the exact `safeNext` logic.
3. **No alerting or uptime monitoring.** Logs live only in Vercel runtime logs.
4. **The `coached` flag is recomputed in SQL on every board read** by base64-decoding every token. It should be a stored column.

---

### 1. Architecture map

#### Request flow

```
browser ─► Vercel edge ─► proxy (src/proxy.ts)           passcode gate + /r/ token pre-validation
                          │
                          ├─ GET  /api/leaderboard  ─► handleBoard  ─► drizzleStore.top  ─► Neon (HTTP)
                          ├─ POST /api/leaderboard  ─► handleSubmit ─► admitSubmission (1 SQL stmt: dedupe + daily + rate limit)
                          │                                         ─► engine replay (CPU, ~4 ms)
                          │                                         ─► insert ─► rankOf
                          ├─ POST /gate/unlock      ─► handleUnlock ─► drizzleLimiter.consume ─► cookie
                          ├─ GET  /api/health[?db=1]                 metadata, optional `select 1`
                          ├─ POST /api/csp-report                    log-only sink
                          ├─ GET  /r/[token] (+opengraph-image)      replayAnyVersion (retained bundles v1..v5 or live v6)
                          └─ GET  /card?t=|b=                        replayAnyVersion + satori + sharp PNG
```

#### Files

| Concern | File:line | Notes (read) |
|---|---|---|
| Leaderboard route | `src/app/api/leaderboard/route.ts:7-17` | Thin adapter. Wires `getDb`, `IP_HASH_SECRET`, clock. |
| Submit handler | `src/leaderboard/server/handlers.ts:203-272` | Secret check, parse, admission, replay, insert, rank. |
| Pre-DB validation | `handlers.ts:122-175` | Body ≤16 KB (`:31`, `:107-111`), zod (`:135`), engine version (`:137`), nickname (`:145`), token decode (`:152`), builder refusal (`:156`), daily settings (`:161-169`), canonical re-encode (`:172`). |
| Board handler | `handlers.ts:274-310` | zod discriminated union query (`contract.ts:91-111`), top 50 (`contract.ts:17`). |
| Client IP / hash | `handlers.ts:81-90` | `x-real-ip`, then first `x-forwarded-for`, then `"unknown"`. HMAC-SHA256 keyed by `IP_HASH_SECRET` (≥32 chars, `:30`, `:92-94`). |
| Contract | `src/leaderboard/contract.ts:22-49` | Submit schema, status map, token max 4096. |
| Store | `src/leaderboard/server/store.ts:110-208` | Admission CTE (`:112-161`), `byToken` md5 lookup (`:162-169`), insert with 23505 mapping (`:179-191`), `rankOf` (`:192-198`), `top` (`:199-206`). |
| Coached SQL | `store.ts:54-71` | Base64-decodes tokens in SQL, `pg_input_is_valid` (PG16+). Version splice guarded (`:55-59`, `src/ui/manager/coached.ts:6-24`). |
| Rate limiter | `src/ratelimit/store.ts:27-89` | Bucket row upsert with `ON CONFLICT ... WHERE cardinality < max`, plus event log and bounded pruning (50/stmt). |
| Gate | `src/gate/unlock.ts:29-62`, `src/app/gate/unlock/route.ts:6-13`, `src/passcode.ts:1-52` | 10 tries / 15 min (`unlock.ts:13`). Fails closed without secret (`:36-39`). |
| Proxy | `src/proxy.ts:46-67` | Gate off when `FRIENDS_PASSCODE` unset (`:48`). Share-link pre-decode (`:15-29`). Matcher excludes only `_next/static`, favicon, robots (`:66`). |
| DB client | `src/db/client.ts:9-15` | `drizzle-orm/neon-http`, memoized per instance. |
| Schema | `src/db/schema.ts:15-97` | 3 tables. Checks on mode, nickname, record. |
| Migrations | `drizzle/0000..0003*.sql`, `drizzle/rollback/*.down.sql`, `scripts/db/migrate.mts`, `scripts/db/rollback.mts` | Hand-paired down files. Manual `pnpm db:migrate`. |
| Observability | `src/observability/log.ts:6-26`, `src/instrumentation.ts:5-21` | JSON lines with name + SQLSTATE only. |
| CSP / headers | `next.config.ts:8-31`, `:58-72` | CSP is **Report-Only**. HSTS comes from Vercel (measured header). |
| CSP sink | `src/app/api/csp-report/route.ts:62-85` | 8 KB cap, 5 lines per request, origins only. |
| Health | `src/app/api/health/route.ts:5-25` | Public. `?db=1` runs `select 1`, neutral 503. |
| Share replay | `src/app/r/[token]/run.ts:6-12`, `src/engine/versions/index.ts:32-92` | React `cache` per request. Retained bundles lazy-imported. |
| Card | `src/app/card/route.tsx:8-25`, `src/components/share/card-images.ts:19-33,113` | Public. `CARD_CACHE_CONTROL = "public, max-age=86400, s-maxage=31536000"`. Pack id allowlisted (`src/images/packs.ts:39-58`), so no path traversal. |
| Token codec | `src/engine/token.ts:248-304` | zod tuples, strict base64url, fatal UTF-8. Accepts only `RUN_TOKEN_VERSION` 6 (`:289`). |
| Version registry | `src/engine/versions/label.ts:10`, `versions/index.ts:32-58`, `versions/v*/MANIFEST.json` | sha256 manifest per frozen bundle. |
| CI | `.github/workflows/ci.yml:17-71` | check + e2e jobs. Node 22. Actions pinned by tag. |
| Lint rules | `eslint.config.mjs:6-62` | Determinism bans in engine/lib/scouting/ui-matchday. |
| Tests | `vitest.config.mts:1-19`, PGlite-backed tests in `src/leaderboard/server/__tests__`, `src/ratelimit/__tests__`, `src/gate/__tests__`, `src/db/__tests__` | Real SQL against PGlite. |

---

### 2. Security

#### 2.1 Score integrity (is score recomputed server-side?)

**Yes.** The client sends only `{nickname, token, engineVersion?}` (`contract.ts:22-26`). The server decodes the token, replays draft and cup, and stores `cup.rating.score`, `cup.wins/draws/losses` and `cup.engine` from its own replay (`handlers.ts:236-257`). The client cannot submit an impossible score. The replay validates draft legality (`src/engine/replay.ts:9-18`), coach decision order (`src/engine/cup.ts:145-155`), decisions for unplayed matches (`cup.ts:318-319`) and decisions after the final whistle (`src/engine/match.ts:878`). Substitution legality is checked (`match.ts:574-578`). (read)

What the server **cannot** check is how the run was found. Cheating vectors, most severe first:

| # | Vector | Status | Evidence |
|---|---|---|---|
| C1 | **All-time seed shopping.** The seed is any non-empty string the client picks (`token.ts:142-147`; `Seed` is a branded string, `types.ts:12`). The engine is deterministic and runs in the browser. A script can search seeds and drafts offline and submit only an 8-0. | Open, by design | read |
| C2 | **Daily save-scumming / offline solving.** The daily seed is `deriveSubseed("pokedraft-daily","daily",date)` (`src/engine/rng.ts:142-144`). It is public and computable for any future date. A player can replay today's daily locally many times and submit only the best. No client or server record of a "first attempt" exists (grep of `src/components/daily` found no attempt guard). | Open | read |
| C3 | **Nickname squatting / impersonation.** Nicknames are unauthenticated. The daily unique index is `(nickname, mode, daily_date)` (`schema.ts:34-36`). Anyone can submit as "Lito" first and the real Lito gets `DAILY_ALREADY_SUBMITTED` (`handlers.ts:73-77`). One IP can also post 10 nicknames per hour to the daily board. | Open | read |
| C4 | **Duplicate-run guard bypass via a redundant coach decision.** For a coached run, appending a tactic that equals the current tactic changes the canonical token but not the result. `applyManager` only sets `managed = true` and returns when the tactic is unchanged (`match.ts:559-571`). So a copier can take a leader's public token from the board response (`BoardEntry.token`, `contract.ts:62`), add one no-op decision, and list the same run under a new nickname. This dodges `DUPLICATE_TOKEN` (`store.ts:120`, `schema.ts:37`). | **New, measured** | Script `scratchpad/noop-copy.mts` on the production pd6 token. Two distinct tokens both replayed to `{"w":2,"d":1,"l":1,"s":333}`. |
| C5 | **Cross-engine and cross-variant ranking.** The all-time board filters only by mode (`store.ts:79-83`). It mixes engine versions and variants. The current #1 is a `pd3` classic3 g1234 run (measured from `/api/leaderboard?mode=cup8&scope=all`). It competes with engine-6 open runs under different balance. This is a product call, not a bug. | Open | measured + read |

The C4 fix is cheap. Reject a decision that changes nothing: a tactic equal to the current tactic, or two decisions at the same minute. Alternatively, make the dedupe key a hash of the *outcome* plus the lineup instead of the token. The first option touches `src/engine` (Red tier, goldens) and needs a token version bump if old tokens must keep replaying. The second option is server-only: add a `run_fingerprint` column = sha256(canonical lineup + seed + result), unique per mode.

#### 2.2 Input validation (zod)

- Submit body: `submitBodySchema` (`contract.ts:22-26`). `nickname` is an unbounded `z.string()`, but the 16 KB body cap (`handlers.ts:107-111`) and `parseNickname` (`nickname.ts:36-47`) bound it. (read)
- The body cap is checked **after** `req.text()` buffers the full body (`handlers.ts:108`, `csp-report/route.ts:64-65`). Vercel caps function bodies at 4.5 MB (guess from platform docs, not verified here), so the risk is memory and CPU per request, not a crash. Still open, SE-22.
- Board query: discriminated union with calendar-checked date (`contract.ts:91-111`). Good. (read)
- Token: strict zod tuples. Species 1..1025. Minute 0..120. Base64url with zero trailing bits (`token.ts:44-62`, `:106-149`). Good. (read)
- `POST /gate/unlock` calls `req.formData()` with no try (`unlock.ts:30`). A JSON or empty body throws and becomes a 500 through `onRequestError`. Still open, SE-13 (read, not run).
- No `Content-Type` or `Origin` check on POSTs. Still open, SE-22. Low impact: the gate cookie is `SameSite=Lax` (`unlock.ts:54-60`), and with the gate off anyone can submit anyway.

#### 2.3 Token tampering

- Tokens are unsigned by design. They are replay recipes, and the server replays them. Tampering yields either a decode error or a legal run with an honestly computed score. (read)
- The canonical re-encode (`handlers.ts:170-172`) closes the SE-01 encoding-variant duplicates. C4 above is the remaining semantic variant.
- `squadPreview` decodes stored tokens on every board read, with try/catch (`squad-preview.ts:8-21`). Good.

#### 2.4 Rate limiting

- Submit: 10 per hour per IP hash (`handlers.ts:29`). Gate: 10 per 15 min (`unlock.ts:13`). (read)
- Correctness is strong. One statement does an upsert keyed on `(scope, key_hash)`, which takes the row lock, and the `ON CONFLICT ... WHERE cardinality(active) < max` re-check is evaluated under that lock (`ratelimit/store.ts:48-62`). The "needed" predicate (no existing token, no daily conflict) gates the INSERT source rows (`:58`), so retries and conflicts spend no attempt (`store.ts:113-122`). PGlite tests cover this (`src/ratelimit/__tests__/retention.test.ts`, `platform-admission.test.ts`). (read; the suites passed, see §5)
- Pruning is now global and bounded, 50 rows per statement, with `SKIP LOCKED` (`ratelimit/store.ts:67-86`). SE-10 is fixed.
- **IPv6 rotation (still open, SE-12).** The key is the exact address (`handlers.ts:81-86`). An IPv6 client normally controls a /64, so it gets an effectively unlimited budget. Fix: key IPv6 by its /64 prefix before hashing.
- If neither IP header is present, every caller shares one `"unknown"` bucket (`handlers.ts:85`). On Vercel `x-real-ip` is always set (`CLAUDE.md` hosting assumptions), so this matters only off-platform.
- Double bookkeeping. `rate_limit_events` is still written on each admission (`ratelimit/store.ts:63-66`), but only to seed a brand-new bucket's history (`:51-57`). After the 0003 backfill (`drizzle/0003_serialized_rate_limit.sql:9-12`), the events table is near-dead weight. The schema comment calls it "admission evidence" (`schema.ts:70-71`), so it may be kept on purpose.
- `/card`, `/r/*/opengraph-image`, `/api/health?db=1` and `/api/csp-report` have **no rate limit** and are public even when the gate is on (`passcode.ts:8-19`). See §4 for the `/card` cost.

#### 2.5 IP hashing and secrets

- HMAC-SHA256 with a ≥32-char secret. Fails closed for submit (`handlers.ts:207-210`) and gate (`unlock.ts:36-39`). Good. (read)
- The `ip_hash` column on `leaderboard_entries` is written (`handlers.ts:257`) but never read: rate limiting moved to buckets. `leaderboard_entries_ip_recent_idx` (`schema.ts:53`, `drizzle/0000...sql:25`) has no reader. Still open, SE-09. It is dead write cost plus a stored pseudonymous identifier with no purpose.
- `observability/log.ts:3-4,23-26` deliberately logs only error name and SQLSTATE, never driver messages with parameters. Good.
- `scripts/db/connect.mts:5` refuses to print the URL and logs only the hostname. Good.
- Production credential rotation "was not performed" after the cutover (`STATE.md:155`). Owner action.

#### 2.6 Gate and open redirect

- The gate is **off in production**: `/api/leaderboard` answers 200 without a cookie (measured). That matches `STATE.md:186` and the prior audit (`platform-audit.md:1483`).
- The cookie value is an unsalted SHA-256 of the passcode (`passcode.ts:25-27`). It is the same bearer for every friend and lasts 90 days (`:4`). Still open, SE-23. That is acceptable for a friend group. Rotating the passcode revokes everyone.
- **Open redirect, still open (SE-14).** `safeNext` (`passcode.ts:44-52`) resolves against a fake origin and returns `pathname + search + hash`. For `"/..//evil.com"`, `"/.//evil.com"` and `"/%2e%2e//evil.com"`, the URL parser normalizes the pathname to `"//evil.com"`. That is protocol-relative, and the redirect then builds `https://evil.com/`. (**measured** by running the identical function body in node; production not probed, because the route is a POST.) The reachable path in production: `GET /gate?next=/..//evil.com` renders the hidden field (`src/app/gate/page.tsx:38,42`). With the gate off, `handleUnlock` redirects straight to `new URL(next, req.url)` (`unlock.ts:31-33`). The tests cover `//evil.test` but not dot segments (`src/__tests__/proxy.test.ts:239-246`). Fix: after parsing, return `"/"` if `url.pathname.startsWith("//")`, and add the three literal cases as a RED test.

#### 2.7 CSP and headers

- Production headers (measured): HSTS `max-age=63072000; includeSubDomains; preload` (from Vercel), `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy, `X-Robots-Tag`, and `Content-Security-Policy-Report-Only`.
- The CSP is **report-only** with `script-src 'self' 'unsafe-inline'` (`next.config.ts:8-20,30`). Nothing is enforced. The comment says to flip it once the csp-report lines go quiet (`:3-7`). I could not check the logs (Vercel MCP returned 403/404 for this project; NOT RUN). Recommendation: enforce now. Even with `'unsafe-inline'`, an enforced `default-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'` blocks exfiltration and framing. Zod is already `jitless` (`src/instrumentation-client.ts:6`).
- `/api/csp-report` is public and unthrottled, and writes up to 5 log lines per request (`csp-report/route.ts:4,72`). That is a log-flooding vector of low severity.

#### 2.8 SQL injection surfaces

- All values go through drizzle `sql` template parameters (`store.ts:115-127`, `ratelimit/store.ts:39-88`). (read)
- `sql.raw` appears only in `coachedSqlFor` for version numbers and their lengths (`store.ts:63-65`). Those are validated at runtime (`:55-59`) and at the type level (`coached.ts:6-24`), and come from a constant (`coached.ts:16`). No user input reaches `sql.raw`. Safe.
- `scripts/db/*.mts` use `$1` placeholders (`delete-entry.mts:13-16`). Safe.

---

### 3. Reliability

#### 3.1 Error handling

- Every DB call in the handlers is wrapped. Board errors give a 503 with `x-request-id` (`handlers.ts:304-309`). A rank failure after a saved insert returns 201 with `rank: null` (`:178-190`, `:265-267`). A concurrent insert race is resolved by `byToken` (`:259-264`). This is good, deliberate design. (read)
- `tokenError` rethrows non-`RunTokenError` (`handlers.ts:68-71`). An engine bug inside `replay` therefore becomes a 500 through `onRequestError`. That is the right choice: no silent zero.
- No time bound between function and Neon. `neon(url)` uses fetch with no `AbortSignal` (`db/client.ts:13`). Still open, SE-18. A hung Neon request runs until the function's max duration. Fix: pass `fetchOptions: { signal: AbortSignal.timeout(5000) }`, or wrap each store call.

#### 3.2 DB connections on serverless

- `neon-http` is the right driver for Vercel functions: stateless HTTP, no pool to exhaust (`db/client.ts:2-3`). (read)
- The trade-off is no interactive transactions. The code avoids needing them by packing admission into one statement. Insert and rank are separate round-trips. A submit costs 3 round-trips: admission, insert, rank (`handlers.ts:221,245,266`).
- Neon cold start (inferred from measurement): the first `/api/health?db=1` took TTFB 0.906 s. Later ones took 0.15 to 0.19 s. Neon autosuspend is the likely cause (guess; compute state not queried).

#### 3.3 Migrations and rollback

- 4 migrations, each with a paired down file (`drizzle/rollback/*.down.sql`). `scripts/db/rollback.mts:6-28` rolls back the newest migration in one `sql.transaction` with the journal row removed. (read)
- `0000.down` is `DROP TABLE leaderboard_entries`. That is total data loss with no guard or prompt (`drizzle/rollback/0000_leaderboard_entries.down.sql:1`). Add an explicit `--i-know` flag or refuse when rows exist.
- `migrate.mts` uses the neon-http migrator (`scripts/db/migrate.mts:1-7`). STATE describes a manual, firewall-fenced cutover (`STATE.md:155`). Nothing runs migrations on deploy, and CI never applies migrations to a real Postgres. Only PGlite runs the SQL files in `src/db/__tests__/migrations.test.ts:23-40`. That is partial progress on SE-08. Risk: PGlite version vs Neon PG version drift for `pg_input_is_valid` (PG16+, `store.ts:50`) (guess).
- No schema-drift check at runtime: if `DATABASE_URL` points to an un-migrated branch, the first query fails as a 503. Cheap guard: `/api/health?db=1` could also compare the latest `drizzle.__drizzle_migrations.created_at` with the journal's last `when`.

#### 3.4 Observability

- Logs: structured JSON lines (`observability/log.ts:23-26`, `instrumentation.ts:5-21`). Good hygiene.
- **Gaps:** no alerting, no uptime check, no log drain, no metrics on submits, rejects by code or replay time. Vercel Hobby log retention is short (guess: about 1 hour on Hobby; the MCP tool description mentions "Hobby's retention window"). So incidents not seen live are lost.
- I could not read production logs or runtime errors. Vercel MCP returned 403/404 for project `prj_GfNWnE8gbjY2YXOPOWszq7vxGOnL` under `pnascimento9596s-projects`. **NOT RUN.**

#### 3.5 Health checks

- `/api/health` is solid: sha, env, region, engine, token versions, optional DB ping with neutral 503 (`health/route.ts:5-25`). (read + measured 200)
- Nothing calls it on a schedule. See P1-3.
- `?db=1` is public, so anyone can wake Neon. That is harmless at this scale.

#### 3.6 Engine-bump behaviour

- Submit accepts only the live token version (`token.ts:289`). It also rejects a client `engineVersion` mismatch early (`handlers.ts:137-144`). A player mid-run when a new engine deploys therefore cannot submit that run, even though a retained bundle could replay it (`versions/index.ts:72-92`). This is a product choice. A grace window that accepts N-1 for 24 h through `replayAnyVersion` would remove the cliff.

---

### 4. Performance

#### 4.1 Measured latency (production, from this machine, client location unknown)

| Endpoint | TTFB n=8, warm | Notes |
|---|---|---|
| `/api/health` | 0.128 to 0.199 s | no DB |
| `/api/health?db=1` | 0.148 to 0.188 s (first call 0.906 s) | DB ping |
| `/api/leaderboard?mode=cup8&scope=all` | 0.151 to 0.172 s | 3 rows, 2,382 bytes |
| `...&coach=coached` | 0.151 to 0.211 s | coachedSql path |
| `...scope=daily&date=2026-10-17` | 0.143 to 0.235 s | |
| `/` | 0.178 s | `x-vercel-cache: HIT` |
| `/card?t=<pd6>` | **2.29 s MISS**, 0.177 s HIT | 270,830-byte PNG |
| `/r/<pd6>` | 0.356 s | |

Health without a DB costs about the same as the board. At today's data size (cup8 all-time has **3 rows**; kanto151 has 0, measured) the DB time is in the noise. Most of the warm TTFB is network and TLS plus function overhead (inferred).

Engine replay of a production pd6 token, locally on an Apple M4 Pro (measured): first 18.4 ms, warm median 4.3 ms (min 3.9, max 7.7, n=30). Replay is not a cost concern for submit.

#### 4.2 Caching

- `/api/leaderboard` GET is `no-store` (`handlers.ts:41`), and the client also fetches with `cache: "no-store"` (`src/components/leaderboard/client.ts:94`). Every view hits Neon and can wake it.
- `cacheComponents: true` (`next.config.ts:50`) is on, but no `'use cache'`/`cacheTag` covers board data. The leaderboard page is dynamic through `connection()` (`src/app/leaderboard/page.tsx:16`).
- Option: wrap `store.top` in `'use cache'` + `cacheTag(\`board:${mode}:${date ?? "all"}\`)` + `cacheLife("minutes")`. On a 201 submit, call `revalidateTag(tag, { expire: 0 })` (route handlers may call it per `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`). Honest verdict: **not worth it at 3 rows**. Do it only if the board grows or Neon wake-ups show up as user-visible latency.
- `/card` and OG: CDN-cached for a day (`card-images.ts:113`). The cold render is 2.3 s (measured). The cache key includes the full query, so `pack`, `mirror` or any junk parameter forces a fresh render. That unauthenticated CPU amplification is SE-05, partly mitigated by the cache. Fix: normalize the query (drop unknown params, redirect to the canonical URL) and add a per-IP limit on cache misses. A Vercel WAF rate-limit rule on `/card` is the cheapest option.
- `/creatures/*`: `public, max-age=86400, stale-while-revalidate=604800` (`next.config.ts:64-70`; measured on `0025.webp`, 11,878 bytes, webp). File names carry no hash, so `immutable` is not safe. A content-hashed path would allow a 1-year cache.

#### 4.3 Indexes vs queries

| Query | Index | Fit (read/inferred) |
|---|---|---|
| Daily top (`mode`, `daily_date`, ORDER wins/draws/score/created) | `leaderboard_entries_board_idx` (`schema.ts:38-45`) | Matches prefix and order. The tiebreak `asc(id)` (`store.ts:85`) is not in the index, so a small sort may be needed (inferred). |
| All-time top | `leaderboard_entries_alltime_idx` (`schema.ts:46-52`) | Same. |
| `coach=coached/uncoached` | none | `coachedSql` decodes every token in the mode before LIMIT, so it is O(rows) with base64 + JSON per row (`store.ts:60-68`). SE-11, still open, and made worse by coachedSql. |
| `rankOf` | partial | The OR-chain `aheadOf` (`store.ts:87-99`) counts across the mode. O(rows). |
| Token dedupe | `leaderboard_entries_token_uq` on `md5(token)` (`schema.ts:37`) | Queries use `md5(token) = md5($1) AND token = $1` (`store.ts:120,166`). Matches. |
| Daily nickname | `leaderboard_entries_daily_nickname_uq` (partial) | Matches `dailyTaken` (`store.ts:115-116`). |
| `ip_recent_idx` | unused | Dead (SE-09). |
| Rate limit | PK `(scope,key_hash)`, `rate_limit_events_lookup_idx` | Match. |

**Recommendation (P1-4):** store `coached boolean NOT NULL` at insert. `run.manager?.length > 0` is already known at `handlers.ts:245`. Backfill once with the existing `coachedSql`, then index `(mode, coached, wins desc, draws desc, team_score desc, created_at)`. That deletes the 15-line SQL CASE expression, the PG16 dependency and the parity test burden, and makes coach views index-ordered.

#### 4.4 Bundle and engine versions shipped to client

- Retained bundles are server-only (`import "server-only"` in `versions/index.ts:1`, `v5/index.ts:1`). `scripts/check-client-bundle.sh:6-14` enforces it after build, and CI runs it (`ci.yml:41`). (read)
- The proxy statically imports the live, v3 and v5 token codecs (`src/proxy.ts:2-4`). They use only type imports for data (`versions/v5/src/engine/types.ts:1-5`), so no Pokédex JSON enters the proxy (read). Each future wire-format change adds another codec there.
- Server chunk sizes from the local `.next` (built Oct 17 02:18; build commit unknown) (measured): v1/v2/v3 about 820 KB each, v4 828 KB, **v5 1,300 KB**. The v5 chunk is bigger because `next.config.ts:41` matches only `v[1234]` in the retained-JSON loader. v5's `pokedex.json` is byte-identical to `src/data/pokedex.json` (md5 `104ddab0…`, measured) but is bundled as its own copy (inferred from the regex and the size gap). Fix: change the regex to `v\d+`.
- Data duplication on disk (measured md5): **all six `pokedex.json` copies are identical**. `scouting.json` in v2, v3, v4 and v5 are identical to each other (`0fe818ed…`) but differ from v1 and current. The loader dedupes only against *current* `src/data`, so the four identical frozen scouting copies are each bundled separately (inferred).

#### 4.5 Cold starts

- Each retained version is a separate lazy chunk (`versions/index.ts:32-58`). An old `/r/pd3.*` link pays one ~0.8 MB module load on a cold instance (inferred). That is fine.
- The `/card` cold path loads satori, fonts and sharp, and reads PNGs from disk (`card-images.ts:19-33,37-80`). This is the 2.3 s measured above. Part of it is per-instance init (guess).

#### 4.6 Proxy on every request (still open, SE-07)

The matcher `/((?!_next/static|favicon.ico|robots.txt).*)` (`proxy.ts:66`) runs the proxy for every page, API call and **every `/creatures/*.webp`**, even with the gate off. A squad view loads 16+ creature images, so that is 16+ proxy invocations per view (inferred). Exclude `creatures/`, `api/health` and `api/csp-report` from the matcher when the images may be public (the owner decided this in the prior audit; still unchanged).

---

### 5. Maintainability

#### 5.1 Engine version vendoring: cost vs benefit

**Benefit.** Any share link or board token from engines 1 to 5 replays byte-identically forever. sha256 manifests (`versions/v5/MANIFEST.json`) plus `versions.test.ts` pin the frozen bundles. This directly protects "no fabricated data" and auditable evidence paths.

**Cost (measured).** `src/engine/versions` is 7.1 MB on disk. 6.0 MB of that is five 1.2 MB data directories, and every pokedex copy is byte-identical. Each engine bump adds another ~1.4 MB copy plus a full code copy for lint, typecheck and tests. The server bundle grows by ~0.8 to 1.3 MB per version (measured chunk sizes above).

**Verdict.** Keep the strategy. It is the honest way to keep old links truthful. Cut the cost.
1. Content-address the data: `src/engine/versions/_blobs/<sha256>.json`, with each MANIFEST pointing at a blob. A build lever (`scripts/engine/freeze-version.mts`) writes the copy and the manifest. This removes ~4.8 MB of duplicate JSON from the repo and the server bundle (inferred: 5 pokedex + 3 scouting duplicates at ~0.6 MB each).
2. Extend the loader regex to `v\d+` now (one-line fix for v5).
3. Retirement policy: a version can retire when no board row uses it and the owner accepts that its share links go to `/run-not-found`. Today the board has a `pd3` row (#1, measured), so v3 must stay. An alternative for board rows only: persist the replayed `CupResult` JSON at submit. Share links still need the engine, so this does not retire versions by itself.

#### 5.2 Test suite runtime

**Measured, local M4 Pro:** `pnpm vitest run` gave 144 files and 1,313 tests, 1,313 passed, 0 failed, 25.2 s wall (169 s user). The slowest files were `engine/cup.test.ts` 17.8 s, `engine/fairness.test.ts` 15.6 s, `leaderboard/server/handlers.test.ts` 15.5 s and `components/builder/Builder.test.tsx` 15.3 s. The backend subset (`src/leaderboard src/ratelimit src/gate src/db src/app/api src/engine/versions`) gave 17 files, 147 tests, all passed in 10.4 s. PGlite boot dominates the handler and limiter suites (inferred from file times of about 5 s each). A shared PGlite instance per worker with a `TRUNCATE` between tests would cut that (guess).

#### 5.3 CI

- `ci.yml` runs mirrors, image seam, packs, theme checks, lint, typecheck, unit tests, build, client-bundle check, data rebuild with zero diff, and move citations. e2e builds again and runs Playwright for chromium and webkit (`ci.yml:17-71`). That is thorough. (read)
- Gaps (read):
  - `format:check` is not in CI, although STATE reports it locally.
  - No `timeout-minutes` on either job. `theme-measurement.yml` has one (`:25`).
  - Actions in `ci.yml` are pinned by **tag** (`@v7`), but `theme-measurement.yml` pins by SHA. Inconsistent supply-chain posture.
  - Node 22 in CI, while production Node is unknown here. The prior audit said 24 (SE-20; still open per `ci.yml:24,59`).
  - No real-Postgres migration job. A Neon branch per PR, or a `postgres:16` service container running `db:migrate` + `db:rollback` + `db:smoke`, would close SE-08.
  - The e2e job runs `pnpm build` again instead of reusing the check job's build artifact (about +1 build per PR, inferred).
- No `pnpm audit` / Dependabot / Renovate config found (`ls .github` showed only workflows; read).

#### 5.4 Dead code and dead weight

- `leaderboard_entries.ip_hash` and `leaderboard_entries_ip_recent_idx`: written, never read (SE-09).
- `rate_limit_events`: written every admission, read only to seed a new bucket (`ratelimit/store.ts:51-57,63-66`). Either drop it in a migration or document it as the audit log it is.
- `LeaderboardStore.dailyTaken` (`store.ts:33,170-178`) is not called by `handlers.ts`. Admission computes it in SQL instead. It may still be used by tests; I did not grep the tests (inferred dead in production paths).
- `coachedSqlFor` plus the PGlite parity test become deletable once `coached` is a column (P1-4).

---

### 6. Prioritized improvements

Effort is S (<half day), M (1 to 2 days) or L (multi-day). Tier follows the repo's risk tiers.

#### P0
None. No exploitable hole puts data or users at real risk at friend-group scale.

#### P1

**P1-1. Fix the `safeNext` open redirect (S, Red).** Add `if (url.pathname.startsWith("//")) return "/";` after `passcode.ts:47`. Write the RED test first with the literal inputs `"/..//evil.com"`, `"/.//evil.com"` and `"/%2e%2e//evil.com"`, expecting `"/"`. Also wrap `req.formData()` in `unlock.ts:30` so a bad body returns a 303 with an error (SE-13).

**P1-2. Close the coached-run copy bypass, C4 (S to M, Red).** Server-only option, no engine change: a migration adds `run_fingerprint text` = sha256 of `mode | seed | canonical squad order | wins-draws-losses | team_score | goals timeline`. Make it unique per `(mode, daily_date)`, return `DUPLICATE_TOKEN` on conflict, and backfill by replaying the existing rows (3 today). Engine option: reject a no-op tactic in `applyManager` (`match.ts:559-571`). That is a token-semantics change and needs goldens plus a version bump. Prefer the server option.

**P1-3. Uptime and alerting for free (S, Green or Yellow).** Add a GitHub Actions `schedule: cron: "*/30 * * * *"` job that does `curl -fsS https://pokedraft-woad.vercel.app/api/health?db=1`, checks `.db.status == "ok"`, and checks that `.sha` equals `git ls-remote origin main`. On failure it opens or updates an issue with `gh issue`. That catches DB outages, bad env and a stuck deploy. The repo is public, so minutes are free (`pokedraft-overrides.md` CI section).

**P1-4. Store `coached` as a column (M, Red).** See §4.3. Insert computes it from the decoded run. The backfill uses the current `coachedSql` once. The new index covers coach views. Delete `coachedSqlFor` and its parity test afterwards. Migration plus down file per house style.

**P1-5. Enforce the CSP (S, Yellow).** Rename the header key in `next.config.ts:30` after one look at the csp-report lines (could not check; NOT RUN). Keep `'unsafe-inline'` for now.

**P1-6. Neon request timeout (S, Red).** `neon(url, { fetchOptions: { signal: AbortSignal.timeout(4000) } })` or a per-call wrapper in `db/client.ts`, so a hung DB turns into a fast 503 instead of a function timeout (SE-18).

**P1-7. IPv6 /64 keying (S, Red).** In `clientIp` or `hashIp`, normalize IPv6 to its first 4 hextets before the HMAC (SE-12). Add a test with two addresses in one /64 that share a bucket.

#### P2

**P2-1. Friend accounts without passwords (M to L, Red).** This fixes C3 and enables C2 fixes.
- Data shape: `players(id uuid, handle text unique, created_at)`, `player_keys(player_id, public_key_jwk, created_at, revoked_at)`.
- Flow: on the first visit the browser generates a non-extractable WebCrypto ECDSA P-256 key pair and stores it in IndexedDB. Claiming a handle posts the public key plus a one-time invite code that a friend shares in the group chat. Each submit signs `sha256(token | nickname | server-issued nonce)`. The server verifies the signature and binds the nickname to the key. Adding a device uses a QR "link device" code, signed by an existing key.
- Gains: no passwords or email, handles cannot be squatted, and per-player limits replace per-IP limits.
- Passkeys (WebAuthn) are the polished version of the same idea. They need a resident credential plus a small library such as `@simplewebauthn/server` (guess: not vetted for Next 16).

**P2-2. Server-committed daily attempts, fixing C2 (M, Red, needs P2-1).** `POST /api/daily/start` records `(player_id, date, started_at)` and returns the seed. Only the first started run per player and day is ranked. Later runs are friendlies. Pair it with an HMAC'd daily seed, `HMAC(DAILY_SEED_SECRET, date)`, served by that endpoint, so tomorrow's daily cannot be pre-solved. That is a seed derivation change: it touches `src/engine/rng.ts:142-144` and the goldens, and must keep old dailies replayable.

**P2-3. Ranked seeds for the all-time board, fixing C1 (M, Red).** Serve signed seed tickets: `seed = base64url(nonce) + "." + HMAC(secret, nonce)`. `handleSubmit` accepts a non-daily ranked run only if the HMAC verifies and the nonce was issued fewer than N days ago. Free-seed runs remain playable and shareable but go to an "open seeds" board. Store `seed_kind` per row.

**P2-4. Cron daily cup with a recap (M, Yellow or Red).**
- A Vercel Cron (one daily job, Hobby allows it; guess, verify the current Hobby cron limits) calls `GET /api/cron/daily-close` at 00:05 New York time. Verify `Authorization: Bearer ${CRON_SECRET}`.
- It snapshots yesterday's daily top 10 into `daily_results(date, rank, nickname, token, …)`, which freezes it. It also computes "Champion of the day" and streaks.
- An optional webhook post (Discord or WhatsApp) to the friend group carries the `/card` image of the winner.
- This also gives a natural place for retention jobs (events pruning, old preview rows).

**P2-5. Live watch parties (L, Yellow).** Matches are deterministic replays, so live sync needs **no game server**. It only needs a shared clock.
- `POST /api/party` creates `{party_id, token, start_at}` in Postgres.
- Viewers open `/party/<id>`, fetch the token and start time, and render `Broadcast` at `now - start_at` with the existing timeline (`src/ui/matchday/timeline.ts`).
- Reactions and chat go over a cheap channel: SSE from a route handler polling Postgres every 2 s, or Neon's realtime offering if adopted (guess; the Neon MCP lists `enable_realtime`, unverified).
- No new trust surface: the server never computes the match, it just stores the token and start time.

**P2-6. Board caching with tag revalidation (S to M, Red).** As in §4.2. Only when traffic justifies it.

**P2-7. Content-addressed engine data and loader fix (S for the regex, M for blobs, Red).** As in §5.1.

**P2-8. Proxy matcher trim (S, Red).** Exclude `creatures/`, `api/health` and `api/csp-report`. That needs an owner OK that pictures are public (SE-07).

**P2-9. `/card` hardening (S, Red).** Canonicalize the query (only `t|b`, `pack` in the allowlist, `mirror` in `0|1`) and 308 to the canonical URL, so the CDN cache key is stable. Add a Vercel WAF rate-limit rule on `/card` and `/r/*/opengraph-image` misses (SE-05).

**P2-10. CI polish (S, Green).** Add `format:check`, `timeout-minutes: 30`, SHA-pinned actions in `ci.yml`, a Node version matching production, Dependabot for actions and npm, and a `postgres:16` service job running `db:migrate → db:smoke → db:rollback ×4 → db:migrate`.

**P2-11. Remove dead weight (S, Red).** A migration drops `leaderboard_entries_ip_recent_idx`. Decide whether `ip_hash` on entries and `rate_limit_events` stay as audit evidence (document it) or go.

**P2-12. Engine-bump grace window (M, Red).** Accept N-1 token versions for 24 h after a deploy through `replayAnyVersion`, store the real `engine_version`, and filter or label the board per engine (C5).

**P2-13. Guard destructive rollback (S, Red).** `rollback.mts` refuses `0000` unless `--drop-data` is passed and prints the row count first.

---

### 7. NOT RUN

- Any POST to production. Submit, gate unlock and CSP report were not probed live, by brief.
- Vercel runtime logs and errors: the MCP returned 403 and 404 for `prj_GfNWnE8gbjY2YXOPOWszq7vxGOnL` under team `pnascimento9596s-projects`. CSP report volume and production error clusters are unknown.
- The Neon MCP (compute state, slow queries, PG version) was not queried.
- `pnpm lint`, `typecheck`, `build`, `check:client-bundle` and Playwright were not run. Bundle sizes come from an existing local `.next` whose build commit is unknown.
- The `safeNext` open redirect was reproduced with a node copy of the function, not by calling the repo module or production.
- C4 was proven against the local engine only. I did not submit the copied token to production.
- A `/card` cache-key amplification test with junk query params was not run, to avoid load.
- No browser was opened, per the coordinator's rule. Only curl GETs and local scripts.

Local measurements:
- `pnpm vitest run` gave 1,313 of 1,313 passing in 144 files, 25.2 s wall.
- The backend subset gave 147 of 147 passing in 17 files, 10.4 s.
- Replay timing: `scratchpad/replay-time.mts`.
- No-op copy proof: `scratchpad/noop-copy.mts`.
- Production board snapshots: `scratchpad/board-*.json`.
- Vitest JSON: `scratchpad/vitest.json`.


# Appendix E. Engine and gameplay

## pokedraft engine and gameplay audit

Read-only audit at `40f3c92` (main, clean tree before and after). Engine `pokedraft-engine-6`, token `pd6`.
Every number tagged **measured** came from a run in this session. **Inferred** means read from code.
**Guess** means a design judgment with no measurement behind it.

### 0. Gates and probes run

- `pnpm vitest run src/engine`: 23 files, 273 tests passed (measured, 11.8 s).
- `pnpm calibrate`: NOT RUN. The probes below hit the same engine more directly.
- Custom probe `scratchpad/probe.mts` (outside the repo). It reuses `scripts/calibration/bots.ts` and calls `runCup` from `src/engine/cup.ts`. It has four modes:
  - `manager`. 400 squads per bot, 4-3-3, cup8 classic3. Each played match of the auto-coached cup is replayed under each of the 5 tactics, fixed at minute 0.
  - `luck`. 150 squads per bot, each replayed over 40 fresh seeds. A new seed means a new ladder and new matches with the lineup held fixed.
  - `upsets`. 600 squads per bot (random, good, oracle). Outcomes are bucketed by Team Score minus the opponent ladder score.
  - `formations`. 400 squads per formation for the good and oracle bots.
- Browser: none used, per the coordinator's rule. All UI claims below come from reading code.

### 1. How a match is simulated

#### 1.1 Team strength (before kickoff)

- **Species quality.** `quality[role]` is the species' percentile rank of `fit[role]` among all 1,025 species (`src/engine/species.ts:20-44`). Fit is a role-weighted attribute blend times familiarity with the role (`src/scouting/fit.ts:39-47`). Attributes come from PokéAPI base stats through population percentiles (`src/scouting/attributes.ts`, `src/scouting/coefficients.ts:47-60`), plus the Layer 2 per-species review (`src/scouting/review/gen-*.json`). Sampled entry: Pikachu has `bestRoles [W, ST, AM]`, cited strengths and weaknesses, and a rationale that cites base stats.
- **Team Score.** `rateTeam` blends line-weighted quality (GK .12, DEF .30, MID .30, ATT .28), a drag from the 3 weakest slots, adjacency synergy, and bench quality: `0.8*(core-drag) + 0.12*synergy + 0.08*bench`. A convex-ish curve then maps it to 0..1000 (`src/engine/team.ts:45-108`, coefficients `src/engine/coefficients.ts:92-108`).
- **Synergy.** Each formation adjacency edge scores shared type, same evo line, same gen, or type "coverage" (`team.ts:32-39`, `type-chart.ts:27-31`). **This is the only place Pokémon types touch the engine.** There are no type matchups in the match itself.
- **Match lines.** `matchLines` centres all four lines on `score/10`, then adds back half of each line's deviation (`team.ts:110-119`, `match.shape = 0.5`). Synergy, drag and bench therefore lift every line equally.
- **Opponents.** A Boss Club's strength is a ladder number, not its roster. Lines are `score/10 + tilt(±5)`, reshaped by up to ±3 from roster fit (`opponent-schedule.ts:67-90`, `opponents.ts:95-143`). The ladder is G1 280 up to F 985, with ±20 jitter (`coefficients.ts:162-166`). The roster is a single-type themed eleven in 4-3-3 (`opponents.ts:51-70`). It decides who scores, the keeper on saves, shootout takers and keeper, and `tacticalStyle`. It never decides team strength. The 4-3-3 boss formation is fixed.

#### 1.2 Goal rate

`expectedGoals` (`match.ts:95-105`):

- `λ = clamp(1.1 + 5*(ATT_att − (0.7*DEF_def + 0.3*GK_def))/100, 0.1, 5)`.
- That is multiplied by midfield control `clamp(1 + (MID_att − MID_def)/100, 0.85, 1.15)`.
- So 10 line points (about 100 Team Score points) is roughly ±0.5 goals. Midfield saturates at ±15 points (inferred).

Per match, a single dispersion draw `ε` multiplies **both** sides' λ (`match.ts:107-113, 465`):

- Group: 14% ×0.8, 14% ×1.2, else ×1.
- Knockout: 20% ×0.7, 20% ×1.3.

`ε` scales tempo (total goals), not who is favoured. `knockoutFactor` is 1, so phase only changes dispersion.

Within a window, a side's rate is `λ * ε * base * tacticOwn * tacticGives * vacancy^k` (`match.ts:648-658`). Fatigue scales each line by `0.8 + 0.2*energy/100` (`match.ts:294-307`).

#### 1.3 Time model (engine 6)

- 90 minutes are 18 windows of 5 minutes (`match.ts:829-838`). Extra time is 6 more windows.
- Each side gets 50 Bernoulli "chance trials" per regulation (17 in extra time), spread evenly over the windows (`windowChances`, `match.ts:243-245`). Each trial falls at a random minute inside its window (`match.ts:751-756`). `P(goal) = min(rate/50, 0.6)`.
- So goals are binomial(50, λ/50), close to Poisson(λ). **A trial is not a shot** (comment at `match.ts:147-151`).
- Each window also rolls one injury/card hazard item per slot per side (22 items) at a random minute (`match.ts:757-772`). Items are sorted by minute and resolved in order.
- At every window boundary (`boundary`, `match.ts:605-646`) these run in order:
  1. Manager decisions apply.
  2. The auto coach runs if the user has made no decision. It defends a lead from 75'. It attacks when behind from 60', or when 2 down from 45' (`match.ts:259-264`). It makes fatigue subs at 60'/75' when energy is below 82.
  3. The opponent "rotates" by resetting its most tired player's energy to 100. It has no bench (`match.ts:632-640`).
  4. The opponent's auto tactic runs.
- Energy drains `0.3*(1.4 − STA/100)` per minute, ×1.4 while pressing (`match.ts:309-317`).
- Injuries hit the **user side only** (`match.ts:668-700`). Cards hit both sides. Second yellows are damped by `bookedCaution` 0.25 (`match.ts:701-730`).

#### 1.4 Event content per trial

- **Goal** (`match.ts:790-793`, `goalEvent` `344-386`).
  - Kind comes from a fixed roll, independent of team: 6% penalty, then of the rest 12% header, 8% free kick, 18% solo, 62% open play.
  - The scorer is drawn by an attribute blend for that kind, times `roleFactor` (ST 1 down to CB .08).
  - A penalty always goes to the highest-SHO player and **always scores**. Missed penalties do not exist.
  - An assist happens with probability 0.62, on open play and headers only.
- **Non-goal trial** (`match.ts:794-814`). On a per-side `save_events` substream, a shooter is drawn, then a save with probability `0.15 * clamp(0.35 + (handling − SHO)/250, .1, .7)`. Saves are **cosmetic labels**. They never prevent a goal (`docs/decisions/opponent-completion.md`, "What a recorded save means").
- **Shootout** (`match.ts:407-456`). Takers go in SHO order. Conversion is `0.75 ± 0.10` from `0.75*SHO + 0.25*TEC − mean(keeper GK attrs)`. Sudden death is capped at 200, then a coin decides.
- **Extra time** (`match.ts:844-862`). The rate is `extraTimeFraction (1/3) * staminaFactor (0.9..1.1)` of each side's on-pitch eleven.

#### 1.5 Output contract

`MatchResult` (`types.ts:394-420`) carries regulation, ET and shootout scores, goals `{minute, kind, scorer, assist, penalty}`, saves `{minute, attacker, keeper}`, incidents (injury, sub, yellow, red, tactic), and 5-minute `WindowSnapshot`s `{score, tactics, user energy, user onPitch}`. It does not carry possession, shots, xG, zones, ball position, the opponent's energy or the opponent's lineup over time.

### 2. Gameplay depth (measured)

#### 2.1 Draft skill vs luck

| bot (150 squads × 40 seeds) | mean wins /8 | champion | group exit | SD within squad | SD between squads | squad share of variance |
| --- | --- | --- | --- | --- | --- | --- |
| random | 3.24 | 0.0% | 3.6% | 0.97 | 0.76 | **37.9%** |
| good | 5.89 | 2.8% | 0% | 0.94 | 0.34 | **11.3%** |
| oracle | 6.29 | 8.3% | 0% | 0.94 | 0.26 | **7.2%** |

What this means:

- Drafting competently matters a lot. Random to good is +2.6 wins (measured).
- **Among competent drafters, the cup is mostly luck.** Seed-to-seed spread for one fixed squad (SD about 0.94 wins) is about three times the spread between good squads (SD 0.34). Squad choice explains about 7 to 11% of the variance in wins.
- Champion rates are low even for the oracle (8.3%). This matches the v4 calibration targets (`docs/reports/engine-v4-calibration.md`: 950 Team Score gives 30% flawless). The ladder rises to 985, so a near-perfect score is needed to be a favourite in the final.
- For a daily leaderboard sorted by wins, a good-vs-great draft is decided by luck most of the time (inferred from the variance split).

#### 2.2 Upsets and the win curve

Measured over 600 squads × 3 bots, all played matches, bucketed by user score minus opponent score:

| gap | n | win | not win |
| --- | --- | --- | --- |
| −200 | 272 | 10.7% | 89.3% |
| −100 | 817 | 27.3% | 72.7% |
| 0 | 1,350 | 51.9% | 48.1% |
| +100 | 1,646 | 81.3% | 18.7% |
| +200 | 1,633 | 90.9% | 9.1% |
| +300 | 1,255 | 96.1% | 3.9% |
| +500 | 1,885 | 97.5% | 2.5% |

Group and knockout matches are mixed here. The v4 win-curve table splits them (group W at gap 0 is 0.351, D 0.299).

- Upsets are healthy in the 0 to ±150 band. Results beyond +300 are near-certain.
- **Knockouts.** Measured on 6,017 knockout matches: 18.5% go to extra time and 9.8% to penalties. The user wins **49.4%** of shootouts, so a shootout is effectively a coin flip. Keeper and taker attributes move conversion by at most ±10 points (`coefficients.ts:159`). No match reached the coin decider.

#### 2.3 Formations and types

Formations are balanced (measured, 400 squads each):

- Good bot: mean wins 5.76 (3-4-2-1) to 6.00 (4-1-4-1).
- Oracle: 6.22 (4-4-2) to 6.32 (5-3-2).
- No dominant formation. Differences are within about 0.25 wins. A standard-error check at n=400 was NOT RUN. Champion-rate differences are noisy at these counts.

There is no degenerate type build, because types only feed synergy (12% weight, capped). The other side of that is that type identity carries almost no gameplay weight, which is the biggest missed flavour lever (inferred). Opponent themes ("all Fire") are cosmetic in the match.

#### 2.4 How much manager decisions move win probability

Measured: each match replayed with one fixed kickoff tactic.

| | good: win / draw / loss | random: win / draw / loss |
| --- | --- | --- |
| auto coach (no decisions) | **.848** / .010 / .142 | **.682** / .093 / .225 |
| balanced (managed) | .840 / .010 / .150 | .629 / .108 / .262 |
| attack | **.853** / .003 / .144 | .654 / .076 / .270 |
| defend | .802 / .037 / .161 | .571 / .174 / .255 |
| press | .844 / .007 / .149 | .639 / .101 / .261 |
| counter | .839 / .014 / .147 | .635 / .109 / .255 |
| "style rule" (counter vs pressing, press vs possession) | .846 | .645 |
| ex-post best of all six (upper bound) | .886 | .741 |
| matches whose result any choice flips | 11.8% | 26.0% |

Findings:

1. **A single decision is a trap.** Any manager action sets `managed = true` for the rest of the match. That switches off the auto coach's late defend/attack and its fatigue subs (`match.ts:607-629`). A coach who picks "balanced" at kickoff and then does nothing loses 0.8 points of win rate (good squads) and **5.3 points** (random squads) against leaving it alone. Most of that is the lost fatigue subs and reactive tactics (inferred from which mechanisms the flag disables).
2. **The style edges barely bite.** Picking the "designed" counter (`styleEdges`, `coefficients.ts:177-184`) scores .846 against auto .848. In code, `press` vs a possession side is `[1.18, .98]` and `counter` vs pressing is `[.95, .85]`. Both are strictly favourable ratios, but at about 15% stronger they move a strong favourite's win probability only marginally (measured above).
3. **"Attack" from kickoff is the best fixed tactic** for good squads (.853). Draws convert to wins, and in knockouts a draw leads to ET or penalties anyway. `defend` is strictly worst. No tactic is a meaningful dominant strategy, but there is also no interesting tactic decision (inferred).
4. **The ceiling is real but invisible.** Perfect hindsight is worth +3.8 points (good) or +5.9 points (random) per match. Earlier measurement with kickoff+HT pairs gave about +0.5 wins per cup (`docs/decisions/engine-6-manager.md`). Live coaching without hindsight gains about nothing over the assistant today.
5. **Replay exploit.** The touchline replays the cup deterministically (`src/ui/manager/touchline.ts:244-271`), so a player can scrub and retry. The engine keeps the past fixed (`match.ts:197-202`), but the future is fully deterministic given the token, so locally replaying to an outcome is the "replaying coach" upper bound. The leaderboard marks coached runs instead of preventing this (engine-6-manager.md). Since that report measured +0.44 wins for the good bot, the coached board flag is load-bearing.

### 3. Event richness for the Live match visualizer

**Simulated** (engine truth, `MatchResult`):

- goal minutes, scorer, assist, kind (header, solo, free-kick, open-play, penalty)
- saves (minute, shooter, keeper; cosmetic but recorded)
- cards, injuries, subs, tactic changes
- 5-minute snapshots of score, tactics, user energy and user lineup
- shootout kick sequence

**Invented by the UI** (`src/ui/matchday/timeline.ts`):

- **All open play.** `buildTimeline` makes 1.25-minute "plays" from its own `createRng("broadcast:<seed>:<match>:plays")` (`timeline.ts:382-490`). That covers the possession side, holding probability (.68 / .38), pass, dribble, through-ball, cross and duel kinds, from and to slots, runners, the presser and ability callouts.
- **Possession tilt.** `frame.ball` is reconstructed from goals and saves in each 5-minute window: `(u−o)/(u+o+1)` (`timeline.ts:361-379`). It is not engine possession. A side that dominates λ but does not score or force saves looks even.
- **Tactic line height.** It is a UI table (`TACTIC_LINE`, `timeline.ts:158-164`).
- **Shot origin, flight and keeper dives** are staged geometry (`stagePitch`, `timeline.ts:751+`). For saves, the attacker is real but the location is not.
- **Opponent fatigue, subs and lineup changes** are absent, because the engine does not export them. Opponent "rotation" only resets energy silently (`match.ts:632-640`).

The broadcast is consistent with the engine at the moments that matter (goal and save minutes force the possession side and the target slot, `timeline.ts:400-446`). Everything between those moments is decorative and blind to strength. A 950 squad and a 450 squad get statistically identical possession, apart from the goal and save anchors (inferred from the generator).

**Engine events that would unlock better animation**, cheapest first:

| event | source in the engine today | animation unlocked |
| --- | --- | --- |
| `chance` per trial: `{minute, side, p, outcome: goal / saved / off / blocked, shooter}` | the trial loop already computes `p` and `outcome` (`match.ts:785-814`) | real xG per shot, an xG race chart, near-miss beats, a "should have won" recap |
| per-window `territory` / `possession` share | derivable from the λ ratio and MID control (`expectedGoals`) | a possession bar and ball-tilt bias driven by strength, not by goals |
| `zone` per chance (left / centre / right, box / outside) from the scorer's role and goal kind | role is known at `pickScorer` | shots from plausible places, wing crosses for headers |
| opponent energy and rotation incident | `opp.onPitch` energy exists (`match.ts:483-490`) | an opponent tiredness HUD and visible rotations |

**Cost:**

- Any new field in `MatchResult`, or any new draw on an existing substream, changes the byte-pinned run digest (`goldens.test.ts:121-140`). That is a Red-tier engine change and needs `ENGINE_VERSION` 7, `RUN_TOKEN_VERSION` 7, a frozen v6 bundle under `src/engine/versions/v6` with a MANIFEST like v5, a `RETAINED[6]` adapter (`versions/index.ts:32-58`), new goldens, and recalibration if outcomes move.
- The cheaper precedent is engine 5 (`opponent-completion.md`). Saves were added on a **new named substream** so no scoring draw moved, and parity with v4 was proven over 1,000 runs. A `chance` or territory export can follow the same pattern. Outcomes stay identical and only the result shape grows, but the version bump and the freeze still apply because the run JSON digest changes.
- **A zero-version alternative (recommended for the visualizer).** Add a pure, deterministic `matchStory(seed, matchIndex, input)` in `src/engine` that re-runs the window loop and *returns* per-trial `p`, outcome and zone without being part of `CupResult`. The UI calls it for Live match only. Goldens and the token stay untouched, because the cup result bytes do not change. The risk is drift between `matchStory` and `simulateMatch`. The guard is to have `simulateMatch` call the same core and add a test that the scores from the story equal `MatchResult`. That refactor still touches `match.ts`, so the goldens must stay byte-identical, which proves it (inferred design, untested).

### 4. Determinism and versioning constraints

- **Randomness.** Randomness comes only from `src/engine/rng.ts`: cyrb128 + sfc32, named substreams in `SUBSTREAMS` (`rng.ts:56-69`), and `deriveSubseed(seed, name, scope)` (`rng.ts:78-94`). Adding a substream name does not shift other streams. Changing the draw count on an existing scope does. ESLint bans `Math.random`, `Date`, `Math.exp/log/pow` and `localeCompare` in `src/engine` (CLAUDE.md). Any new probability curve must avoid `exp` and `log`; the existing `clamp`-linear forms show the house style.
- **Windowed causality.** Every window derives its own `match_timing`, `match_sim`, `event_gen`, `save_events` and `match_incidents` streams from `match:<i>:w<k>` (`match.ts:740-748`). The `struct` draw count per window is fixed. That is what lets a touchline decision at minute m leave everything at or before m unchanged (`match.ts:197-202`). New mechanics must keep this: draw a fixed count per window, or use a new per-window substream.
- **Goldens.** `goldens.test.ts` pins `ENGINE_VERSION`, outcomes, Team Scores of a 20-run panel, and **SHA-256 of two full runs and tokens** (`:121-140`). Any change to coefficients, the result shape, Team Score or draw order fails these on purpose.
- **Retained engines.** pd1 to pd5 replay through frozen bundles (`versions/index.ts:32-58`). An engine 7 needs `versions/v6` frozen with a source-hash MANIFEST (see `versions/v5/MANIFEST.json`) and a `versions.test.ts` digest, plus proxy and Challenge link checks reading `RETAINED_TOKEN_VERSIONS` (engine-6-manager.md, "Retained links").
- **Data coupling.** `scouting.json` and `pokedex.json` feed quality, so a data change is an engine change for Team Score. It needs a regenerated artifact plus golden updates in the same PR (CLAUDE.md).
- **Leaderboard.** Boards do not filter by engine version (opponent-completion.md). An engine 7 that changes difficulty would mix incomparable runs on the daily board unless the board splits by version (inferred risk).

### 5. Prioritized improvements

#### P0

**P0-1. Stop one decision from firing the assistant** (effort S, Red: engine 7).

- Problem: one tap costs a weak squad 5 points of win rate (measured, §2.4). This is a punishing, invisible rule.
- Sketch: split the `managed` flag (`match.ts:513, 561, 609`) into `tacticManaged` and `subsManaged`. Keep auto fatigue subs until the user makes a sub. Keep auto late tactics until the user sets a tactic *after* 45'. Or expose an "assistant on/off" toggle the user sees.
- Bundle it with any other engine 7 work. Coached-run calibration changes, so rerun `engine6-compare.mts`.

**P0-2. Make tactics a real decision** (effort M, Red, same engine bump).

- Problem: the style edges are too small to matter (measured .846 vs .848).
- Sketch:
  - Make edges asymmetric and larger (about 25 to 35%) so a correct read beats auto by about 3 to 5 points.
  - Make the wrong read cost something. For example, `press` vs direct gives `[1.0, 1.25]`.
  - Add state-dependent value: `counter` is stronger when leading, `press` decays with energy.
- Calibration: pin "best informed choice beats auto by 3 to 6 points, ex-post oracle by no more than 10".
- Without this, manager mode is a sub-management mode wearing a tactics UI (guess).

**P0-3. Visualizer truth without a version bump** (effort M, Yellow/Red boundary).

- Add the `matchStory` derivation from §3. It provides per-trial `p`, outcome (goal / saved / off-target) and a zone derived from role and kind, plus per-window territory from the λ ratio. The UI possession generator (`timeline.ts:401-410`) then biases by real territory instead of goals and saves.
- The goldens prove that no outcome moved.
- Payoff: the Live match finally *looks* like the stronger team is stronger. It also enables an xG timeline and a "deserved to win" recap, which helps the luck-heavy cup feel fair.

#### P1

**P1-1. Type matchups on the pitch** (effort M, Red).

- Today types touch only synergy (`team.ts:37`).
- Sketch: per match, compute `typeEdge = mean over user ATT-line starters of covers(attacker, oppTheme) − mean over opp ATT of covers(oppAttacker, user DEF types)`, using `superEffective` (`type-chart.ts:23-25`). Then scale the own rate by `1 + 0.06*edge`, capped at ±8%.
- Opponents are single-type themed (`opponents.ts:57`) and the theme is shown pre-match, so this creates a **draft-time counter-pick puzzle**: "the final is a Water club, draft Electric attackers". That raises the draft-skill share of variance (§2.1), which is the main design gap.
- Needs a ladder reveal before the draft or at the knockout stage (product call).

**P1-2. Reduce cup noise for competent drafters** (effort S, Red).

- Problem: squad identity explains 7 to 11% of win variance among good drafters (measured).
- Levers:
  - Lower `dispersion.knockout.amplitude` (0.3 to 0.2).
  - Raise `chances` so binomial variance shrinks. This keeps λ but makes it less Poisson-like (wrong direction; skip).
  - Best: make shootouts skill-weighted. Widen `shootout.band` 0.10 to 0.18 and let a "set-piece specialist" taker be chosen. Shootouts are currently 49.4% user wins, a pure coin (measured).
- Each needs the 90k-cup recalibration (`scripts/calibrate.mts`), because the ladder is tuned to the flawless targets.

**P1-3. Set-piece specialists and missed penalties** (effort S, Red).

- Penalties always score, and the taker is fixed by max SHO (`match.ts:352-364`).
- Sketch: draw penalty conversion with `convertProb(penaltyEdge(taker, keeper))`, reusing the shootout function. Let the user nominate a penalty and free-kick taker in the draft or lineup (a token field). Free kicks already weight TEC (`match.ts:335-336`). Give a nominated taker a ×1.5 weight on free-kick goals.
- This makes drafting one TEC/SHO specialist a decision.

**P1-4. Opponent parity in incidents** (effort S, Red).

- Opponents never get injured (`match.ts:668`) and rotate invisibly (`:632-640`).
- Emit an `opp-rotate` incident and allow opponent injuries with a ladder-quality replacement. The UI gets visible opponent subs, and the "user-only injuries" asymmetry goes away.

**P1-5. Goal-kind from attributes** (effort S, Red).

- The kind roll is team-independent (`match.ts:352-361`). Weight `header` share by the team's mean AER of attackers and `solo` by DRI/ACC.
- A team of tall flyers then *plays* differently, and the broadcast inherits real crosses vs dribbles.

#### P2

**P2-1. Chemistry and morale** (effort M, Red).

- Morale is a per-match side multiplier, ±5%, from the previous result and a comeback state.
- It must be deterministic from prior matches in the same cup, which it is, since `runCup` plays in order (`cup.ts:266-316`).
- Chemistry is evo-line or same-gen adjacency, already scored, also shown as a pre-match "link" visual.

**P2-2. Player form** (effort S/M, Red).

- A per-match seeded form roll per player (new substream `player_form`) of ±4 quality points, displayed pre-match.
- It adds rotation decisions to bench usage. Bench currently matters only for absences and subs, and makes up 8% of Team Score.

**P2-3. Weather and stadium by opponent region** (effort S, Red).

- Region-themed conditions such as rain (+headers, −DRI) or a sandstorm (Ground and Rock immune) as small multipliers.
- Club regions already exist as presentation (`src/ui/club-identity.ts`, per opponent-completion.md). Purely flavourful, and cheap once P1-1's type hooks exist.

**P2-4. Season or league mode** (effort L, Red plus new token schema).

- Multiple cups with a persistent squad, fatigue and form carrying over, and a transfer window using rerolls.
- This needs a new token shape and a new board. It is the biggest replay-value lever, but it is out of scope until the core match decisions matter (guess).

**P2-5. In-match tactical "moves"** (effort M, Red).

- Map canon moves (the UI already has `moves.ts` callouts) to a one-shot per match "signature move" the manager can trigger in a window: +X% rate for one window, an energy cost.
- It gives the touchline a high-agency, Pokémon-flavoured decision. It must be a token action with a fixed per-window draw count to keep causality (§4).

#### Sequencing recommendation

Bundle P0-1 + P0-2 + P1-3 + P1-4 into one **engine 7** dispatch. That is one freeze of v6, one recalibration and one set of goldens. Ship P0-3 (`matchStory`) first and independently, since it needs no version bump and de-risks the visualizer now. P1-1 (type matchups) is the highest-leverage *design* change for draft skill. Prototype it in a scratch calibration harness and measure squad share of variance against today's 11% before committing.

### NOT RUN

- `pnpm calibrate`, the full 90k-cup sweep, and kanto151 or builder probes.
- Standard errors and confidence intervals on the formation and manager tables.
- Half-time or reactive coach strategies. Only fixed kickoff tactics were measured; engine-6-manager.md covers kickoff+HT pairs.
- Browser verification of any visualizer claim, which is code-read only per the coordinator's no-browser rule.
- Any lint, typecheck or build; nothing in the repo was changed.
