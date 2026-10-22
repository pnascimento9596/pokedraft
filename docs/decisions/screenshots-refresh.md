# Matchday screenshots and GIF refresh (row 7x, Green)

Branch `chore/screenshots-refresh` off `origin/main` at `acdd8f00`. Wave 7 row 7x (Green).

## Scope

Re-shoot the 360 px matchday screenshots and animated GIF in `docs/reports/manager-mode/` from live production (`https://pokedraft-woad.vercel.app`) at `acdd8f00` after the engine 8 flip (PR #174) and species chunk split (PR #175). No product runtime code changes.

## Refreshed evidence

Captured in headless Chromium at 360x780 viewport with mobile touch emulation against live production:
- `docs/reports/manager-mode/prematch-360.png`: full-page capture of pre-match card (360x1566) showing scout line and badged starting tactics.
- `docs/reports/manager-mode/touchline-kickoff-360.png`: single-screen viewport capture (360x780) at minute 3 with collapsed sheet and pitch controls.
- `docs/reports/manager-mode/touchline-stop-360.png`: single-screen viewport capture (360x780) at half-time stop (45') with scout line and fatigue line.
- `docs/reports/manager-mode/live-match-move-callout.gif`: 7-second animated GIF cut at 8 fps (360x780) from a Playwright-recorded video using ffmpeg palette generation, ending 2.5 seconds after the first move callout ("Shuppet used Phantom Force!").

## Gates run

- `pnpm format:check`
- `pnpm check:dashes`
- `pnpm check:mirrors`

## NOT RUN

- Unit tests and full e2e suite locally (no code in `src/` or `e2e/` changed; CI runs them).
- Physical phone check (owner action).
