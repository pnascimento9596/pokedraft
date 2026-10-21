# Matchday and broadcast carryovers sweep (Wave 7, row 7q1)

Tier Yellow. Branch `fix/matchday-broadcast-carryovers` off `origin/main` at `a560015e` (PR #166).

## Scope

Per hand-off section 4.3 (row 7q1) and recommendation 5, each matchday and broadcast carryover from Waves 1 to 4 was audited, reproduced or verified against existing guards, and closed with concrete citations:

1. **1d: Ticker shows assistant sub line during manager injury stop**
   - Status: Closed as already fixed.
   - Evidence: `src/ui/matchday/player.ts:446-455` (`awaitingAnswer`) suppresses any injury substitution beat until the manager answers the stop. Guarded by `src/components/matchday/__tests__/MatchdayFlow.intel.test.tsx:126-145` (`describe("injury stop (catches the 1d carryover: the ticker shows the assistant's sub before the manager answers)")`, asserting `tickerKinds()` does not contain "sub" and the ticker text omits the replacement until answered).

2. **1e: Toggling speed mid-beat jumps staging**
   - Status: Closed as already fixed.
   - Evidence: `src/ui/matchday/player.ts:504-517` (`toggleSpeed`) rebases every active timestamp in `state.fired`, `state.hold`, and `state.kickAt` about `frameNow(state, now)`. Guarded by `src/ui/matchday/__tests__/player.speed.test.ts:64-100` (`describe("a speed change keeps the staging where it is (catches the 1e carryover: toggling 2x mid-beat jumps the goal, the hold and the penalty)")`, asserting beat progress is identical before and after toggle).

3. **`score-lands-with-ball.spec.ts` goal flash polling**
   - Status: Closed as already updated.
   - Evidence: `e2e/score-lands-with-ball.spec.ts:20-41` records every score and goal flash transition in a window `MutationObserver` log (`w.snaps`). Verified with chromium at 390x844: snapshots recorded `[{"score":"0-0","flight":false,"flash":false},{"score":"0-0","flight":true,"flash":false},{"score":"1-0","flight":false,"flash":true}]`, verifying inFlight score was "0-0" and landed score was "1-0" without polling race.

4. **320 px scoreboard word break, short trail on missed penalty, wheel skip focus**
   - Status: Closed as already fixed.
   - Evidence:
     - 320 px scoreboard word break: fixed in PR #106 (`docs/decisions/fullscreen-score-bug.md`). Guarded by `e2e/fullscreen-score-bug.spec.ts:86-99` (`no word break in the scoreboard at 320: every word of both names and the score sits on one line (catches 'Goldenro / d United')`).
     - Short trail on missed penalty: engine 7 penalty misses fly wide of the post from the spot. Guarded by `src/ui/matchday/__tests__/penalty-miss.test.ts:43-59` and `src/ui/matchday/shootout.ts:125-141`.
     - Wheel skip focus: guarded by `src/components/wheel/__tests__/skip-focus.test.tsx:23-53` (focus after keyboard skip lands on reveal region, not body).

5. **2x speed motion bounds and follow camera worst frame**
   - Status: Closed as already fixed and guarded.
   - Evidence:
     - `src/ui/matchday/__tests__/motion-bounds.test.ts:106-135` guards 60 Hz frame movement: never moves ball >= 4% at 1x over 20 broadcast seeds (sweep-0 to sweep-19); never moves player >= 4% at 1x in any golden cup match; never moves ball or player >= 8% at 2x.
     - `src/ui/matchday/__tests__/camera-motion.test.ts:63-76` guards follow camera ball step: worst frame <= 4% x zoom at 1x, <= 8% x zoom at 2x across golden cup matches.

6. **2e: Pausing mid-kick lets kick play out**
   - Status: Closed as already fixed.
   - Evidence: `holdTime` in `src/ui/matchday/player.ts:483-497` freezes `pausedAt` and shifts `kickAt` and `hold.until` on resume. Guarded by `src/ui/matchday/__tests__/player.test.ts:169-206` (`describe("a pause stops the broadcast where it is (catches the 2e carryover: a paused kick plays out and the next starts on resume)")`).

7. **2g and 3: Extra-time callouts, badge clipping, reduced motion key-duel cards**
   - Status: Closed as already fixed.
   - Evidence:
     - Extra-time callouts: `src/ui/matchday/__tests__/timeline.test.ts:452-461` guards that a 120-minute match produces 15 open-play callouts (between 10 and 18, catching 21 before tuning).
     - Badge clipping: `src/ui/matchday/__tests__/badge.test.ts:16-43` guards `badgeCorner` keeping play badges inside pitch box.
     - Reduced motion key-duel cards: `src/ui/matchday/cutin.ts:43-55` (`stillCutInAt`) and `src/components/matchday/Broadcast.tsx:375`. Guarded by `src/components/matchday/__tests__/Broadcast.cutin.test.tsx:146-153` (`it("shows the key duel's card, still, with reduced motion")`).

8. **2h: Crowd unlock and reduced motion crowd level**
   - Status: Closed as verified.
   - Evidence: `src/ui/matchday/timeline.ts:739` sets ambient ball at `{ x: 50, y: 50 }` when motion is off, holding `crowdGain(50)` constant at 0.03. Browser autoplay security policy requires user gesture before Web Audio resumes.

9. **3: Cut-in sprite empty for small sprites, carrier nameplate clipping, 1280x720 exit button**
   - Status: Closed as already fixed or verified.
   - Evidence:
     - Cut-in sprite: `CutInSprite` in `src/components/matchday/Broadcast.tsx:282-302` uses a ResizeObserver on `.cutInSprite` and passes measured size directly to `PlayerImage`.
     - Carrier nameplate: `keepInside` in `src/ui/matchday/badge.ts:35-47` clamps nameplate coordinates inside camera view; guarded by `src/ui/matchday/__tests__/badge.test.ts:45-65`.
     - 1280x720 full screen exit button: at 1280x720 (16:9), pitch aspect ratio 100/64 centers an 1125px wide pitch with 77.5px letterbox bands on left and right; `.pitch[data-fullscreen] .fullscreen` (`MatchPlayer.module.css:305-315`) is a 44px button positioned at `right: 8px` (occupying 8px to 52px from right viewport edge), leaving a 25.5px clear margin before the pitch edge at 77.5px. It never overlaps the pitch.

10. **3i: Goal on stop minute replays after stop is answered**
    - Status: Closed as refuted by architecture.
    - Evidence: `src/ui/matchday/player.ts:553-558` ensures a goal and its instant replay play out before the stop opens (`const holdHere = holdBeat !== undefined && holdBeat.minute <= state.minute; if (stop !== null && stop.minute <= state.minute && !holdHere)`). When the stop is subsequently answered, the goal key is already in `state.held` and `state.replay` is null, preventing any post-stop replay.

11. **3j: Axe touchline violations and Kick off focus**
    - Status: Closed as already fixed.
    - Evidence:
      - Axe touchline scan: `e2e/a11y.spec.ts:124-150` ("a managed live match at an injury stop with the skip warning open") audits the touchline across dark and light themes without exclusions, asserting zero axe violations.
      - Focus after Kick off: `MatchdayFlow.tsx:182` passes `takeFocus` to `MatchPlayer`, which focuses `playToggle` on mount (`MatchPlayer.tsx:510`).

## Validation

1. Unit tests on touched matchday files: 12 passed (114 tests) in 18.51s.
2. Full validation ladder at HEAD: lint, typecheck, unit tests, build, nine check scripts.
3. Playwright `e2e/score-lands-with-ball.spec.ts` ran and passed in 36.7s.

## NOT RUN

- Phone check (iPhone Safari and Android phone) deferred to final owner checklist.
- Screen reader pass (VoiceOver) deferred to final owner checklist.
