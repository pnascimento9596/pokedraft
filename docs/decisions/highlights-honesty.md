# Highlights honesty

## Scope

Wave 1 row 1h of the 2026-10-17 program. Yellow, display only. Nothing under `src/engine`,
`src/data` or `src/scouting` changes. Sources are Audit A finding 11, B1, B3, B4, C2, C4 and C8,
and Audit G section 3.5 item 2. Each cited line was re-read at `f4489cb` before editing. The code
matched the audits.

- The star's type icon and stage tint used `getAbilityMeta(...).element`, a hard-coded element per
  ability (`intimidate` is dark). They now use the species' primary type. `AbilityMeta` loses its
  `element` field and the catalog loses its element entries, because nothing else read them.
- The ability box said "Activated Ability:" and the strike announcement said "using <ability>".
  The engine records no ability activation. The box now says "Ability:" and the announcement drops
  the ability.
- Clean Sheet Hero and Squad Anchor always went to `starters[0]`. They now go to the first player in
  formation order, keeper first, who held a starting slot for the whole match. That is the starter,
  or the stand-in from `absences` when the starter missed the match. A player subbed off, injured or
  sent off (from `incidents`) does not count. When the keeper does not qualify, the first such
  outfield starter gets it.
- A 0-0 lost on penalties is no longer a clean sheet. It falls to Squad Anchor.
- The MVP pill tone is W when wins exceed losses, L when losses exceed wins, D when level. Before,
  0W-0D-3L read D and 1W-1D-1L read W.
- `MatchStar` gains an `icon` field. Headline glyphs, the motion toggle glyph, the strike and goal
  balls and the broadcast play glyph sit in `aria-hidden` spans. The motion toggle gets a 6px gap so
  the glyph and label keep their space in the flex button.
- `dragLabel` in `format.ts` prints a zero weak-spot drag as `0`, not `-0`.

## RED output (commit `fc9efaf`, verbatim)

```
     × shows Arcanine as fire, not the dark of its first ability Intimidate 3ms
     × gives a 0W-0D-3L tournament record the L tone, not the neutral D 1ms
     × gives a level 1W-1D-1L group exit the D tone, not W 1ms
     × does not crown an absent keeper Clean Sheet Hero; the stand-in who kept goal gets it 1ms
     × does not crown a keeper subbed off at 60' Clean Sheet Hero 1ms
     × does not call a 0-0 lost on penalties a clean sheet 1ms
     × does not name an absent, unreplaced keeper Squad Anchor of a 0-2 loss 1ms
     × keeps emoji out of the headline text so screen readers do not read 'gloves Clean Sheet Hero' 1ms
     × labels the ability as the species' ability, never as Activated during the match 7ms
     × keeps the motion, strike and goal emoji out of the accessible names 36ms
     × shows a zero weak-spot drag as 0, not -0 27ms
     × hides the match star badge emoji and the broadcast play glyph from screen readers 367ms
AssertionError: expected 'Activated Ability:Flame BodyFlame Bod…' not to contain 'Activated'
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Pause Motion"
AssertionError: expected '-0' to be '0' // Object.is equality
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Watch Matchday Broadcast"
AssertionError: expected 'dark' to be 'fire' // Object.is equality
AssertionError: expected 'D' to be 'L' // Object.is equality
AssertionError: expected 'W' to be 'D' // Object.is equality
AssertionError: expected 630 to be 200 // Object.is equality
AssertionError: expected 630 to be 893 // Object.is equality
AssertionError: expected '🧤 Clean Sheet Hero' to contain 'Squad Anchor'
AssertionError: expected 630 to be 893 // Object.is equality
AssertionError: expected '🧤 Clean Sheet Hero' to be 'Clean Sheet Hero' // Object.is equality
      Tests  12 failed | 37 passed (49)
```

The badge test failed RED on the broadcast button lookup, before its badge check ran. After the fix
the badge check itself was wrong: it read the outer headline span, which contains the hidden glyph.
The fix commit `c77a42b` corrects it to strip `aria-hidden` nodes first. So the badge half of that
guard has no RED of its own. The headline half of the emoji change is guarded by the
`starCalculation` headline test, which did fail RED.

## Decisions

- Whole-match anchor in formation order. The row says to skip absent or subbed keepers but not who
  gets the award instead. The stand-in who kept goal all match is the honest Clean Sheet Hero. With
  no whole-match keeper, the first whole-match starter is a real player who was on the pitch for the
  shutout. Injury and red-card exits are skipped too, because they leave the pitch the same way a
  sub does.
- Ability flavor stays. It is the same copy the Scouting Dossier shows as the ability's description.
  Only the claim that it fired in the match goes.
- Sentence case ("Pause Motion", "Hat-Trick Hero") is left to row 4e. The MatchdayLive goal ticker
  emoji are outside this row and stay.

## Measurements

- Unit tests: 1,327 passed in 144 files at `dfe9f5f`.
- Playwright on a fresh build at the `dfe9f5f` code: 429 passed, 0 failed, 54 skipped across
  `highlights-honesty`, `results-interactions`, `silph-stadium`, `recorded-saves`, `a11y`,
  `contrast`, `mobile-targets` and `mobile-acceptance`.
- Browser proof: `docs/reports/highlights-honesty/highlights-390.png` and
  `highlights-mvp-390.png`, from `e2e/highlights-honesty.spec.ts` at 390x844.

## NOT RUN

- The new 390px scene against a `main` build, to show it failing there.
- 360 and 320 screenshots. The layout does not change apart from a 6px gap in one button.
- Physical phone check.
- GLM review (the coordinator runs it).
