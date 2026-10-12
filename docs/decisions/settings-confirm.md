# Open settings by default and confirm them before a challenge run

## Scope

Yellow, UI only. The engine, run token, leaderboard, database and the `/play` URL contract are unchanged.

## Decisions

- **Open by default.** `SidePanel` starts with the settings expanded at every width, server-rendered, so there is no flash. The toggle still collapses it. The collapsed state is not persisted, so every visit starts open.
- **Gate on the home Play buttons only.** `Play 8-0 Challenge` and `Play 151 Challenge` are now buttons that open a modal `<dialog>` titled "Settings confirmed?". The home page is the only place settings are chosen.
- **Not gated:** shared `/play` links, the Daily challenge (fixed settings, not chosen on home) and the Friendly builder "Play a friendly cup".
- **Shows exactly what the mode uses.** 8-0: Formation, Regions, Style, Order. 151: Formation, Order. The list is read back from `playHref` through `parsePlayQuery`, then formatted by `settingsSummary`, the same function the `/play` start page uses. The two cannot disagree.
- **Yes** pushes the same `/play` href as before and unmounts the dialog. Leaving a modal open was a bug: the home page stays mounted but hidden behind `/play`, and the open modal made the whole document inert (found by e2e).
- **No, Escape and a backdrop tap** all close the dialog without navigating, expand the settings, and focus the Formation select (scrolled into view only when it is off screen).
- **Focus starts on Yes.** Opening the dialog prefetches the `/play` route.
- **No "don't ask again".** The owner wants the safety net every time. A possible follow-up.
- Play buttons lose open-in-new-tab, which they had as links. Accepted.

## Measured

- Home first-load JS (script tags in the HTML, 10 chunks): 741,982 B raw / 228,871 B gzip before, 744,463 B / 229,859 B after (+2,481 raw, +988 gzip). `/play` start: 721,978 / 222,751 before, 722,482 / 223,058 after.
- Home CLS at 360, 390 and 1280 wide, 5 cold loads each: 0.00000 before and after.
