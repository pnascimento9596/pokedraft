# Challenge ratings decision log

| Decision | Why | Evidence |
| --- | --- | --- |
| A second panel setting, `showChallengeRatings`, labelled "Show ratings (challenges)", independent of `showRatings` (builder) | the owner asked for sighted challenge drafts without touching the builder's casual mode | `src/ui/settings.ts` |
| Default off | existing behavior and the blind draft stay the default; advanced players opt out by leaving it off | `src/ui/__tests__/settings.test.ts` |
| Display only and client-local: no engine, token, scoring, leaderboard or DB change | a rating is already derived from the species data the client holds | `src/ui/rating.ts` |
| Not flagged on the leaderboard | a flag needs a field in the run submission contract and the DB (Red tier), out of scope for a display change | |
| Supersedes the `dispatch-3.md` row "challenge candidates never show fit" | that row kept ranked runs blind and said the owner could ask for sighted challenges | `docs/decisions/dispatch-3.md` |
| One `ratingFor` feeds the builder picker, the builder token pill and the draft board | one source for the number and label, so they cannot drift | `src/ui/rating.ts` |
| Known gap: the ranked board cannot tell sighted from blind runs | no flag travels with a run | follow-up: flag in the submission contract plus a DB column |
| The setting is read once per run screen mount; no in-run toggle | no layout shift mid-draft | `src/components/run/LiveRun.tsx` |
