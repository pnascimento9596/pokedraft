# pokedraft Platform Improvement Program: Closing Report

Program closing report comparing every finding from Audit A (`pokedraft-audit-2026-10-17.md`) and Audit G (`pokedraft-deep-audit-2026-10-17.md`) against its resolving PR and verification evidence, as required by the program brief (section 7).

## 1. Executive Summary

- Program scope: Seven waves of platform, engine, UX, mobile, performance, and security dispatches executed between 2026-10-17 and 2026-10-22.
- Completion rate: 100% of planned rows merged across 105+ PRs, culminating in Wave 7 (PRs #159 to #176).
- Final production state: Commit `8e071295` running live engine `pokedraft-engine-8`, token versions 1 to 8, with Content-Security-Policy enforced, species chunk split active, and database integrity verified.
- Status of findings:
  - Fixed: 62 findings across engine, gameplay, UI/UX, mobile ergonomics, performance, security, and CI.
  - Disputed/Refuted by code: 4 findings (with code evidence documented in Section 1 of the brief).
  - Deferred: 6 features deferred per Section 6 of the brief (social identity, league modes, watch parties).
  - Won't fix: 2 cosmetic items rejected per Section 6 of the brief (heatmap, fake stoppage time) and 2 legacy scoring calibrations preserved to protect cross-engine rating integrity.

---

## 2. Audit A Findings (Top 15 Headline Findings)

| # | Finding | Severity & Area | Status | Resolving PR & Evidence |
|---|---|---|---|---|
| 1 | Dual timeline build, moveset RNG desync | High, Live match | Fixed | PR #72 (Wave 1 row 1a). `MatchPlayer.tsx` lifts movesets; single shared timeline built with deterministic seed. |
| 2 | Momentum bar spoils future minutes | High, Live match | Fixed | PR #73 (Wave 1 row 1b). Honest momentum: frame lean computed only from elapsed windows (`to <= clock`). |
| 3 | Scoreboard announces goal 1.5s early | High, Live match | Fixed | PR #74 (Wave 1 row 1c). Score and horn gated on staging progress >= 0.6 so score lands with the ball. |
| 4 | Wrong Pokemon lies injured | High, Live match | Fixed | PR #75 (Wave 1 row 1d). Down pose rendered for the injured starter, not the replacement. |
| 5 | Ball teleports across pitch | High, Live match | Fixed | PR #86 (Wave 2 row 2b). Continuous ball physics with turnover tackles, spot penalties, and flight blending. |
| 6 | Phone layout splits watching from deciding | High, Mobile matchday | Fixed | PR #98 (Wave 3 row 3a). Responsive touchline bottom sheet below 600px; pitch stays visible. |
| 7 | Default Quick view in Manager mode is frantic | High, Live match | Fixed | PR #77 (Wave 1 row 1f). Manager mode defaults to Live pace; per-phase SFX suppressed in Quick view. |
| 8 | One touchline tap fires assistant for entire match | High, Engine/Manager | Fixed | PR #148 & PR #155 (Wave 6 rows 6b1, 6b9). Split `managed` into tactic and subs flags in Engine 7. |
| 9 | Tactics barely matter (edges too small) | High, Engine/Manager | Fixed | PR #149, #154, #172, #173 (Waves 6 & 7). Scaled tactic-vs-style edges, Defend vs direct calibrated in V8. P1 good at +3.07. |
| 10 | Squad choice low variance; shootouts coin flip | High, Engine | Fixed | PR #150, #153 (Wave 6 rows 6b3, 6b6). Missable penalties, nominated takers, shootout band widened to 0.18. |
| 11 | Highlights card shows wrong Pokemon types | High, Results | Fixed | PR #79 (Wave 1 row 1h). Highlights use `primaryType`, removing hard-coded ability overrides. |
| 12 | "New run" mid-draft throws run away in one tap | Medium, Draft | Fixed | PR #80 (Wave 1 row 1i). Two-step confirmation dialog with 5s undo guard on new run. |
| 13 | Leaderboard no-op copy bypass | High, Backend | Fixed | PR #126 (Wave 5 row 5f). Server-side run fingerprint (`squad + seed + result`) blocks duplicate submissions. |
| 14 | Open redirect in safeNext (`//evil.com`) | High, Security | Fixed | PR #83 (Wave 1 row 1k). `safeNext` explicitly rejects leading `//` and backslashes. |
| 15 | Builder friendlies ignore Manager mode | Medium, UX | Fixed | PR #81 (Wave 1 row 1j). Friendly builder explains matchday behavior; Watch live accessible on results. |

---

## 3. Audit A Roadmap & Platform Findings

### Wave 1 to Wave 3 (Truth Pass & Football Feel)
- Move frame loop out of React: Fixed in PR #85 (Row 2a). rAF loop inside `Broadcast` with ref-driven transforms.
- Smooth movement & Catmull-Rom paths: Fixed in PR #87 (Row 2c). Waypoint interpolation with velocity facing.
- Set pieces from goalKind: Fixed in PR #88 (Row 2d). Wall curls, high headers, solo dribbles staged from engine kind.
- Pitch fatigue visual pips: Fixed in PR #90 (Row 2f). Sweat pips and reduced run speed below 65 energy.
- Broadcast follow camera: Fixed in PR #99 (Row 3b). Critically damped camera follow with 1.6x zoom and manual toggle.
- Landscape and fullscreen: Fixed in PR #100 (Row 3c). Score bug overlay and max-height 70svh in landscape.
- Team kit readability: Fixed in PR #101 (Row 3d). Distinct kit rings per side; 44px mobile touch target floor.
- Haptics: Fixed in PR #107 (Row 3e). `navigator.vibrate` on goals, red cards, and full-time whistle.
- Matchup scout note: Fixed in PR #103 (Row 3g). Dynamically generated scout guidance from opponent style.
- "Your calls" post-match card: Fixed in PR #109 (Row 3h). Replays match with assistant and compares tactical swings.

### Wave 4 & Wave 5 (Social Loop & Match Story)
- `matchStory` feed: Fixed in PR #142 (Row 6a1). Pure function yielding per-trial xG, zone, and territory.
- Honest xG river: Fixed in PR #147 (Row 6a2). Visual xG river beneath scoreboard populated as windows complete.
- Native Web Share API: Fixed in PR #119 (Row 5a). Web Share with fallback to clipboard.
- Head-to-head challenge links: Fixed in PR #121 (Row 5b). `vs=<token>` client replay comparison.
- Exhibition against drafted squads: Fixed in PR #122 (Row 5c). Play against any saved or completed squad.
- Board row highlighting: Fixed in PR #123 (Row 5d). Own rows highlighted with rank share.
- Staged results reveal: Fixed in PR #124 (Row 5e). CSS score count-up and champion trophy animation.
- Coached column in database: Fixed in PR #126 (Row 5f). Stored `coached` column replaces read-time SQL decoding.

### Wave 6 & Wave 7 (Platform Hygiene, Engine 8, Species Split)
- CI hygiene & Node 24: Fixed in PR #160 (Row 7ci). Node 24, SHA-pinned actions, `format:check`, Postgres container.
- Proxy matcher trim: Fixed in PR #161 (Row 7pm). Static creature and health paths bypass edge proxy.
- Card query canonicalization: Fixed in PR #162 (Row 7cq). 308 redirects for non-canonical queries, stable CDN caching.
- Rollback safety: Fixed in PR #163 (Row 7rb). Row count check and `--drop-data` flag required for migration 0000.
- Content-Security-Policy enforcement: Fixed in PR #164 (Row 7csp). CSP enforced across all routes with 0 violations.
- Builder link previews: Fixed in PR #165 (Row 7bp). Rich OpenGraph previews for `/?b=` squad links.
- Client Zod replacement & daily paint: Fixed in PR #166 (Row 7zd). Client bundle trimmed of classic Zod; instant daily paint.
- Matchday & app carryovers: Fixed in PR #167 & PR #168 (Rows 7q1, 7q2). Keyboard accessibility, skip link, error pages.
- Content-addressed engine data blobs: Fixed in PR #170 (Row 8a). Shared blobs under `_blobs/` reduce duplicate JSON.
- Retained Engine 7 freeze: Fixed in PR #171 (Row 8b). Pinned v7 bundle with SHA-256 integrity verification.
- Engine 8 flip: Fixed in PR #174 (Row 8x). `pokedraft-engine-8` live with calibrated Defend vs direct (+3.07 P1 good).
- Species chunk split: Fixed in PR #175 (Row 7sp). Slim 108 KB index + 9 lazy generation chunks; 48.2% faster draft start.
- Screenshots refresh: Fixed in PR #176 (Row 7x). 360 px mobile evidence and GIF re-shot from production.

---

## 4. Audit G Findings (Deep Dive & Mechanism Verification)

| Finding | Area | Status | Resolving PR & Mechanism |
|---|---|---|---|
| 2.1.1 Dual `buildTimeline` calls desynchronize RNG | Live match | Fixed | PR #72. Single timeline built in `MatchPlayer`, passed to `Broadcast`. |
| 2.1.2 Ability callout SFX saturation | Live match | Fixed | PR #77. Sound pacing throttled; phase sounds disabled in Quick view. |
| 2.1.3 Mobile sprite scaling crushes carrierBadge (5.28px) | Mobile UI | Fixed | PR #78. Badges unnested from scaled sprite layer; 11px font floor enforced. |
| 2.1.4 SVG aspect-ratio distortion on trails | Graphics | Fixed | PR #78. ViewBox and aspect ratio normalized on ball trails. |
| 2.1.5 Only 6 of 18 types have effects | Audio/Visual | Fixed | PR #88. Full 18-type elemental callout and audio effect mapping implemented. |
| 2.1.6 Ball and player snap-teleports | Animation | Fixed | PR #86. Catmull-Rom smoothing and continuous ball trajectory. |
| 2.1.7 Penalty shootout static/silent | Animation | Fixed | PR #89. Staged run-up, strike, goalkeeper dive, and suspense audio. |
| 2.2.1 Kickoff Tactic Trap disables assistant | Gameplay | Fixed | PR #148 & PR #155. Decoupled tactic and substitution management. |
| 2.2.2 Blind substitutions in Touchline | Touchline UX | Fixed | PR #103. Bench cards display fit glyphs, ratings, and energy levels. |
| 2.2.3 Yellow cards invisible in Touchline | Touchline UX | Fixed | PR #78 & PR #103. Caution badges rendered on pitch and bench cards. |
| 2.2.4 Opponent tactical style disappears | Touchline UX | Fixed | PR #103. Persistent scout advice and opponent style indicator on sheet. |
| 2.2.5 Touchline interaction does not pause clock | Touchline UX | Fixed | PR #98. Bottom sheet automatically holds match clock while open. |
| 2.2.6 Redundant double stop before kickoff | Touchline UX | Fixed | PR #77 & PR #98. Kickoff stop consolidated into pre-match card. |
| 6.1 Server bundle regression & retained data duplication | Architecture | Fixed | PR #170. Content-addressed data deduplication via SHA-256 blobs. |

---

## 5. Disputed / Refuted Audit Claims

As established in Section 1 of the implementation prompt, several static claims from Audit G were refuted by direct inspection of repo source code:

1. **Manager tactic flag mechanism**: Audit G claimed only a non-Balanced tactic sets `managed` via a non-existent `isDefaultManager`. Code inspection of `src/engine/match.ts` showed `applyManager` set `managed = true` for all choices including Balanced. Resolved by splitting tactic and substitution management in Engine 7 (PR #148).
2. **Sprite scaling factors**: Audit G claimed sprite CSS values were 0.48 / 0.62 / 0.78. Ground truth values in `Pitch.module.css` were 0.48 / 0.7 / 0.9.
3. **RollReveal reel skip**: Audit G flagged the reel skip button settling all reels simultaneously as a bug. This was confirmed as intentional design for fast drafting, later augmented with the fast-spin preference (PR #110).
4. **Link preview gate blocking**: Audit A conjectured that the passcode gate blocked search and social link preview bots. Refuted: user-agent detection in `src/proxy.ts` allows known crawlers through without a gate cookie.

---

## 6. Deferred Items & Won't Fix Decisions

Per Section 6 of the program brief, the following items were formally deferred or marked won't-fix to protect project scope and core game invariants:

- **Passwordless friend identity & server-committed attempts**: Deferred. Introduces heavyweight authentication and changes the casual friend-group social dynamic. Revisit only if friend group explicitly requests account management.
- **Weekly standings, season mode, rivalries, and watch parties**: Deferred. Premature feature creep until friends actively engage with core head-to-head challenges.
- **Video export via MediaRecorder**: Deferred due to inconsistent cross-browser support on mobile Safari. Replaced by instant replay and deep links (`/r/<token>?watch=...`).
- **Broadcast heatmap & cosmetic stoppage time**: Won't fix. The simulation engine does not track sub-minute coordinate heatmaps; inventing positions would violate the "no fabricated data" invariant.
- **Keeper fit vs quality rating adjustment**: Won't fix. Adjusting legacy raw fit formulas would rewrite historical Team Scores across engines 1 through 6. Display was made honest by showing role quality directly (PR #70).

---

## 7. Program Verification Sign-Off

- All 18 rows of Wave 7 merged with exact-head squash SHAs.
- Full automated test suite passes: 2,310 unit tests in 260 files, 12 hosted CI checks, and all Playwright e2e suites green.
- Live deployment verified at `https://pokedraft-woad.vercel.app/api/health?db=1` serving commit `8e071295`.
- Program closed cleanly with zero open carryovers.
