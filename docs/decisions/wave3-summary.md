# Wave 3 summary (Green)

## Scope

Close Wave 3: the program-log entry, the owner phone-check checklist, and the refreshed 360 px
manager-mode screenshots and GIF that audit finding B13 called stale, with the correction to the
STATE.md line that claimed they were updated. No product code changes.

## Files

- `docs/reports/audits-2026-10-17/program-log.md`: the Wave 3 entry (PR table, order, measurements
  that moved, brief vs code, open carryovers).
- `docs/reports/manager-mode/prematch-360.png`, `touchline-kickoff-360.png`,
  `touchline-stop-360.png`, `live-match-move-callout.gif`: re-shot from production at `88f6f72`.
- `STATE.md`: the PR #111 merged paragraph, this section, and the correction to the #70 overhaul
  section's screenshot claim.

## Evidence refresh

The four files were last committed in #62 (`35b99cf`) and still showed the plain white-dot ball and
the pre-sheet touchline. Nothing in `e2e/` writes them, so a throwaway spec re-shot them against
production (`PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app`, chromium, 360x780 with touch,
manager mode, Watch live, the `e2e-coach` squad from `touchline-sheet.spec.ts`). It is not committed,
like the measuring scripts of rows 2b to 3-0.

- `prematch-360.png`: the pre-match card, full page.
- `touchline-kickoff-360.png`: paused at 3' with the collapsed sheet. One screen (360x780), not full
  page: the sheet is fixed, and a full-page capture paints it mid-page over the controls, which a
  phone never shows. The first capture did that and was discarded.
- `touchline-stop-360.png`: the half-time stop at 45' (1 - 1), one screen, with the scout and
  fatigue lines in the sheet.
- `live-match-move-callout.gif`: 7 s of Watch live at 8 fps, 360x780, cut from a Playwright video
  with ffmpeg, ending 2.5 s after the first move badge; 1,743,529 bytes (the old one was 1,060,651).
  It shows a SAVE cut-in whose sprite circle is empty, the open carryover from row 3k.

The 1280 shots and `live-move-callout.png` in the same folder were refreshed in #70 and are left as
they are.

## Owner phone check (NOT RUN; owner action)

On iPhone Safari and an Android phone, against production:

1. Watch a full live match in manager mode at 1x and 2x. Note any stutter, jump or sprite flicker.
   In Follow (the phone default) watch the ball on long passes: its worst measured step is 4.91% of
   the pitch per frame under the zoom, above the 4% bound.
2. Open the bottom sheet mid-match: the clock stops, the pitch stays visible, a sub confirms and the
   match resumes.
3. Follow camera: comfortable, never shows outside the pitch; Full pitch works.
4. Sound: crowd, goal roar and ability sounds play after tapping Watch live, and again after a
   reload once "Tap for sound" is tapped. Note the iOS silent switch.
5. Haptics on Android: your goal, your red card, the final whistle; nothing for theirs.
6. Turn to landscape: the touchline sits under the pitch. On Android, Full screen shows the score
   bug; a stop leaves full screen. iPhone Safari shows no Full screen button.
7. Penalty shootout: pause mid-kick and resume.
8. Results: open a goal deep link ("Share this goal"), seek with a goal pip, watch an instant replay
   and skip it.
9. Keyboard on a laptop: Space pauses, `2` toggles speed, focus moves to a stop's first control.
10. Desktop at 1280x720: the pitch is capped at 70% of the screen height; the full-screen exit
    button overlaps the pitch's top right corner.

## Decisions

- Re-shoot from production, not a local build: the files are evidence of what players see.
- Viewport captures for the fixed-sheet scenes, so the image matches a phone screen.
- Keep the empty cut-in sprite and the clipped nameplate visible in the new evidence and list them
  as carryovers, rather than stage a scene that hides them.

## NOT RUN

- The physical phone check above.
- Unit tests and the e2e suite on this branch: nothing under `src/` or `e2e/` changed. CI runs them.
