# Builder matchday

Wave 1 row 1j, Yellow, size S. Branch `feat/builder-matchday` off `origin/main` at `f4489cb`.

## Scope

Product decision 2: builder friendlies get the matchday. Manager mode and Live match apply to
builder cups, and friendlies stay unranked.

## Brief versus code

The row names the gates in `PlayScreen` (start card `MatchdaySettings`) and `LiveRun`
(`seeResults`). Both are removed, but neither is on the player's path. `parsePlayQuery` never
yields builder settings, so `/play` never runs a builder cup. The home builder's "Play a friendly
cup" set `HomeScreen` state and rendered `ResultsView` directly, with no matchday and no run
snapshot. That is the path the audits measured (Audit A finding 15), and it is the one this change
fixes.

## What changed

- `HomeScreen` opens a friendly through the same `LiveRun` screens a challenge uses. `friendlyStart`
  (in `LiveRun.tsx`) shares `afterDraft` with `seeResults`, so one function decides matchday or
  results from the panel.
- `LiveRun` loads with `import()` on the friendly tap and on the home idle preload, so the first
  load stays lean.
- Reload resume: the friendly matchday saves to the builder run slot (`pokedraft.run.builder`)
  through the existing `saveRun` path. `restoreFriendly` reads the saved token's own settings,
  because the home page has none, and restores only a `matchday` snapshot. Home peeks the slot
  without the engine and loads `LiveRun` only when a matchday is saved. Friendly results still do
  not survive a reload, as before.
- `MatchdaySettings` takes an optional controlled `value` and `onChange`. Home renders it in the
  Play a friendly cup row bound to its panel state, so it and the side panel's Matchday switches
  never disagree. The start screen keeps the uncontrolled storage-backed form.
- `Builder` awaits `onFriendly`. A failed `LiveRun` load says "The cup could not load. Check your
  connection." in the builder status line.

## Engine claim

Verified, not assumed. `replay` passes `run.manager` to `runCup` for every mode, and
`runCup`'s manager handling has no mode branch. `src/ui/manager/__tests__/builder-coached.test.ts`
records a tactic through `decide` on a builder cup and replays the coached builder token to the
same cup. No file under `src/engine` changed.

## Unranked

`handleSubmit` rejects any builder token with `BUILDER_NOT_RANKED` before replay. A new handler
test proves it for a coached builder token. `LiveRun` still passes no `SubmitPanel` for builder
settings, and the e2e asserts `submit-panel` is absent on the friendly results.

## RED

Commit `aff6f7a`, `pnpm vitest run src/components/builder/__tests__/builder-matchday.test.tsx`:

```
     × a builder cup with manager on mounts MatchdayFlow 12061ms
     × a builder cup with Live match on and manager off mounts MatchdayFlow without the touchline 11270ms
     × a reload during a builder matchday comes back to that matchday 11067ms
     × sit next to the button and move the side panel's Manager mode switch with them 468ms
     × the builder challenge start card shows the Matchday settings 65ms
TestingLibraryElementError: Unable to find an element by: [data-testid="matchday"]
TestingLibraryElementError: Unable to find an element by: [data-testid="matchday"]
TestingLibraryElementError: Unable to find an element by: [data-testid="matchday"]
TestingLibraryElementError: Unable to find an element by: [data-testid="manager-mode"]
TestingLibraryElementError: Unable to find an element by: [data-testid="matchday-settings"]
      Tests  5 failed | 1 passed (6)
```

The passing one is the manager-off Quick sim baseline. The builder-coached and coached-builder
handler tests in the same commit passed on arrival. They are coverage guards, not RED guards.

## Browser proof

`e2e/builder-matchday.spec.ts` at 390x844 (chromium): Randomize, Manager mode and Live match on
from the friendly row, Play a friendly cup, kickoff touchline with Attack picked, reload back to
match 1, finish the cup, results labelled Friendly (not ranked) with no submit panel. Screenshots
in `docs/reports/builder-matchday/`. The layout change is one stacked block inside an existing
wrapping row, so 360 and 320 scenes were not added. `e2e/mobile-targets.spec.ts` and
`e2e/mobile-acceptance.spec.ts` cover the home page at phone widths and pass.

## NOT RUN

- Hosted CI on the PR (the coordinator opens it).
- GLM review (the coordinator runs it).
- The full Playwright suite locally; only the specs listed in STATE.md ran.
- A physical phone check.
