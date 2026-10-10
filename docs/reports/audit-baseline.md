# Audit baseline (GATE 0)

Platform baseline for dispatch 7, measured on unchanged `main` at `928e4b1` before any fix. Taken on Saturday 2026-10-10 between 14:50 and 18:10 EDT, from one MacBook Pro on one Wi-Fi network. Later claims of "better" or "worse" in this lane should quote these numbers and re-run the same tools. The tools are in `scripts/audit/` and its README explains how to run them.

Data: `docs/reports/audit-data/baseline-{env,lighthouse,first-load-js,api-timing,screenshots}.json`. Compressed screenshots of the local build: `docs/reports/audit-baseline/`. Raw Lighthouse reports, raw run logs and the production PNGs stay outside the repository. Every table below is generated from the data files by `scripts/audit/report.mjs` and carries a source line. Prose numbers name their file in parentheses.

## Summary

- **Lighthouse mobile.** Good paint, middling scores. Clean production runs score 84 to 100, Accessibility and Best Practices 100, SEO 63 (intentional noindex). The simulated LCP of 1.4 to 3.8 s moves in steps that depend on timing, so quote the observed LCP beside it (section 2). Only 8 of 24 production and 3 of 24 local runs were clean.
- **First-load JavaScript.** Heavy. 1.92 to 1.97 MB decoded on every route that runs the engine, and a browser fetches 1.99 to 2.02 MB on every route because the router prefetch pulls in the 1.33 MB data chunk, which is 96.8% JSON (section 3).
- **API timing.** Warm reads are fast (p50 84 ms, about 50 ms above the network floor). Cold reads take 2.0 to 3.1 s and include a Neon resume. `/card` costs about 0.35 s each time and 3.3 s when cold. A POST costs about 0.18 s on a laptop against the Neon preview branch (section 4).
- **Screenshots.** Clean. 192 shots, no horizontal overflow, the theme applied in all of them, only expected console errors (section 5).
- **Dispatch 5.** `/leaderboard` and the kanto151 page agree. `/` agrees on one of three runs and not on the LCP of the others (section 6).
- **Unexplained.** Four clean production runs painted the LCP element 2.3 to 2.5 s late with an idle main thread (section 2.5).
- **Limits.** The Mac was above a load of 6 for 98% of the baseline, so most timings are flagged busy. INP, real devices and production POST are not covered (sections 7 and 8).

## 1. Method and environment

### 1.1 Targets

| Target | What it is | How it is served | Database |
| --- | --- | --- | --- |
| Local build | The production build of `main` at `928e4b1`: the existing `.next` of the pristine checkout `/Users/paulo/pokedraft`, build id `7GUR2I93sdwtiww-I_GxH`, not rebuilt | `next start --port 3401` on the measuring Mac, Node 22.22.3, HTTP/1.1 on localhost, gzip | None. `/leaderboard` shows its unavailable state and its API call answers 503, as in `docs/reports/finish-qa.md` |
| Production | `https://pokedraft-woad.vercel.app`, deployment `dpl_3S5vGX1gDAbMwyzdmEq2gVMiP1jo` at `928e4b1`, built by Vercel | Vercel edge over HTTP/2 with brotli, functions in `iad1` on Node 24 | Neon production branch, reached only through the API. GET and HEAD only, never POST |

Source: `baseline-env.json` (deployment, build id), `baseline-lighthouse.json` (`network.protocols`).

The Vercel build and the local build are the same commit but not the same bytes. Every script set differs by 484 decoded bytes and chunk names differ (`baseline-first-load-js.json`, `methodB.prod` against `methodB.local`). Lighthouse and screenshot runs on the local build used the server without a database, so pages are comparable with `docs/reports/finish-qa.md`. Only the POST timing used a database, on a second local server wired to the Neon preview branch (section 4.5).

### 1.2 Environment

<!-- audit:table env -->
| Item | Value |
| --- | --- |
| Captured | Sat Oct 10 2026 16:39:36 GMT-0400 (Eastern Daylight Time) (America/New_York) |
| Machine | MacBook Pro, Apple M4 Pro, 12 cores, 24 GB, macOS 27.0.1 (26A434) |
| Node, pnpm | v22.22.3, 11.5.1 |
| System Chrome (Lighthouse) | Google Chrome 154.0.8037.98 |
| Playwright, Chromium, WebKit | 1.64.0, 156.0.8078.4, 27.2 |
| Lighthouse | 13.5.0 |
| Audit clone | docs/dispatch-7-audit at 928e4b1 |
| Served local build | main at 928e4b1, build id `7GUR2I93sdwtiww-I_GxH` |
| Production deployment | `dpl_3S5vGX1gDAbMwyzdmEq2gVMiP1jo`, READY, git 928e4b1, created 2026-10-10T17:57:00.505Z |
| Network | a MacBook Pro on a Wi-Fi connection (en0); consumer or office ISP, not a datacenter. Home or office is not recorded by the tool. |
| Latency floor, as the brief defines it | HEAD /robots.txt, n=10: median 121 ms, min 93.4 ms, max 166 ms; 10 of 10 opened a new connection |
| Latency floor on a kept-alive connection | GET /robots.txt, n=10: median 37.0 ms, min 28.2 ms, max 54.6 ms; 0 of 10 opened a new connection; the GET that opened it took 109 ms |
| Pinned share link | same record and score on local and production: 3-0-2, score 593 |
| Production deployment at the end | unchanged (`dpl_3S5vGX1gDAbMwyzdmEq2gVMiP1jo`) |
| Latency floor at the end, as the brief defines it | Sat Oct 10 2026 18:05:13 GMT-0400 (Eastern Daylight Time): HEAD /robots.txt, n=10: median 124 ms, min 97.6 ms, max 173 ms; 10 of 10 opened a new connection |
| Latency floor at the end on a kept-alive connection | GET /robots.txt, n=10: median 40.4 ms, min 33.5 ms, max 46.8 ms; 0 of 10 opened a new connection; the GET that opened it took 122 ms |
| Machine load during the baseline | 1-minute load average sampled every 15 s, n=675: min 4.8, median 25.5, p95 55.5, max 100.2; 98.4% of samples above 6 |

Source: `docs/reports/audit-data/baseline-env.json`.
<!-- /audit:table -->

### 1.3 The machine was busy

This Mac also ran an unrelated self-hosted CI runner, a virtual machine, Spotlight, and from about 16:30 other agents of this dispatch (Playwright and Next.js processes). It has 12 cores. A background sampler recorded the 1-minute load average every 15 s while measuring: 675 samples from 15:16 to 18:05 EDT had a minimum of 4.8, a median of 25.5, a 95th percentile of 55.5 and a maximum of 100.2, and 98.4% of them were above 6 (`baseline-env.json`, `loadDuringBaseline`). Quiet moments were short and rare.

Load changes what Lighthouse reports. Its simulated throttling takes CPU time from the unthrottled run, so a contended CPU inflates main-thread work. A first production attempt at a load of 45 to 55 scored `/` at 72 with a Total Blocking Time of 644 ms. The quiet runs of the same page scored 86 and 98 with 91 and 107 ms. That attempt is discarded. Its raw file is kept outside the repository, so those two numbers have no committed source.

The 1-minute load average also lags. The first local run of `/` started right after a busy spell with a load of 5.3, which is quiet by the rule, and scored a Lighthouse benchmark index of 3426 against 4099 to 4141 for the quiet runs next to it (`baseline-lighthouse.json`, `targets.local.routes.home.runs`). So a run is only called clean when both signals agree (section 1.4).

### 1.4 How runs were gated and labelled

- One measurement at a time, enforced by a lock file in the raw directory. A timed job waits for the lock and then for a quiet machine.
- Quiet means a 1-minute load average of 6 or less. A Lighthouse run is **clean** when the load was 6 or less at its start and right after it, and Lighthouse's own `benchmarkIndex` was at least 3900. The floor sits between the quiet runs (4020 to 4141) and the slow ones (3426 to 3782). A run that started quiet but is not clean is retried, up to three attempts.
- When the wait for a quiet machine ran out, the run went ahead and is flagged **BUSY** in every table, with the reason. A summary uses one record per run number: the latest clean one if it exists, else the latest run. Superseded attempts stay listed in `baseline-lighthouse.json` under `supersededRuns`.
- API timings record the client load beside every sample. A single sample is labelled "single run" or "single sample".

### 1.5 Statistics

A median is the middle value of the runs of one route. A range reads "median (min to max)". Percentiles use linear interpolation between the closest ranks (type 7, the NumPy and Excel default), so with 30 samples p95 sits at rank 28.55, between the second and third largest values. `scripts/audit/stats.mts` holds the helpers and `stats.test.ts` pins them with literal expected values.

### 1.6 Routes and fixtures

| Route id | Path | What it renders |
| --- | --- | --- |
| `home` | `/` | The play card and the friendly builder. The `h1` "Build your XI" is in the first HTML response |
| `play` | `/play` | Bare `/play` has no `f` (formation) parameter, so `parsePlayQuery` returns null and the page renders the invalid-link panel with an `h1` "That challenge link does not work" and a "Back home" link. HTTP 200. See `src/app/play/page.tsx:13-16` and `:18-26`, `src/components/run/PlayScreen.tsx:37-50` (`h1` at line 43), `src/ui/settings.ts:85-91` |
| `daily` | `/daily` | Today's daily 8-0 challenge start panel with the "Road to the Final" chart |
| `leaderboard` | `/leaderboard` | The board with its Daily and All-time switch. Production shows "No entries yet". The local build has no database, so it shows its unavailable state |
| `history` | `/history` | "Your last 50 runs". A fresh browser profile has none, so it shows "No runs yet" |
| `how-to-play` | `/how-to-play` | Static rules text |
| `run` | `/r/<token>` | A shared run, pinned to `golden-cup8` (engine 3): record 3-0-2, score 593, finish R16. The token is in `scripts/audit/fixtures.json` and was checked on both targets |
| `play-kanto151` | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | A real 151 challenge start. This is the page dispatch 5 measured as "`/play?mode=kanto151...`". `finish-qa.md` prints only the first parameter, so `f`, `order` and `seed` come from the e2e specs. Lighthouse only (extra row) |
| `not-found` | `/definitely-not-a-page` | The 404 page. Screenshots and first-load JS only |

Source: `scripts/audit/routes.mjs`, `scripts/audit/fixtures.json`, `baseline-env.json` (`fixtureCheck`), and the files cited in the table.

### 1.7 What each tool measures

- `lighthouse.mjs`: mobile Lighthouse, three runs per route, on both targets.
- `first-load-js.mjs`: JavaScript needed per route, computed from the build output (a) and measured in Chromium (b).
- `api-timing.mjs`: the leaderboard API and the share card on production with GET and HEAD, and POST on a local server.
- `screenshots.mjs`: the route, viewport and theme matrix with overflow, theme and console checks.
- `env.mjs`: machine, tool versions, deployment, latency floors and the pinned-link check.

## 2. Lighthouse mobile

**Verdict.** Good paint, middling scores, and the scores are mostly a model effect. On production the clean runs score 84 to 100: `/history` and `/how-to-play` 100, `/` 92, `/play` 88, `/daily` and `/r/<token>` 86, `/leaderboard` 84 (`baseline-lighthouse.json`, `targets.prod.routes`). Accessibility and Best Practices are 100 on every production route. SEO is 63 (58 on the run page), and 63 is the intentional noindex (`docs/reports/finish-qa.md` line 132). In the clean production runs TBT is 13 to 155 ms and CLS is 0. The browser painted the LCP element at 259 to 591 ms in four of the eight clean production runs and at 2.3 to 2.5 s in the other four, for a reason that is still unexplained (section 2.5). The simulated LCP of 1.4 to 3.8 s steps by 1.5 to 1.7 s with no change to the page (section 2.2). Only 8 of 24 production runs and 3 of 24 local runs were clean, because the Mac was above a load of 6 for 98% of the time. Read every score as "clean runs, mostly one per route", and read the run-by-run tables for the spread.

### 2.1 Settings

Lighthouse 13.5.0 (`pnpm dlx lighthouse@13.5.0`, pinned in `scripts/audit/lib.mjs`) drove the system Google Chrome 154.0.8037.98 with `--headless=new`, in navigation mode with the mobile preset. The preset emulates a Moto G Power (2022) at 412x823 and a device pixel ratio of 1.75, and simulates throttling with a round trip of 150 ms, 1,638.4 kbps, a request latency of 562.5 ms and a 4x CPU slowdown (`baseline-lighthouse.json`, `meta.config`). This is the default that `docs/reports/finish-qa.md` used. Each run starts a fresh Chrome profile. Runs go run-major (all routes for run 1, then run 2, then run 3), so one load spike hits one run of several routes and not every run of one route.

Three runs per route, reported as the median with min and max. INP is `null`: Lighthouse navigation mode does not compute it, and lab INP comes from the perf agent's traces.

### 2.2 How to read the LCP numbers

Read this before any LCP in this report.

Lighthouse loads the page once in an unthrottled Chrome. It then estimates what a slow phone would see by replaying the recorded requests and CPU tasks through a model called Lantern. The score uses that estimate, here the **simulated LCP**. The value the browser really recorded is the **observed LCP**. On this app they differ a lot: one local run of `/` painted its LCP at 50 ms and scored a simulated 2.77 s (`baseline-lighthouse.json`, `targets.local.routes.home.runs`).

The simulated LCP also moves in steps that depend on a timing coincidence and not on the page. Lantern cuts its graph at the observed paint time. It drops every request that ended or started after that time (`FirstContentfulPaint.js:104-105`) and every script whose evaluation task started after it (`FirstContentfulPaint.js:48-65`), and the LCP graphs use the observed LCP as that cut (`LargestContentfulPaint.js:33` and `:43`). The files are `@paulirish/trace_engine` 0.0.65, `models/trace/lantern/metrics/`, the version Lighthouse 13.5.0 ships.

The LCP element on `/` is an `h1` in the first HTML response, so the browser paints it as soon as the CSS and fonts are ready: 50 to 224 ms on the local build. The 1.33 MB data chunk arrives and starts evaluating at about the same moment. If the paint comes first, the model leaves the chunk out and reports a short LCP. If the chunk comes first, the model keeps it, adds the time to move 238 KB over a 1.6 Mbps link plus its CPU time, and reports a long one. The step is 1.1 to 1.8 s with no change to the page. The table sorts every run of both targets by observed LCP.

<!-- audit:table lcp-steps -->
| Observed LCP (ms) | Simulated LCP (s) | Perf | Target | Route | Run | Clean |
| ---: | ---: | ---: | --- | --- | ---: | --- |
| 30.0 | 2.62 | 97 | local | `/leaderboard` | 2 | BUSY |
| 31.0 | 2.11 | 99 | local | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | yes |
| 48.0 | 2.62 | 97 | local | `/history` | 1 | BUSY |
| 50.0 | 2.77 | 96 | local | `/` | 2 | yes |
| 56.0 | 2.56 | 97 | local | `/how-to-play` | 1 | BUSY |
| 59.0 | 2.66 | 96 | local | `/leaderboard` | 3 | BUSY |
| 67.0 | 2.56 | 97 | local | `/how-to-play` | 3 | BUSY |
| 76.0 | 2.62 | 97 | local | `/play` | 1 | BUSY |
| 116 | 2.88 | 85 | local | `/r/<token>` | 2 | BUSY |
| 135 | 2.88 | 85 | local | `/r/<token>` | 1 | BUSY |
| 147 | 2.69 | 93 | local | `/history` | 2 | BUSY |
| 154 | 4.29 | 84 | local | `/daily` | 1 | BUSY |
| 170 | 3.01 | 91 | local | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | BUSY |
| 184 | 2.79 | 95 | local | `/` | 3 | BUSY |
| 202 | 4.30 | 83 | local | `/daily` | 3 | BUSY |
| 221 | 3.83 | 86 | local | `/history` | 3 | BUSY |
| 224 | 3.90 | 82 | local | `/` | 1 | BUSY |
| 254 | 2.24 | 93 | local | `/how-to-play` | 2 | BUSY |
| 259 | 1.84 | 100 | prod | `/history` | 1 | yes |
| 271 | 1.38 | 100 | prod | `/how-to-play` | 1 | yes |
| 311 | 2.01 | 96 | prod | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | BUSY |
| 325 | 2.27 | 96 | prod | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | BUSY |
| 327 | 4.36 | 84 | local | `/leaderboard` | 1 | yes |
| 335 | 2.30 | 98 | prod | `/` | 2 | yes |
| 354 | 2.29 | 97 | prod | `/history` | 2 | BUSY |
| 361 | 4.60 | 83 | local | `/play` | 3 | BUSY |
| 373 | 2.27 | 87 | prod | `/how-to-play` | 2 | BUSY |
| 412 | 4.31 | 77 | local | `/daily` | 2 | BUSY |
| 423 | 2.43 | 86 | prod | `/` | 3 | BUSY |
| 435 | 3.74 | 74 | prod | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | BUSY |
| 546 | 4.63 | 82 | local | `/play` | 2 | BUSY |
| 568 | 3.75 | 82 | prod | `/daily` | 2 | BUSY |
| 584 | 3.94 | 86 | prod | `/play` | 3 | BUSY |
| 587 | 3.80 | 88 | prod | `/play` | 2 | BUSY |
| 591 | 3.79 | 88 | prod | `/play` | 1 | yes |
| 607 | 3.86 | 78 | prod | `/r/<token>` | 3 | BUSY |
| 694 | 1.40 | 100 | prod | `/how-to-play` | 3 | BUSY |
| 834 | 4.67 | 62 | local | `/r/<token>` | 3 | BUSY |
| 878 | 3.57 | 87 | prod | `/leaderboard` | 2 | BUSY |
| 1026 | 3.65 | 80 | prod | `/r/<token>` | 2 | BUSY |
| 1151 | 4.14 | 83 | local | `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | BUSY |
| 1276 | 3.56 | 90 | prod | `/history` | 3 | BUSY |
| 1306 | 3.56 | 88 | prod | `/leaderboard` | 3 | BUSY |
| 1335 | 3.68 | 86 | prod | `/daily` | 3 | BUSY |
| 2305 | 3.82 | 86 | prod | `/daily` | 1 | yes |
| 2328 | 3.80 | 86 | prod | `/r/<token>` | 1 | yes |
| 2501 | 3.76 | 84 | prod | `/leaderboard` | 1 | yes |
| 2542 | 3.79 | 86 | prod | `/` | 1 | yes |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.*.routes[*].runs; observedLcpMs is unthrottled, lcpMs is the simulated value the score uses.
<!-- /audit:table -->

Reading the table. Every local run that painted in under 100 ms gives a short simulated LCP of 2.1 to 2.9 s. The runs that gave 3.9 to 4.6 s on the local build painted at 154 to 546 ms. Local `/daily` gave 4.29 to 4.31 s in all three runs at observed 154 to 412 ms, so for some routes the long step is stable and not a coincidence. Production `/how-to-play` and `/history` gave 1.4 to 2.3 s. The four late production paints (2.3 to 2.5 s) all gave 3.76 to 3.82 s. Production `/play`, `/daily`, `/leaderboard` and `/r/<token>` gave 3.5 to 3.9 s at observed paints of 0.6 to 1.3 s as well. So the long step is not a function of the observed time alone. The table shows the effect and the source files above give the rule. They do not give a prediction for a given route.

What follows:

- A difference of one to two seconds in simulated LCP between two runs of identical code is ordinary here. Local `/leaderboard` gave 4.36 s in run 1 and 2.62 s in run 2 of the same build (`baseline-lighthouse.json`, `targets.local.routes.leaderboard.runs`).
- A fix that shifts the paint by tens of milliseconds can flip the step. A fix that takes the data chunk off the page removes the step.
- Judge a change with the observed LCP, the JavaScript bytes (section 3) and a second throttling method, and quote the simulated LCP only beside them. Whoever measures next should record observed LCP and run a few loads with DevTools throttling.

### 2.3 Production

<!-- audit:table lighthouse-scores prod -->
| Route | Perf | A11y | Best practices | SEO | LCP | FCP | TBT | CLS | Speed Index | Clean / recorded runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 92 (86 to 98) | 100 | 100 | 63 | 3.05 (2.30 to 3.79) s | 1.10 (0.95 to 1.24) s | 99 (91 to 107) ms | 0.000 | 2.52 (0.95 to 4.09) s | 2/3 |
| `/play` | 88 | 100 | 100 | 63 | 3.79 s | 0.94 s | 84 ms | 0.000 | 0.94 s | 1/3 |
| `/daily` | 86 | 100 | 100 | 63 | 3.82 s | 1.27 s | 101 ms | 0.000 | 3.81 s | 1/3 |
| `/leaderboard` | 84 | 100 | 100 | 63 | 3.76 s | 1.60 s | 155 ms | 0.000 | 4.44 s | 1/3 |
| `/history` | 100 | 100 | 100 | 63 | 1.84 s | 0.81 s | 49 ms | 0.000 | 0.81 s | 1/3 |
| `/how-to-play` | 100 | 100 | 100 | 63 | 1.38 s | 0.80 s | 13 ms | 0.000 | 0.80 s | 1/3 |
| `/r/<token>` | 86 | 100 | 100 | 58 | 3.80 s | 1.56 s | 85 ms | 0.000 | 3.90 s | 1/3 |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 96 (74 to 96) | 100 | 100 | 63 | 2.27 (2.01 to 3.74) s | 0.96 (0.92 to 0.97) s | 193 (180 to 608) ms | 0.028 | 0.99 (0.98 to 1.55) s | 0/3 (numbers from busy runs) |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.prod.routes; each route's numbers are its clean runs only, and a route with no clean run shows its busy runs and says so in the last column.
<!-- /audit:table -->

<!-- audit:table lighthouse-lcp prod -->
| Route | LCP (simulated) | LCP (observed) | LCP element (median run) | TTFB | Load delay | Load time | Render delay |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| `/` | 3.05 (2.30 to 3.79) s | 1439 (335 to 2542) ms | `section.puRpEa_builder > div.puRpEa_bar > div > h1.puRpEa_title` | 148 ms | n/a | n/a | 187 ms |
| `/play` | 3.79 s | 591 ms | `body > main.page > section.M2ks9W_invalid > h1` | 128 ms | n/a | n/a | 463 ms |
| `/daily` | 3.82 s | 2305 ms | `main.page > section.M2ks9W_start > div.M2ks9W_hero > p.M2ks9W_lede` | 128 ms | n/a | n/a | 2177 ms |
| `/leaderboard` | 3.76 s | 2501 ms | `body > main.page > div.rpEM1q_screen > p.rpEM1q_caption` | 409 ms | n/a | n/a | 2092 ms |
| `/history` | 1.84 s | 259 ms | `body > footer.site-footer > p` | 117 ms | n/a | n/a | 142 ms |
| `/how-to-play` | 1.38 s | 271 ms | `main.page > section#cup8 > div.cx1U_q_body > p` | 148 ms | n/a | n/a | 124 ms |
| `/r/<token>` | 3.80 s | 2328 ms | `header.nM2n4W_hero > div.nM2n4W_heroMain > div.nM2n4W_recordBlock > span.nM2n4W_record` | 126 ms | n/a | n/a | 2202 ms |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2.27 (2.01 to 3.74) s | 325 (311 to 435) ms | `body > footer.site-footer > p` | 127 ms | n/a | n/a | 198 ms |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.prod.routes[*].medianLcpRun; the four phases are observed, unthrottled values of the median run.
<!-- /audit:table -->

<!-- audit:table lighthouse-weight prod -->
| Route | JS requests | JS transferred | All transferred | Server response | Unused JS (est. savings) | Load at start | Benchmark index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 12 | 451.3 (451.3 to 451.4) kB | 579.9 (579.9 to 580.0) kB | 52.5 (47.0 to 58.0) ms | 48.7 kB | 5.4 (4.9 to 5.8) | 4053 (4039 to 4068) |
| `/play` | 13 | 462.1 kB | 586.5 kB | 27.0 ms | 50.2 kB | 5.3 | 4054 |
| `/daily` | 12 | 451.3 kB | 572.8 kB | 38.0 ms | 48.7 kB | 5.0 | 4052 |
| `/leaderboard` | 13 | 455.1 kB | 577.2 kB | 105 ms | 28.5 kB | 5.2 | 4124 |
| `/history` | 12 | 451.3 kB | 573.5 kB | 31.0 ms | 49.6 kB | 4.8 | 4059 |
| `/how-to-play` | 12 | 451.2 kB | 573.1 kB | 30.0 ms | 296.1 kB | 4.8 | 4041 |
| `/r/<token>` | 13 | 452.4 kB | 594.8 kB | 31.0 ms | 50.6 kB | 4.9 | 4020 |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 13 | 462.1 (462.1 to 462.2) kB | 587.2 (587.2 to 587.2) kB | 34.0 (28.0 to 43.0) ms | 50.1 kB | 42.5 (35.0 to 50.2) | 3822 (3809 to 3829) |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.prod.routes.
<!-- /audit:table -->

<!-- audit:table lighthouse-runs prod -->
| Route | Run | Perf | LCP s (simulated) | LCP ms (observed) | TBT ms | CLS | Load, start to after | Clean | Benchmark index | API idle before (min) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| `/` | 1 | 86 | 3.79 | 2542 | 91 | 0.000 | 5.85 to 5.32 | yes | 4039 | n/a |
| `/` | 2 | 98 | 2.30 | 335 | 107 | 0.000 | 4.86 to 5.59 | yes | 4068 | n/a |
| `/` | 3 | 86 | 2.43 | 423 | 467 | 0.000 | 40.22 to 40.03 | BUSY (load 40.22 at the start; load 40.03 after; benchmark index 3748) | 3748 | n/a |
| `/play` | 1 | 88 | 3.79 | 591 | 84 | 0.000 | 5.32 to 4.96 | yes | 4054 | n/a |
| `/play` | 2 | 88 | 3.80 | 587 | 128 | 0.000 | 5.59 to 37.27 | BUSY (load 37.27 after; benchmark index 3883) | 3883 | n/a |
| `/play` | 3 | 86 | 3.94 | 584 | 169 | 0.000 | 41.03 to 49.74 | BUSY (load 41.03 at the start; load 49.74 after; benchmark index 3873) | 3873 | n/a |
| `/daily` | 1 | 86 | 3.82 | 2305 | 101 | 0.000 | 4.96 to 5.2 | yes | 4052 | n/a |
| `/daily` | 2 | 82 | 3.75 | 568 | 318 | 0.046 | 40.19 to 36.44 | BUSY (load 40.19 at the start; load 36.44 after; benchmark index 3746) | 3746 | n/a |
| `/daily` | 3 | 86 | 3.68 | 1335 | 186 | 0.000 | 55.4 to 54.12 | BUSY (load 55.4 at the start; load 54.12 after; benchmark index 3737) | 3737 | n/a |
| `/leaderboard` | 1 | 84 | 3.76 | 2501 | 155 | 0.000 | 5.2 to 4.81 | yes | 4124 | 21.1 |
| `/leaderboard` | 2 | 87 | 3.57 | 878 | 212 | 0.000 | 36.49 to 34.36 | BUSY (load 36.49 at the start; load 34.36 after; benchmark index 3695) | 3695 | 3.3 |
| `/leaderboard` | 3 | 88 | 3.56 | 1306 | 168 | 0.000 | 51.47 to 45.91 | BUSY (load 51.47 at the start; load 45.91 after; benchmark index 3836) | 3836 | 5.4 |
| `/history` | 1 | 100 | 1.84 | 259 | 49 | 0.000 | 4.81 to 4.75 | yes | 4059 | n/a |
| `/history` | 2 | 97 | 2.29 | 354 | 113 | 0.000 | 35.44 to 42.08 | BUSY (load 35.44 at the start; load 42.08 after; benchmark index 3727) | 3727 | n/a |
| `/history` | 3 | 90 | 3.56 | 1276 | 103 | 0.000 | 40.89 to 35.48 | BUSY (load 40.89 at the start; load 35.48 after; benchmark index 3841) | 3841 | n/a |
| `/how-to-play` | 1 | 100 | 1.38 | 271 | 13 | 0.000 | 4.75 to 4.86 | yes | 4041 | n/a |
| `/how-to-play` | 2 | 87 | 2.27 | 373 | 47 | 0.233 | 38.85 to 37.28 | BUSY (load 38.85 at the start; load 37.28 after; benchmark index 3609) | 3609 | n/a |
| `/how-to-play` | 3 | 100 | 1.40 | 694 | 24 | 0.000 | 25.98 to 26.09 | BUSY (load 25.98 at the start; load 26.09 after; benchmark index 3870) | 3870 | n/a |
| `/r/<token>` | 1 | 86 | 3.80 | 2328 | 85 | 0.000 | 4.86 to 4.86 | yes | 4020 | n/a |
| `/r/<token>` | 2 | 80 | 3.65 | 1026 | 409 | 0.000 | 37.22 to 36.89 | BUSY (load 37.22 at the start; load 36.89 after; benchmark index 3735) | 3735 | n/a |
| `/r/<token>` | 3 | 78 | 3.86 | 607 | 91 | 0.211 | 31.95 to 29.95 | BUSY (load 31.95 at the start; load 29.95 after; benchmark index 3782) | 3782 | n/a |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | 96 | 2.27 | 325 | 180 | 0.028 | 34.96 to 42.06 | BUSY (load 34.96 at the start; load 42.06 after; benchmark index 3822) | 3822 | n/a |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | 74 | 3.74 | 435 | 608 | 0.028 | 42.52 to 49.14 | BUSY (load 42.52 at the start; load 49.14 after; benchmark index 3829) | 3829 | n/a |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | 96 | 2.01 | 311 | 193 | 0.028 | 50.19 to 56.13 | BUSY (load 50.19 at the start; load 56.13 after; benchmark index 3809) | 3809 | n/a |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.prod.routes[*].runs; API idle is the time since the previous request to the leaderboard function, filled for /leaderboard only.
<!-- /audit:table -->

Eight of 24 runs were clean (`runsClean` per route): two for `/`, one for each of the other six routes, none for the extra row. The tables use the clean runs. The extra row `/play?mode=kanto151...` has no clean run, so its numbers (96 with a range of 74 to 96, LCP 2.27 s with 2.01 to 3.74 s, TBT 193 ms with 180 to 608 ms) come from the least-loaded busy runs, taken at loads of 35 to 56. Busy runs were not uniformly worse. Production `/play` scored 88, 88 and 86, `/how-to-play` 100, 87 and 100, and `/r/<token>` 86, 80 and 78. TBT was the metric that moved most, for example 91 ms in the clean `/` run and 467 ms in the busy one.

No route has an image as its LCP element. The element is text on every route (the `h1` on `/` and `/play`, a paragraph elsewhere). So the LCP phases are TTFB 117 to 409 ms and render delay, with load delay and load time not applicable (`lcp.observedPhasesMs`). Server response time is 30 to 105 ms. `/leaderboard` had the longest TTFB, 409 ms, in a run that came 21 minutes after the last API request, so it probably met a cold function (`apiIdleMinutesBefore`). Every route loads 12 or 13 scripts and transfers 451 to 462 kB of JavaScript, which is brotli quality 3 from the CDN (section 3). `/how-to-play` shows 296.1 kB of unused JavaScript against 28 to 51 kB on the other routes, because it ships the data chunk it does not use.

CLS needs a quiet re-measure. The clean production runs have 0. The busy production runs have 0.211 on `/r/<token>` (run 3), 0.233 on `/how-to-play` (run 2) and 0.046 on `/daily` (run 2). Hold the shifts as a lead for the UI agents and not as a result.

### 2.4 Local build

<!-- audit:table lighthouse-scores local -->
| Route | Perf | A11y | Best practices | SEO | LCP | FCP | TBT | CLS | Speed Index | Clean / recorded runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 96 | 100 | 100 | 63 | 2.77 s | 0.90 s | 45 ms | 0.000 | 0.90 s | 1/3 |
| `/play` | 83 (82 to 97) | 100 | 100 | 63 | 4.60 (2.62 to 4.63) s | 0.91 (0.91 to 0.93) s | 136 (54 to 160) ms | 0.000 | 0.91 (0.91 to 0.93) s | 0/3 (numbers from busy runs) |
| `/daily` | 83 (77 to 84) | 100 | 100 | 63 | 4.30 (4.29 to 4.31) s | 0.91 (0.91 to 0.91) s | 182 (130 to 363) ms | 0.046 (0.046 to 0.046) | 0.91 (0.91 to 0.91) s | 0/3 (numbers from busy runs) |
| `/leaderboard` | 84 | 100 | 96 | 63 | 4.36 s | 0.91 s | 120 ms | 0.000 | 0.91 s | 1/3 |
| `/history` | 93 (86 to 97) | 100 | 100 | 63 | 2.69 (2.62 to 3.83) s | 0.92 (0.91 to 0.95) s | 162 (55 to 213) ms | 0.000 (0.000 to 0.000) | 0.92 (0.91 to 0.95) s | 0/3 (numbers from busy runs) |
| `/how-to-play` | 97 (93 to 97) | 100 | 100 | 63 | 2.56 (2.24 to 2.56) s | 0.92 (0.91 to 0.92) s | 22 (18 to 266) ms | 0.000 (0.000 to 0.000) | 0.92 (0.91 to 0.92) s | 0/3 (numbers from busy runs) |
| `/r/<token>` | 85 (62 to 85) | 100 | 100 | 58 | 2.88 (2.88 to 4.67) s | 1.07 (1.06 to 1.10) s | 76 (67 to 432) ms | 0.211 | 1.07 (1.06 to 2.09) s | 0/3 (numbers from busy runs) |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 99 | 100 | 100 | 63 | 2.11 s | 0.90 s | 47 ms | 0.028 | 0.90 s | 1/3 |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes; each route's numbers are its clean runs only, and a route with no clean run shows its busy runs and says so in the last column.
<!-- /audit:table -->

<!-- audit:table lighthouse-lcp local -->
| Route | LCP (simulated) | LCP (observed) | LCP element (median run) | TTFB | Load delay | Load time | Render delay |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| `/` | 2.77 s | 50.0 ms | `section.puRpEa_builder > div.puRpEa_bar > div > h1.puRpEa_title` | 2.1 ms | n/a | n/a | 47.5 ms |
| `/play` | 4.60 (2.62 to 4.63) s | 361 (76.0 to 546) ms | `body > main.page > section.M2ks9W_invalid > h1` | 17.6 ms | n/a | n/a | 344 ms |
| `/daily` | 4.30 (4.29 to 4.31) s | 202 (154 to 412) ms | `main.page > section.M2ks9W_start > div.M2ks9W_hero > p.M2ks9W_lede` | 11.0 ms | n/a | n/a | 191 ms |
| `/leaderboard` | 4.36 s | 327 ms | `body > main.page > div.rpEM1q_screen > p.rpEM1q_caption` | 3.3 ms | n/a | n/a | 324 ms |
| `/history` | 2.69 (2.62 to 3.83) s | 147 (48.0 to 221) ms | `body > footer.site-footer > p` | 28.0 ms | n/a | n/a | 119 ms |
| `/how-to-play` | 2.56 (2.24 to 2.56) s | 67.0 (56.0 to 254) ms | `main.page > section#cup8 > div.cx1U_q_body > p` | 9.6 ms | n/a | n/a | 46.6 ms |
| `/r/<token>` | 2.88 (2.88 to 4.67) s | 135 (116 to 834) ms | `header.nM2n4W_hero > div.nM2n4W_heroMain > div.nM2n4W_recordBlock > span.nM2n4W_record` | 12.6 ms | n/a | n/a | 103 ms |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2.11 s | 31.0 ms | `body > footer.site-footer > p` | 3.0 ms | n/a | n/a | 28.3 ms |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes[*].medianLcpRun; the four phases are observed, unthrottled values of the median run.
<!-- /audit:table -->

<!-- audit:table lighthouse-weight local -->
| Route | JS requests | JS transferred | All transferred | Server response | Unused JS (est. savings) | Load at start | Benchmark index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 12 | 443.1 kB | 582.5 kB | 1.0 ms | 27.1 kB | 5.5 | 4141 |
| `/play` | 13 | 453.6 kB | 591.7 (591.7 to 591.7) kB | 14.0 (8.0 to 133) ms | 29.2 (29.1 to 29.3) kB | 30.8 (29.3 to 52.3) | 3786 (3687 to 4062) |
| `/daily` | 12 | 443.1 kB | 576.2 kB | 9.0 (2.0 to 18.0) ms | 27.7 kB | 46.5 (20.0 to 68.7) | 3854 (3839 to 4003) |
| `/leaderboard` | 13 | 446.9 kB | 582.8 kB | 3.0 ms | 28.0 kB | 5.9 | 4099 |
| `/history` | 12 | 443.1 kB | 576.2 kB | 1.0 (1.0 to 18.0) ms | 28.0 kB | 33.0 (12.1 to 93.2) | 3966 (3863 to 4025) |
| `/how-to-play` | 12 | 443.1 kB | 576.6 kB | 8.0 (8.0 to 15.0) ms | 289.8 kB | 22.6 (12.8 to 100.8) | 3918 (3856 to 3978) |
| `/r/<token>` | 13 | 444.3 kB | 603.7 (603.7 to 603.7) kB | 20.0 (11.0 to 66.0) ms | 29.1 (29.0 to 29.2) kB | 28.0 (26.2 to 65.2) | 3677 (3607 to 3792) |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 13 | 453.6 kB | 592.4 kB | 2.0 ms | 29.1 kB | 5.7 | 4101 |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes.
<!-- /audit:table -->

<!-- audit:table lighthouse-runs local -->
| Route | Run | Perf | LCP s (simulated) | LCP ms (observed) | TBT ms | CLS | Load, start to after | Clean | Benchmark index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| `/` | 1 | 82 | 3.90 | 224 | 284 | 0.000 | 5.33 to 5.88 | BUSY (benchmark index 3427) | 3427 |
| `/` | 2 | 96 | 2.77 | 50 | 45 | 0.000 | 5.45 to 5.06 | yes | 4141 |
| `/` | 3 | 95 | 2.79 | 184 | 81 | 0.000 | 36.66 to 34.55 | BUSY (load 36.66 at the start; load 34.55 after; benchmark index 3750) | 3750 |
| `/play` | 1 | 97 | 2.62 | 76 | 54 | 0.000 | 29.34 to 27.22 | BUSY (load 29.34 at the start; load 27.22 after) | 4062 |
| `/play` | 2 | 82 | 4.63 | 546 | 160 | 0.000 | 30.79 to 44.6 | BUSY (load 30.79 at the start; load 44.6 after; benchmark index 3687) | 3687 |
| `/play` | 3 | 83 | 4.60 | 361 | 136 | 0.000 | 52.31 to 51.88 | BUSY (load 52.31 at the start; load 51.88 after; benchmark index 3786) | 3786 |
| `/daily` | 1 | 84 | 4.29 | 154 | 130 | 0.046 | 19.99 to 17.68 | BUSY (load 19.99 at the start; load 17.68 after) | 4003 |
| `/daily` | 2 | 77 | 4.31 | 412 | 363 | 0.046 | 68.72 to 75.79 | BUSY (load 68.72 at the start; load 75.79 after; benchmark index 3854) | 3854 |
| `/daily` | 3 | 83 | 4.30 | 202 | 182 | 0.046 | 46.45 to 43.42 | BUSY (load 46.45 at the start; load 43.42 after; benchmark index 3839) | 3839 |
| `/leaderboard` | 1 | 84 | 4.36 | 327 | 120 | 0.000 | 5.88 to 5.69 | yes | 4099 |
| `/leaderboard` | 2 | 97 | 2.62 | 30 | 55 | 0.000 | 5.06 to 6.96 | BUSY (load 6.96 after) | 4126 |
| `/leaderboard` | 3 | 96 | 2.66 | 59 | 111 | 0.000 | 34.31 to 30.78 | BUSY (load 34.31 at the start; load 30.78 after; benchmark index 3745) | 3745 |
| `/history` | 1 | 97 | 2.62 | 48 | 55 | 0.000 | 12.1 to 11.98 | BUSY (load 12.1 at the start; load 11.98 after) | 4025 |
| `/history` | 2 | 93 | 2.69 | 147 | 213 | 0.000 | 93.19 to 98.42 | BUSY (load 93.19 at the start; load 98.42 after; benchmark index 3863) | 3863 |
| `/history` | 3 | 86 | 3.83 | 221 | 162 | 0.000 | 33 to 29.82 | BUSY (load 33 at the start; load 29.82 after) | 3966 |
| `/how-to-play` | 1 | 97 | 2.56 | 56 | 18 | 0.000 | 12.82 to 15.27 | BUSY (load 12.82 at the start; load 15.27 after) | 3978 |
| `/how-to-play` | 2 | 93 | 2.24 | 254 | 266 | 0.000 | 100.79 to 82.54 | BUSY (load 100.79 at the start; load 82.54 after; benchmark index 3856) | 3856 |
| `/how-to-play` | 3 | 97 | 2.56 | 67 | 22 | 0.000 | 22.62 to 19.88 | BUSY (load 22.62 at the start; load 19.88 after) | 3918 |
| `/r/<token>` | 1 | 85 | 2.88 | 135 | 76 | 0.211 | 27.96 to 30.39 | BUSY (load 27.96 at the start; load 30.39 after; benchmark index 3607) | 3607 |
| `/r/<token>` | 2 | 85 | 2.88 | 116 | 67 | 0.211 | 65.16 to 61.46 | BUSY (load 65.16 at the start; load 61.46 after; benchmark index 3792) | 3792 |
| `/r/<token>` | 3 | 62 | 4.67 | 834 | 432 | 0.211 | 26.22 to 36.87 | BUSY (load 26.22 at the start; load 36.87 after; benchmark index 3677) | 3677 |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | 99 | 2.11 | 31 | 47 | 0.028 | 5.69 to 5.45 | yes | 4101 |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | 91 | 3.01 | 170 | 205 | 0.000 | 43.46 to 40.83 | BUSY (load 43.46 at the start; load 40.83 after; benchmark index 3806) | 3806 |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | 83 | 4.14 | 1151 | 221 | 0.028 | 35.22 to 33.3 | BUSY (load 35.22 at the start; load 33.3 after; benchmark index 3597) | 3597 |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes[*].runs.
<!-- /audit:table -->

Three of 24 runs were clean: `/` run 2, `/leaderboard` run 1 and the kanto151 row run 1. The five other routes have no clean run, so their numbers come from the least-loaded busy runs (loads of 12 to 52, benchmark index 3687 to 4062), and the table says so. TTFB is 2 to 3 ms because the server is on localhost, and the JavaScript transfer is 443 to 454 kB of gzip. Best Practices is 96 on `/leaderboard` in every run: the browser logs one console error for the API call that answers 503 without a database, as in `docs/reports/finish-qa.md`. On the local build the run page `/r/<token>` has a CLS of 0.211 in all three runs and `/daily` has 0.046 in all three. All six runs were busy, and the clean production runs of the same pages measured 0, so this is a lead and not a result (see the production note above).

The local numbers are the ones to compare with dispatch 5 (section 6). Most of the routes show the same two-level pattern as the production runs: a run lands on the short or the long LCP step (section 2.2) and the score follows. `/leaderboard` is the clearest case: 84 at 4.36 s in the clean run, 97 at 2.62 s and 96 at 2.66 s in two busy runs (a load of 6.96 after the first, and 34 at the start of the second).

### 2.5 Late first paint on production

Four of the eight clean production runs painted the LCP element 2.3 to 2.5 s after the request, against 0.26 to 0.59 s for the other four: `/` run 1, `/daily` run 1, `/leaderboard` run 1 and `/r/<token>` run 1. All four came in the first pass at a load of 5 to 6. None of the 16 busy production runs had an observed LCP later than 1.4 s, and none of the 24 local runs had one later than 1.2 s. So load did not cause it.

What the data rules out. The network was done: the HTML ended at 186 to 861 ms and the initial resources at 379 to 1481 ms, and the load event fired at 338 to 885 ms. JavaScript was not blocking: the main thread had no task over 50 ms, the longest task was 27 to 42 ms and the whole load held 135 to 190 ms of task time (`milestones.mainThread`). Compare `/` run 2, which painted at 335 ms with the same code and 150 ms of task time.

What it suggests. The router's first prefetch started late too, at 1.29 to 1.51 s instead of 0.31 to 0.39 s, and the paint followed it by 1.01 to 1.03 s in all four runs. Next starts that prefetch from an `IntersectionObserver` (`node_modules/next/dist/client/components/links.js` lines 95 to 97), and an observer only reports during a rendering update. So the page seems to have had no rendering opportunity for about a second after it was ready. That points at the frame scheduling of the headless Chrome on a busy Mac, not at the page. It is not proven: no Chrome trace was kept, and a trace of a late run would settle it. Local runs never did it. The effect is large because it moves the simulated LCP to the long step (3.76 to 3.82 s in all four runs). A real phone may never see it. Do not fix the app for it before a trace shows the cause.

<!-- audit:table lighthouse-paint prod -->
| Route | Run | HTML done (ms) | Initial resources done (ms) | First router prefetch starts (ms) | DOMContentLoaded (ms) | Load event (ms) | First paint (ms) | LCP (ms) | Main-thread task time, whole load (ms) | Longest task (ms) | Clean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 1 | 437 | 706 | 1508 | 579 | 647 | 2542 | 2542 | 175 | 26.8 | yes |
| `/` | 2 | 183 | 428 | 392 | 289 | 358 | 335 | 335 | 150 | 29.6 | yes |
| `/` | 3 | 162 | 597 | 534 | 368 | 507 | 423 | 423 | 441 | 93.4 | BUSY |
| `/play` | 1 | 273 | 273 | 327 | 280 | 323 | 284 | 591 | 122 | 28.4 | yes |
| `/play` | 2 | 1547 | 1648 | 1618 | 1587 | 1591 | 287 | 587 | 259 | 48.4 | BUSY |
| `/play` | 3 | 233 | 312 | 391 | 304 | 373 | 309 | 584 | 219 | 40.3 | BUSY |
| `/daily` | 1 | 186 | 379 | 1289 | 291 | 338 | 2305 | 2305 | 161 | 32.1 | yes |
| `/daily` | 2 | 191 | 364 | 494 | 363 | 467 | 385 | 568 | 344 | 54.4 | BUSY |
| `/daily` | 3 | 236 | 490 | 1318 | 414 | 433 | 1335 | 1335 | 213 | 45.0 | BUSY |
| `/leaderboard` | 1 | 861 | 1481 | 1489 | 879 | 885 | 2501 | 2501 | 190 | 41.6 | yes |
| `/leaderboard` | 2 | 810 | 862 | 924 | 836 | 840 | 568 | 878 | 291 | 56.9 | BUSY |
| `/leaderboard` | 3 | 237 | 1282 | 1293 | 405 | 415 | 1306 | 1306 | 194 | 43.2 | BUSY |
| `/history` | 1 | 152 | 355 | 320 | 231 | 315 | 259 | 259 | 129 | 26.0 | yes |
| `/history` | 2 | 227 | 378 | 422 | 318 | 414 | 354 | 354 | 217 | 32.2 | BUSY |
| `/history` | 3 | 169 | 405 | 1262 | 293 | 359 | 1276 | 1276 | 196 | 28.5 | BUSY |
| `/how-to-play` | 1 | 198 | 442 | 309 | 256 | 303 | 271 | 271 | 86.6 | 17.9 | yes |
| `/how-to-play` | 2 | 169 | 361 | 357 | 256 | 370 | 373 | 373 | 173 | 20.9 | BUSY |
| `/how-to-play` | 3 | 484 | 753 | 799 | 686 | 791 | 694 | 694 | 125 | 19.4 | BUSY |
| `/r/<token>` | 1 | 593 | 1454 | 1306 | 610 | 615 | 2328 | 2328 | 135 | 28.5 | yes |
| `/r/<token>` | 2 | 908 | 1361 | 1052 | 950 | 1001 | 489 | 1026 | 449 | 60.9 | BUSY |
| `/r/<token>` | 3 | 343 | 343 | 382 | 366 | 368 | 290 | 607 | 189 | 31.5 | BUSY |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | 227 | 331 | 396 | 309 | 389 | 325 | 325 | 231 | 42.6 | BUSY |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | 179 | 343 | 617 | 547 | 561 | 435 | 435 | 510 | 70.7 | BUSY |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | 224 | 323 | 427 | 307 | 377 | 311 | 311 | 236 | 40.2 | BUSY |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.prod.routes[*].runs[*].milestones and observedFcpMs; all values are from the unthrottled run, in ms from the first request. The longest task is the longest top-level main-thread task over 5 ms that Lighthouse lists; n/a means none was listed.
<!-- /audit:table -->

<!-- audit:table lighthouse-paint local -->
| Route | Run | HTML done (ms) | Initial resources done (ms) | First router prefetch starts (ms) | DOMContentLoaded (ms) | Load event (ms) | First paint (ms) | LCP (ms) | Main-thread task time, whole load (ms) | Longest task (ms) | Clean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 1 | 10.9 | 385 | 1160 | 179 | 288 | 224 | 224 | 434 | 68.0 | BUSY |
| `/` | 2 | 2.0 | 99.8 | 102 | 10.0 | 70.0 | 50.0 | 50.0 | 123 | 27.2 | yes |
| `/` | 3 | 10.6 | 239 | 276 | 112 | 221 | 184 | 184 | 293 | 44.8 | BUSY |
| `/play` | 1 | 21.3 | 106 | 137 | 65.0 | 100 | 57.0 | 76.0 | 150 | 30.2 | BUSY |
| `/play` | 2 | 190 | 473 | 326 | 238 | 502 | 344 | 546 | 228 | 36.5 | BUSY |
| `/play` | 3 | 45.8 | 147 | 158 | 75.0 | 142 | 82.0 | 361 | 166 | 30.5 | BUSY |
| `/daily` | 1 | 2.5 | 98.3 | 137 | 34.0 | 94.0 | 54.0 | 154 | 156 | 35.8 | BUSY |
| `/daily` | 2 | 19.4 | 120 | 284 | 152 | 245 | 188 | 412 | 399 | 79.5 | BUSY |
| `/daily` | 3 | 9.3 | 133 | 182 | 91.0 | 127 | 65.0 | 202 | 200 | 46.1 | BUSY |
| `/leaderboard` | 1 | 18.2 | 83.8 | 92.3 | 28.0 | 80.0 | 32.0 | 327 | 128 | 36.1 | yes |
| `/leaderboard` | 2 | 46.4 | 165 | 232 | 179 | 220 | 30.0 | 30.0 | 334 | 74.7 | BUSY |
| `/leaderboard` | 3 | 15.2 | 119 | 167 | 49.0 | 111 | 59.0 | 59.0 | 180 | 44.6 | BUSY |
| `/history` | 1 | 2.0 | 76.0 | 104 | 20.0 | 72.0 | 48.0 | 48.0 | 116 | 27.3 | BUSY |
| `/history` | 2 | 19.8 | 207 | 261 | 166 | 203 | 147 | 147 | 218 | 49.6 | BUSY |
| `/history` | 3 | 1.8 | 236 | 248 | 130 | 221 | 135 | 221 | 308 | 47.0 | BUSY |
| `/how-to-play` | 1 | 10.2 | 98.2 | 98.7 | 74.0 | 76.0 | 56.0 | 56.0 | 127 | 18.0 | BUSY |
| `/how-to-play` | 2 | 18.2 | 367 | 377 | 210 | 323 | 223 | 254 | 426 | 79.9 | BUSY |
| `/how-to-play` | 3 | 9.9 | 111 | 119 | 90.0 | 93.0 | 67.0 | 67.0 | 156 | 18.2 | BUSY |
| `/r/<token>` | 1 | 64.9 | 138 | 187 | 84.0 | 184 | 89.0 | 135 | 216 | 30.6 | BUSY |
| `/r/<token>` | 2 | 50.7 | 165 | 202 | 91.0 | 158 | 75.0 | 116 | 194 | 29.6 | BUSY |
| `/r/<token>` | 3 | 353 | 496 | 625 | 559 | 615 | 478 | 834 | 475 | 79.3 | BUSY |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 1 | 14.9 | 80.1 | 91.2 | 25.0 | 77.0 | 31.0 | 31.0 | 116 | 27.6 | yes |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 2 | 18.9 | 249 | 255 | 85.0 | 221 | 170 | 170 | 324 | 48.1 | BUSY |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 3 | 31.5 | 235 | 1192 | 189 | 224 | 1151 | 1151 | 311 | 47.0 | BUSY |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes[*].runs[*].milestones and observedFcpMs; all values are from the unthrottled run, in ms from the first request. The longest task is the longest top-level main-thread task over 5 ms that Lighthouse lists; n/a means none was listed.
<!-- /audit:table -->

## 3. First-load JavaScript

**Verdict.** Heavy, and heavier than the route needs. Every route that runs the engine needs 1.92 to 1.97 MB of JavaScript decoded (0.41 to 0.43 MB gzip), and `/how-to-play` needs 0.58 MB (`baseline-first-load-js.json`, `methodA.routes`). A browser fetches 1.99 to 2.02 MB on every route, `/how-to-play` included, because the router prefetches the pages behind visible links and they bring the 1.33 MB data chunk with them (`methodB.local.routes`). That chunk is 96.8% JSON. Method (a), built from `.next`, and method (b), measured in Chromium, agree within 5% on five of nine URLs and differ on four. The prefetch explains all four (section 3.4). Production sends brotli quality 3, so its bytes on the wire sit 41 to 47% above the quality 11 model of (a) until (a) is priced the same way.

### 3.1 Method

**(a) From the build output.** Next 16 no longer prints First Load JS in `pnpm build`, so the number is rebuilt from the `.next` artifacts of the served build: `build-manifest.json` `rootMainFiles` plus every `entryJSFiles` list in each route's `page_client-reference-manifest.js`. The rebuilt set is cross-checked against the `<script src>` tags of the prerendered HTML (`HTML cross-check` column). Sizes are raw bytes, gzip level 6 and brotli quality 11 of each file, summed. A chunk a page loads later with `import()` is not in this set, and neither is the `noModule` polyfill chunk (112,594 raw bytes) that modern browsers never fetch (`baseline-first-load-js.json`, `methodA.polyfill`).

**(b) Measured.** Playwright Chromium 156.0.8078.4 with the iPhone 14 viewport and user agent, cache disabled, a fresh context for every load, two loads per route. The tool waits for network idle and fonts, settles for 2 s, then sums JavaScript from CDP network events (`encodedDataLength`, bytes on the wire with headers) and Resource Timing (`encodedBodySize`, `decodedBodySize`). Production loads were paced 4 s apart. Every load is a raw JSONL line, and both loads of a route fetched the same scripts (`Same every load` column).

### 3.2 Method (a): what each route needs

<!-- audit:table first-load-a -->
| Route | Files | Raw bytes | Gzip bytes | Brotli bytes | Shared root files (raw) | Route files (raw) | HTML cross-check |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 10 | 1956544 | 425483 | 317424 | 444729 | 1511815 | match |
| `/play` | 10 | 1966420 | 429647 | 321025 | 444729 | 1521691 | match |
| `/daily` | 10 | 1967298 | 429939 | 321297 | 444729 | 1522569 | match |
| `/leaderboard` | 9 | 1920543 | 414110 | 307229 | 444729 | 1475814 | match |
| `/history` | 9 | 1916009 | 412407 | 305784 | 444729 | 1471280 | match |
| `/how-to-play` | 7 | 582743 | 172514 | 148003 | 444729 | 138014 | match |
| `/r/<token>` | 10 | 1939322 | 420008 | 312500 | 444729 | 1494593 | match |
| `/definitely-not-a-page` | 7 | 582743 | 172514 | 148003 | 444729 | 138014 | match |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodA.routes; build id 7GUR2I93sdwtiww-I_GxH; the noModule polyfill (112594 raw, 39627 gzip, 35158 brotli bytes) is not in these totals.
<!-- /audit:table -->

The ten largest chunks and the routes whose initial set contains them:

<!-- audit:table first-load-largest -->
| Chunk | Raw bytes | Gzip bytes | Brotli bytes | Routes | Kind | Data inside |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `3-hlrqeouyj9k.js` | 1329334 | 238180 | 156273 | home, play, daily, leaderboard, history, run | route entry chunk | 2 JSON modules, 1286302 bytes (96.8% of the chunk) |
| `2vtzm7r4xte7_.js` | 229843 | 71992 | 61421 | all | root main file, every route | none over 50 kB |
| `2zobz-rx-ckbp.js` | 168622 | 46472 | 39322 | all | root main file, every route | none over 50 kB |
| `0cz1d0mv5g_q7.js` | 112594 | 39627 | 35158 | none | not in any initial route set | none over 50 kB |
| `1x0jeksh_m3lu.js` | 111559 | 31660 | 27511 | home, play, daily, leaderboard, history, how-to-play, run, not-found | route entry chunk | none over 50 kB |
| `32_bxz15yg1nj.js` | 29652 | 7784 | 6897 | all | root main file, every route | none over 50 kB |
| `3cotz7qugnofp.js` | 28812 | 10432 | 9215 | daily | route entry chunk | none over 50 kB |
| `1oltc8okiu-f3.js` | 27934 | 10140 | 8943 | play | route entry chunk | none over 50 kB |
| `3c6mzhumg9kp9.js` | 26455 | 8244 | 7266 | home, play, daily, leaderboard, history, how-to-play, run, not-found | route entry chunk | none over 50 kB |
| `2gqcnxdg8cj64.js` | 26409 | 8813 | 7806 | home, play, daily, run | route entry chunk | none over 50 kB |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodA.largestChunks.
<!-- /audit:table -->

`3-hlrqeouyj9k.js` is the known 1.33 MB chunk. 96.8% of it is two `JSON.parse` literals: a Pokédex module of 484,169 bytes at offset 42,377 (source `src/data/pokedex.json`, 485,196 bytes) and a scouting module of 802,133 bytes at offset 525,551 (source `src/data/scouting.json`, 803,138 bytes), 1,286,302 bytes together of 1,329,334 (`baseline-first-load-js.json`, `methodA.largestChunks[0].jsonModules`). The sources are imported by `src/data/pokedex.ts` and `src/scouting/scouting-data.ts`. It is in the initial set of six of the eight routes.

### 3.3 Method (b): what a browser fetches

Local build, gzip:

<!-- audit:table first-load-b local -->
| Route | JS requests | Decoded bytes | Encoded body bytes | Transferred bytes (with headers) | Encoding | Scripts at idle / after settle | Same every load |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| `/` | 12 | 1989288 | 437628 | 443050 | gzip | 12 / 12 | yes |
| `/play` | 13 | 2017222 | 447768 | 453620 | gzip | 13 / 13 | yes |
| `/daily` | 12 | 1989288 | 437628 | 443050 | gzip | 12 / 12 | yes |
| `/leaderboard` | 13 | 1997754 | 441044 | 446895 | gzip | 13 / 13 | yes |
| `/history` | 12 | 1989288 | 437628 | 443050 | gzip | 12 / 12 | yes |
| `/how-to-play` | 12 | 1989288 | 437628 | 443050 | gzip | 12 / 12 | yes |
| `/r/<token>` | 13 | 1990124 | 438464 | 444266 | gzip, none | 13 / 13 | yes |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 13 | 2017222 | 447768 | 453620 | gzip | 13 / 13 | yes |
| `/definitely-not-a-page` | 12 | 1989288 | 437628 | 443050 | gzip | 12 / 12 | yes |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodB.local.routes; 156.0.8078.4, 2 loads per route.
<!-- /audit:table -->

Local build with every `_rsc=` request aborted, which is what the router sends to prefetch the pages behind visible links:

<!-- audit:table first-load-b local-no-prefetch -->
| Route | JS requests | Decoded bytes | Encoded body bytes | Transferred bytes (with headers) | Encoding | Scripts at idle / after settle | Same every load |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| `/` | 10 | 1956544 | 425483 | 430047 | gzip | 10 / 10 | yes |
| `/play` | 10 | 1966420 | 429647 | 434211 | gzip | 10 / 10 | yes |
| `/daily` | 10 | 1967298 | 429939 | 434503 | gzip | 10 / 10 | yes |
| `/leaderboard` | 9 | 1920543 | 414110 | 418243 | gzip | 9 / 9 | yes |
| `/history` | 9 | 1916009 | 412407 | 416539 | gzip | 9 / 9 | yes |
| `/how-to-play` | 7 | 582743 | 172514 | 175615 | gzip | 7 / 7 | yes |
| `/r/<token>` | 10 | 1939322 | 420343 | 424857 | gzip, none | 10 / 10 | yes |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 10 | 1966420 | 429647 | 434211 | gzip | 10 / 10 | yes |
| `/definitely-not-a-page` | 7 | 582743 | 172514 | 175615 | gzip | 7 / 7 | yes |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodB.local-no-prefetch.routes; 156.0.8078.4, 2 loads per route.
<!-- /audit:table -->

Production, brotli:

<!-- audit:table first-load-b prod -->
| Route | JS requests | Decoded bytes | Encoded body bytes | Transferred bytes (with headers) | Encoding | Scripts at idle / after settle | Same every load |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| `/` | 12 | 1989772 | 448420 | 451294 | br | 12 / 12 | yes |
| `/play` | 13 | 2017706 | 459042 | 462146 | br | 13 / 13 | yes |
| `/daily` | 12 | 1989772 | 448420 | 451239 | br | 12 / 12 | yes |
| `/leaderboard` | 13 | 1998238 | 451983 | 454974 | br | 13 / 13 | yes |
| `/history` | 12 | 1989772 | 448420 | 451161 | br | 12 / 12 | yes |
| `/how-to-play` | 12 | 1989772 | 448420 | 451231 | br | 12 / 12 | yes |
| `/r/<token>` | 13 | 1990608 | 449256 | 452198 | br, none | 13 / 13 | yes |
| `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151` | 13 | 2017706 | 459042 | 462008 | br | 13 / 13 | yes |
| `/definitely-not-a-page` | 12 | 1989772 | 448420 | 451194 | br | 12 / 12 | yes |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodB.prod.routes; 156.0.8078.4, 2 loads per route.
<!-- /audit:table -->

Lighthouse agrees with (b): the production `/` run counted 12 JavaScript requests and 451.3 kB transferred (`baseline-lighthouse.json`, `targets.prod.routes.home`), against 12 requests and 451,294 bytes on the wire in (b).

### 3.4 Where (a) and (b) disagree, and why

The gap is over 5% on `/leaderboard`, `/history`, `/how-to-play` and the 404 page, on both targets. The cause is the router prefetch. Once the page is interactive, the router fetches the payloads of the pages behind visible links, and those payloads make the browser download those pages' script chunks. Each fetched file is listed in the last two columns of the tables below. With the prefetch aborted, (b) equals (a) to the byte on all nine URLs, so nothing else explains the gap.

<!-- audit:table first-load-compare local -->
| Route | (a) files / raw / gzip / brotli | (b) files / decoded / encoded | Decoded diff | Encoded diff | Verdict | Scripts in (b) that (a) lacks | Files of (a) not fetched |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `home` | 10 / 1956544 / 425483 / 317424 | 12 / 1989288 / 437628 | +1.7% | +2.9% vs gzip level 6 | within 5% | 2 files, 32744 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `play` | 10 / 1966420 / 429647 / 321025 | 13 / 2017222 / 447768 | +2.6% | +4.2% vs gzip level 6 | within 5% | 3 files, 50802 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `daily` | 10 / 1967298 / 429939 / 321297 | 12 / 1989288 / 437628 | +1.1% | +1.8% vs gzip level 6 | within 5% | 2 files, 21990 B (largest `06uktflp0kf7s.js` 18058 B) | none |
| `leaderboard` | 9 / 1920543 / 414110 / 307229 | 13 / 1997754 / 441044 | +4% | +6.5% vs gzip level 6 | over 5% | 4 files, 77211 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `history` | 9 / 1916009 / 412407 / 305784 | 12 / 1989288 / 437628 | +3.8% | +6.1% vs gzip level 6 | over 5% | 3 files, 73279 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `how-to-play` | 7 / 582743 / 172514 / 148003 | 12 / 1989288 / 437628 | +241.4% | +153.7% vs gzip level 6 | over 5% | 5 files, 1406545 B (largest `3-hlrqeouyj9k.js` 1329334 B) | none |
| `run` | 10 / 1939322 / 420008 / 312500 | 13 / 1990124 / 438464 | +2.6% | +4.3% vs per-file encoding (gzip level 6 or brotli q11, raw below the compression threshold) | within 5% | 3 files, 50802 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `play-kanto151` | 10 / 1966420 / 429647 / 321025 | 13 / 2017222 / 447768 | +2.6% | +4.2% vs gzip level 6 | within 5% | 3 files, 50802 B (largest `3cotz7qugnofp.js` 28812 B) | none |
| `not-found` | 7 / 582743 / 172514 / 148003 | 12 / 1989288 / 437628 | +241.4% | +153.7% vs gzip level 6 | over 5% | 5 files, 1406545 B (largest `3-hlrqeouyj9k.js` 1329334 B) | none |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, comparison.local; files of (a) and (b) paired by file name.
<!-- /audit:table -->

<!-- audit:table first-load-compare local-no-prefetch -->
| Route | (a) files / raw / gzip / brotli | (b) files / decoded / encoded | Decoded diff | Encoded diff | Verdict | Scripts in (b) that (a) lacks | Files of (a) not fetched |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `home` | 10 / 1956544 / 425483 / 317424 | 10 / 1956544 / 425483 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `play` | 10 / 1966420 / 429647 / 321025 | 10 / 1966420 / 429647 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `daily` | 10 / 1967298 / 429939 / 321297 | 10 / 1967298 / 429939 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `leaderboard` | 9 / 1920543 / 414110 / 307229 | 9 / 1920543 / 414110 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `history` | 9 / 1916009 / 412407 / 305784 | 9 / 1916009 / 412407 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `how-to-play` | 7 / 582743 / 172514 / 148003 | 7 / 582743 / 172514 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `run` | 10 / 1939322 / 420008 / 312500 | 10 / 1939322 / 420343 | 0% | 0% vs per-file encoding (gzip level 6 or brotli q11, raw below the compression threshold) | within 5% | none | none |
| `play-kanto151` | 10 / 1966420 / 429647 / 321025 | 10 / 1966420 / 429647 | 0% | 0% vs gzip level 6 | within 5% | none | none |
| `not-found` | 7 / 582743 / 172514 / 148003 | 7 / 582743 / 172514 | 0% | 0% vs gzip level 6 | within 5% | none | none |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, comparison.local-no-prefetch; files of (a) and (b) paired by file name.
<!-- /audit:table -->

<!-- audit:table first-load-compare prod -->
| Route | (a) files / raw / gzip / brotli | (b) files / decoded / encoded | Decoded diff | Encoded diff | Encoded diff, (a) priced like the server | Verdict | Scripts in (b) that (a) lacks | Files of (a) not fetched |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `home` | 10 / 1956544 / 425483 / 317424 | 12 / 1989772 / 448420 | +1.7% | +41.3% vs brotli q11 | +3.5% vs brotli q3 (matched by the compression probe) | within 5% | 2 files, 32744 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `play` | 10 / 1966420 / 429647 / 321025 | 13 / 2017706 / 459042 | +2.6% | +43% vs brotli q11 | +4.9% vs brotli q3 (matched by the compression probe) | within 5% | 3 files, 50802 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `daily` | 10 / 1967298 / 429939 / 321297 | 12 / 1989772 / 448420 | +1.1% | +39.6% vs brotli q11 | +2.3% vs brotli q3 (matched by the compression probe) | within 5% | 2 files, 21990 B (largest `2npq8hif5qsgm.js` 18058 B) | none |
| `leaderboard` | 9 / 1920543 / 414110 / 307229 | 13 / 1998238 / 451983 | +4% | +47.1% vs brotli q11 | +7.2% vs brotli q3 (matched by the compression probe) | over 5% | 4 files, 77211 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `history` | 9 / 1916009 / 412407 / 305784 | 12 / 1989772 / 448420 | +3.8% | +46.6% vs brotli q11 | +6.8% vs brotli q3 (matched by the compression probe) | over 5% | 3 files, 73279 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `how-to-play` | 7 / 582743 / 172514 / 148003 | 12 / 1989772 / 448420 | +241.4% | +203% vs brotli q11 | +153.7% vs brotli q3 (matched by the compression probe) | over 5% | 5 files, 1406545 B (largest `39hn4ynhlg-o0.js` 1329334 B) | none |
| `run` | 10 / 1939322 / 420008 / 312500 | 13 / 1990608 / 449256 | +2.6% | +43.6% vs per-file encoding (gzip level 6 or brotli q11, raw below the compression threshold) | +5% vs brotli q3 (matched by the compression probe) | within 5% | 3 files, 50802 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `play-kanto151` | 10 / 1966420 / 429647 / 321025 | 13 / 2017706 / 459042 | +2.6% | +43% vs brotli q11 | +4.9% vs brotli q3 (matched by the compression probe) | within 5% | 3 files, 50802 B (largest `245x9u-2ac6r-.js` 28812 B) | none |
| `not-found` | 7 / 582743 / 172514 / 148003 | 12 / 1989772 / 448420 | +241.4% | +203% vs brotli q11 | +153.7% vs brotli q3 (matched by the compression probe) | over 5% | 5 files, 1406545 B (largest `39hn4ynhlg-o0.js` 1329334 B) | none |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, comparison.prod; files of (a) and (b) paired by exact decoded size, then by the nearest size within 0.5% (separate build, names differ).
<!-- /audit:table -->

Two side effects matter more than the percentages.

- **Every route pays for the data chunk.** `/how-to-play` and the 404 page need 582,743 raw bytes in (a). A browser fetches 1,989,772 decoded bytes for the same pages, because the prefetch pulls the 1.33 MB chunk onto them. Lighthouse shows it as 296.1 kB of unused JavaScript on production `/how-to-play`, against about 49 kB on the other routes (`baseline-lighthouse.json`, `unusedJavascriptSavingsBytes`).
- **Production does not send brotli quality 11.** The CDN sends brotli quality 3: two of the three chunks probed match the Node zlib output at quality 3 byte for byte and the third is within 0.83%. A route's bytes on the wire are therefore about 41 to 47% above the quality 11 model in (a). Priced at quality 3 (`Encoded diff, (a) priced like the server` column), the production gap is the prefetch gap: the extra scripts have the same counts and decoded bytes as on the local build, and no file of (a) is missing from (b).

Compression probe, the three largest scripts of the home page, fetched with each `Accept-Encoding`:

<!-- audit:table first-load-probe -->
| Target | Script | Decoded bytes | Bytes sent for Accept-Encoding br | Bytes sent for Accept-Encoding gzip | Model of (a): brotli q11 / gzip level 6 |
| --- | --- | ---: | --- | --- | ---: |
| local | `3-hlrqeouyj9k.js` | 1329334 | not compressed | 238180 (gzip; nearest gzip level 6, 0%, exact) | 156273 / 238180 |
| local | `2vtzm7r4xte7_.js` | 229843 | not compressed | 71992 (gzip; nearest gzip level 6, 0%, exact) | 61421 / 71992 |
| local | `2zobz-rx-ckbp.js` | 168622 | not compressed | 46472 (gzip; nearest gzip level 6, 0%, exact) | 39322 / 46472 |
| prod | `39hn4ynhlg-o0.js` | 1329334 | 243173 (br; nearest brotli quality 3, -0.83%) | 254344 (gzip; nearest gzip level 4, +3.91%) | 156273 / 238180 |
| prod | `0lyrnis0iz_eq.js` | 230299 | 73440 (br; nearest brotli quality 3, 0%, exact) | 72820 (gzip; nearest gzip level 5, -0.23%) | 61633 / 72202 |
| prod | `39-gbenx5zwll.js` | 168650 | 47348 (br; nearest brotli quality 3, 0%, exact) | 46941 (gzip; nearest gzip level 5, -0.28%) | 39310 / 46481 |

Source: `docs/reports/audit-data/baseline-first-load-js.json`, methodB.<target>.compressionProbe; the distance is the nearest Node zlib setting against the bytes the server sent.
<!-- /audit:table -->

The local server sends gzip level 6, which is exactly the model of (a) (0% distance on all three files), and did not compress when asked for brotli. The production file names differ from the local ones because Vercel built them.

### 3.5 What to take from this

- The initial JavaScript is 1.92 to 1.97 MB decoded (0.41 to 0.43 MB gzip, 0.31 to 0.32 MB brotli q11) on every route that runs the engine, and about 0.58 MB on the two static pages (`baseline-first-load-js.json`, `methodA.routes`).
- 1.29 MB of the 1.33 MB data chunk is JSON that the two data modules parse at load. The observed first paint of `/` does not wait for it (section 2.2), but the simulated LCP can, and a phone downloads it on every route.
- An honest "first load" number for a route has two parts: what the route needs (method a) and what the router adds (method b minus a). Any later claim should say which one it quotes.

## 4. API timing

**Verdict.** Warm reads are fast. Cold reads are slow, 2.0 to 3.1 s, and almost all of that is the function starting and the Neon database waking, not the network. The share card costs about 0.35 s every time. A POST costs about 0.18 s on a laptop. Warm p50 is 84 ms for both scopes against a kept-alive network floor of 30 to 34 ms, so the function adds about 50 ms (`baseline-api-timing.json`, `leaderboard.*.warm`, `warmControl`, `floor`). Six cold events took 2046 to 3070 ms to headers, against a fresh-connection floor of 106 to 123 ms (`leaderboard.*.cold`, `floor`). Every cold request is a cache MISS in `iad1`. The machine was busy for all API runs, so each series carries its client load and a control request that saw the same noise.

### 4.1 What the latency floor is, and the two floors

Every production number below sits beside a latency floor, because the network is part of every number. The brief defines the floor as the median time to headers of ten HEADs to `/robots.txt`. A HEAD is a poor floor: the Vercel edge answers it with `connection: close`, so every HEAD that follows another opens a new TCP and TLS connection. The ten HEADs of the first capture all did (`baseline-env.json`, `network.latencyFloor.newConnections`). A series of GETs reuses one connection. The two floors are different things:

- **Fresh-connection floor** (HEAD, new connection each time): a request that must also open a connection. A cold request and every HEAD pay it.
- **Kept-alive floor** (GET on a reused connection): a request on a connection that is already open. A warm API request pays it.

One new connection costs about 107 ms here: DNS 4.6 ms, TCP connect 29.6 ms, TLS done at 68.7 ms, first byte at 107.5 ms (`baseline-env.json`, `network.curlBreakdownSeconds`). The kept-alive GET is one round trip plus the edge.

<!-- audit:table api-floor -->
| Series | Taken at | Request | n | Median ms | Min ms | Max ms | Opened a connection | Client load |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline-pre-warm | 2026-10-10T20:11:01.094Z | HEAD /robots.txt | 10 | 123 | 100 | 366 | not recorded | 39.96 |
| baseline-post-warm | 2026-10-10T20:11:31.289Z | HEAD /robots.txt | 10 | 107 | 34.2 | 125 | not recorded | 38.09 |
| baseline-b-pre-warm | 2026-10-10T21:54:36.949Z | HEAD /robots.txt | 10 | 110 | 99.1 | 213 | 10 of 10 | 60.72 |
| baseline-b-pre-warm | 2026-10-10T21:54:36.949Z | GET /robots.txt, first (opens the connection) | 1 | 109 | 109 | 109 | 1 of 1 | 60.72 |
| baseline-b-pre-warm | 2026-10-10T21:54:36.949Z | GET /robots.txt, then ten on that connection | 10 | 30.5 | 25.4 | 48.5 | 0 of 10 | 60.72 |
| baseline-b-post-warm | 2026-10-10T21:55:23.598Z | HEAD /robots.txt | 10 | 106 | 35.2 | 155 | 9 of 10 | 57.45 |
| baseline-b-post-warm | 2026-10-10T21:55:23.598Z | GET /robots.txt, first (opens the connection) | 1 | 91.6 | 91.6 | 91.6 | 1 of 1 | 57.45 |
| baseline-b-post-warm | 2026-10-10T21:55:23.598Z | GET /robots.txt, then ten on that connection | 10 | 33.5 | 24.3 | 40.2 | 0 of 10 | 57.45 |

Source: `docs/reports/audit-data/baseline-api-timing.json`, floor; time to headers of a static file served by the CDN.
<!-- /audit:table -->

Use these floors as follows. A warm API request is compared with the kept-alive GET floor: 30.5 ms before and 33.5 ms after the warm series (`baseline-b-*`, GET then ten on that connection). A cold request and a HEAD are compared with the fresh-connection floor: 110 ms before and 106 ms after. The floors move by a few ms between captures, and the earlier capture read 123 and 107 ms for the HEAD floor. The client load was 57 to 61 during the second capture, so the floors are not quiet-machine values either. Where a table row says "not recorded" for connections, the sample was taken before the tool recorded them (the `legacy` series and E1 to E3).

### 4.2 Warm requests

<!-- audit:table api-warm -->
| Scope | Measure | n | Min ms | p50 ms | p95 ms | Max ms | Mean ms | Failures | Connections | Client load (max) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| daily | time to headers | 30 | 69.5 | 84.0 | 122 | 1216 | 123 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |
| daily | total | 30 | 72.3 | 85.4 | 124 | 1216 | 125 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |
| all | time to headers | 30 | 71.3 | 83.9 | 119 | 216 | 92.4 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |
| all | total | 30 | 71.9 | 85.4 | 122 | 217 | 94.1 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |
| control: GET /robots.txt | time to headers | 30 | 27.5 | 34.2 | 107 | 346 | 50.1 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |
| control: GET /robots.txt | total | 30 | 27.7 | 34.4 | 107 | 346 | 50.4 | 0 | 0 of 30 opened one | 66.4 (30 samples above 6) |

Source: `docs/reports/audit-data/baseline-api-timing.json`, leaderboard.*.warm and warmControl, series baseline-b; percentiles: linear interpolation between the closest ranks (type 7, the NumPy and Excel default).
<!-- /audit:table -->

Thirty requests per scope, interleaved, 300 ms apart, each round preceded by a control GET of `/robots.txt`. Both scopes have a p50 of 84 ms to headers (daily 84.0, all 83.9) and a p95 of 119 to 122 ms. The control had a p50 of 34.2 ms, which is the kept-alive floor, so the function side is about 50 ms at the median. Both scopes returned `cache-control: no-store`, so every request reached the function. No request opened a new connection. One daily request took 1216 ms and the control p95 is 107 ms, so the machine or the network produced rare spikes (`warm.headersMs.max`, `warmControl`). The earlier `legacy` series, taken at a client load of 39, agrees: p50 84.9 ms for daily with p95 113.9 ms (`leaderboard.daily.warmOtherSeries`). Its connections were not recorded, so it is kept as a cross-check and not as the baseline. The client load was 66 at most during the baseline series, so these are busy-machine numbers. Their floor-relative form, about 50 ms of function time, is the one to compare later.

### 4.3 Cold requests

A cold sample is the first request to the function after at least 16 minutes without a request from these tools or from anyone else (`vercel logs` was read before each one). The tool then sends the other scope at once as a follower, and three GETs of `/robots.txt` as a control.

<!-- audit:table api-cold -->
| Event | Scope | Position | Idle min | Headers ms | Total ms | Status | Cache | Edge / function region | Connection of the request | Control GET /robots.txt ms (median, samples) | Client load | Database state (Neon MCP) |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- |
| E1 | daily | cold | n/a | 2046 | 2052 | 200 | MISS | iad1 / iad1 | new (a HEAD came first and the edge closes after a HEAD; not flagged then) | n/a | 29.53 | Neon production compute ep-falling-resonance-b7y5z6oi was idle (suspended_at 2026-10-10T18:04:17Z, last_active 17:56:41Z) when read with list_branch_computes about 14:53 EDT, a few minutes before the event. The platform log showed no API request in the previous 25 minutes. So this cold sample is function start plus database resume. |
| E1 | all | follower (warm function) | n/a | 218 | 221 | 200 | MISS | iad1 / iad1 | reused (it followed a GET; not flagged then) | n/a | 29.53 |  |
| E2 | all | cold | 20.3 | 2170 | 2174 | 200 | MISS | iad1 / iad1 | new (a HEAD came first and the edge closes after a HEAD; not flagged then) | n/a | 35.56 | Neon production compute ep-falling-resonance-b7y5z6oi, read with list_branch_computes right after the event (about 15:16 EDT), shows started_at 2026-10-10T19:16:00Z, the same second as the E2 request, and last_active 2026-10-10T18:55:44Z (the E1 follower, 20 minutes earlier). Autosuspend is 300 s, so the compute was suspended and the E2 request resumed it. The platform log showed 2 API requests in the previous 25 minutes, both from E1. So this cold sample is function start plus database resume. The client machine load average was 35 to 36, so it is flagged busy. |
| E2 | daily | follower (warm function) | n/a | 287 | 288 | 200 | MISS | iad1 / iad1 | reused (it followed a GET; not flagged then) | n/a | 35.28 |  |
| E3 | daily | cold | 21.8 | 2969 | 2987 | 200 | MISS | iad1 / iad1 | new (a HEAD came first and the edge closes after a HEAD; not flagged then) | n/a | 23.63 | none |
| E3 | all | follower (warm function) | n/a | 439 | 442 | 200 | MISS | iad1 / iad1 | reused (it followed a GET; not flagged then) | n/a | 23.63 |  |
| E4 | all | cold | 32.8 | 2871 | 2872 | 200 | MISS | iad1 / iad1 | new | 37.9 (37.9, 53.1, 28.6) | 24.3 | Neon production compute ep-falling-resonance-b7y5z6oi, read with list_branch_computes about 16:51 EDT, shows started_at 2026-10-10T20:44:22Z, the same second as the E4 request, and last_active 20:44:23Z. Autosuspend is 300 s, so the compute was suspended and the E4 request resumed it. The platform log check counted 0 API requests in the idle window. So this cold sample is function start plus database resume. The cold request opened a new connection although a GET of /robots.txt had opened one a moment before. A scratch check at about 16:47 EDT, outside this series and not stored in it, saw the same pattern: GET /robots.txt opened a connection, the first API GET after it opened another one (1431 ms to headers, MISS), and the next five API GETs reused it (81 to 100 ms). |
| E4 | daily | follower (warm function) | n/a | 144 | 149 | 200 | MISS | iad1 / iad1 | reused | n/a | 23.47 |  |
| E5 | daily | cold | 21.4 | 2215 | 2216 | 200 | MISS | iad1 / iad1 | new | 49.6 (40.6, 49.6, 72.3) | 19.02 | Neon production compute ep-falling-resonance-b7y5z6oi, read with list_branch_computes at about 17:27 EDT: last_active 2026-10-10T21:09:56Z (the E5 request second) and suspended_at 21:15:01Z (300 s autosuspend after it). The compute was suspended before E5 (E4 was 20:44Z, more than 300 s earlier), so E5 is function start plus database resume. The client load average was above 6, so E5 is flagged busy. |
| E5 | all | follower (warm function) | n/a | 151 | 152 | 200 | MISS | iad1 / iad1 | reused | n/a | 19.02 |  |
| E6 | all | cold | 21.2 | 3070 | 3074 | 200 | MISS | iad1 / iad1 | new | 40.8 (40.8, 36.5, 49.5) | 16.86 | Neon production compute ep-falling-resonance-b7y5z6oi, read with list_branch_computes at about 17:34 EDT: started_at 2026-10-10T21:31:07Z, the second of the E6 request, after being suspended since 21:15:01Z. So E6 is function start plus database resume. The client load average was above 6, so E6 is flagged busy. |
| E6 | daily | follower (warm function) | n/a | 140 | 145 | 200 | MISS | iad1 / iad1 | reused | n/a | 16.86 |  |

Source: `docs/reports/audit-data/baseline-api-timing.json`, leaderboard.*.cold, leaderboard.*.afterColdOfOtherScope and coldControls.
<!-- /audit:table -->

Six cold events: daily 2046, 2969 and 2215 ms (E1, E3, E5); all 2170, 2871 and 3070 ms (E2, E4, E6). That is 2.05 to 3.07 s to headers, with a median of 2.5 s. The followers sent at once to the other scope took 140 to 439 ms, so the function was warm by then. A cold request always opened a new connection, which costs about 107 ms (section 4.1), so the function side of a cold request is roughly 1.9 to 3.0 s. The cold GET opened a new connection in E4 to E6 even after a preconnect GET, so the comparison with the fresh-connection floor is the fair one. E1 to E3 used a HEAD to open the connection first and are labelled so in the table.

What the time is made of. The Neon production compute autosuspends after 300 s. For E2, E4, E5 and E6 the Neon reading shows the compute `started_at` in the same second as the request, so those four cold requests include a database resume as well as a function start. E1 was read before the event with the compute idle, and E3 has no reading. The tools cannot split the two parts further. All six were taken at a client load of 17 to 36, so all are flagged busy. The control GETs of `/robots.txt` in E4 to E6 had medians of 38 to 50 ms, so the network was not the cause of the 2 to 3 s. A single cold sample varies by about 1 s here (2.05 to 3.07 s), so a change smaller than that needs more than one sample.

### 4.4 `/card`

<!-- audit:table api-card -->
| Request set | n | Min ms | p50 ms | p95 ms | Max ms | Total p50 ms | Connections | Client load (max) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| first request (function start) | 1 | 3333 | 3333 | 3333 | 3333 | 3358 | 0 of 1 opened one | n/a |
| 10 distinct tokens, all | 10 | 328 | 355 | 2015 | 3333 | 387 | 0 of 10 opened one | 59.1 |
| 9 distinct tokens after the first | 9 | 328 | 350 | 401 | 403 | 386 | 0 of 9 opened one | 59.1 |
| 3 repeats of one token | 3 | 327 | 327 | 357 | 360 | 357 | 0 of 3 opened one | 59.1 |
| control: 3 GETs of /robots.txt before | 3 | 37.7 | 45.0 | 283 | 310 | 46.6 | 1 of 3 opened one | 57.6 |
| control: 3 GETs of /robots.txt after | 3 | 40.8 | 43.9 | 50.1 | 50.8 | 44.2 | 0 of 3 opened one | 59.1 |

Source: `docs/reports/audit-data/baseline-api-timing.json`, card, series baseline-b; cache states, distinct {"MISS":10}, repeats {"MISS":3}.
<!-- /audit:table -->

`/card?t=<token>` is a separate function (`src/app/card/route.tsx`). Ten requests with ten different valid tokens had a p50 of 355 ms to headers and a p95 of 2015 ms, and the first of them took 3333 ms because it started the function. The other nine had a p50 of 350 ms (328 to 403 ms). Three repeats of one token had a p50 of 327 ms. All 13 responses were cache MISS with `cache-control: public, max-age=0, must-revalidate`, including the 3 repeats, so a repeat saves only about 25 ms. The control GETs of `/robots.txt` took 44 to 45 ms at the median. So a warm card costs about 300 ms of function time beyond the floor, and a cold one about 3.3 s. The client load was 59 at most, so the numbers are busy-machine values.

### 4.5 POST

<!-- audit:table api-post -->
| Request set | n | Min ms | p50 ms | p95 ms | Max ms | Mean ms | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| all requests | 30 | 160 | 185 | 221 | 1143 | 221 | 0 |
| after the first request | 29 | 160 | 184 | 215 | 226 | 189 | 0 |

Source: `docs/reports/audit-data/baseline-api-timing.json`, post; first request 1143 ms; cleanup 30 leaderboard rows and 30 rate-limit rows deleted.
<!-- /audit:table -->

**Label: local Next server on a laptop plus the Neon preview branch over the internet. It is not Vercel-to-Neon latency. Production POST was not measured because it writes rows and burns the rate limit.**

Thirty valid non-daily cup8 tokens (distinct seeds, bot-drafted by `scripts/audit/tokens.mts`), distinct nicknames `bl-1` to `bl-30`, sent one after another to a second local server on port 3402 wired to the preview endpoint `ep-small-breeze-b7nhwrer`. All 30 answered 201 with a rank. The p50 is 185 ms (min 160, p95 221), and the first request took 1143 ms because it was the first request to that server process. The other 29 had a p50 of 184 ms. Each POST makes three sequential database calls, the rate-limit consume, the insert and the rank query (`src/leaderboard/server/handlers.ts` lines 114, 175 and 191), plus a deterministic engine replay of the run (line 168). Most of 185 ms is therefore three round trips from the laptop to Neon in `us-east-1`. The Vercel function runs in `iad1` and the Neon computes in `aws-us-east-1`, so a production POST should be cheaper in network time and is not predicted by this number. The client load was 39.5 at the median during the run, so the replay time is inflated too.

The tool checked the database host before writing (the preview endpoint, never `ep-falling-resonance-b7y5z6oi`), deleted its own rate-limit rows before each batch of at most 9, and at the end deleted the 30 `bl-` rows and 30 rate-limit rows it had caused. A final count on the preview branch with the Neon MCP showed 0 leaderboard entries, 0 `bl-` entries and 0 rate-limit events. The Lighthouse, first-load and screenshot runs used the other local server (port 3401) without a database. The pulled `preview.env` was deleted and the port 3402 server stopped.

## 5. Screenshots

**Verdict.** Clean. None of the 192 shots has horizontal overflow, the theme applied in all 160 viewport shots, no shot needed a retake, and the only console errors are the expected ones: the 404 of the 404 page, and on the local build the 503 of the leaderboard API that has no database (`baseline-screenshots.json`, `targets.*`). 192 is 96 per target: 80 viewport shots and 16 full-page shots. The shots were taken, not reviewed for design: judging them is the job of the audit agents that read them.

### 5.1 Method

Playwright Chromium, a fresh context for every page load, `reducedMotion: "reduce"` (animations are off in every shot), 8 routes (the seven Lighthouse routes and the 404 page), 5 viewports and 2 themes. The mobile viewports 360x640, 390x844, 430x932 and 844x390 use `isMobile`, `hasTouch` and a device pixel ratio of 3. The desktop viewport is 1440x900 at ratio 1. The theme is set with the `colorScheme` context option and checked in the page with `matchMedia`. For every shot the tool waits for network idle and `document.fonts.ready`, then records the horizontal overflow (`document.documentElement.scrollWidth` minus the viewport width), the computed `body` background colour, and console errors. A full-page shot of 390x844 in both themes is added. Both targets were shot in full (`baseline-screenshots.json`, `meta`).

### 5.2 Summary

<!-- audit:table screens-summary -->
| Target | Viewport shots | Full-page shots | Shots with horizontal overflow | Shots with console errors | Theme applied (prefers-color-scheme matched) | Light/dark pairs with different body background |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| prod | 80 | 16 | 0 | 10 | 80/80 | 40/40 |
| local | 80 | 16 | 0 | 20 | 80/80 | 40/40 |

Source: `docs/reports/audit-data/baseline-screenshots.json`, targets.*.
<!-- /audit:table -->

The console errors are expected. The local `/leaderboard` has no database, so its API answers 503 and the browser logs one error per load, and the 404 page logs the 404 itself.

### 5.3 Horizontal overflow

Each cell is the larger overflow of the light and dark shot, then the console errors of both.

<!-- audit:table screens-matrix local -->
| Route | 360x640 | 390x844 | 430x932 | 844x390 | 1440x900 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/play` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/daily` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/leaderboard` | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err |
| `/history` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/how-to-play` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/r/<token>` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/definitely-not-a-page` | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err |

Source: `docs/reports/audit-data/baseline-screenshots.json`, targets.local.shots; each cell is the larger horizontal overflow of the light and dark shot, then the console errors of both.
<!-- /audit:table -->

<!-- audit:table screens-matrix prod -->
| Route | 360x640 | 390x844 | 430x932 | 844x390 | 1440x900 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/play` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/daily` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/leaderboard` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/history` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/how-to-play` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/r/<token>` | 0 px | 0 px | 0 px | 0 px | 0 px |
| `/definitely-not-a-page` | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err | 0 px, 2 err |

Source: `docs/reports/audit-data/baseline-screenshots.json`, targets.prod.shots; each cell is the larger horizontal overflow of the light and dark shot, then the console errors of both.
<!-- /audit:table -->

### 5.4 Theme check

The light and dark shots of every route and viewport have different `body` backgrounds and the page saw the matching `prefers-color-scheme`, so the theme really changed. The 390x844 pairs:

<!-- audit:table screens-theme local -->
| Route (390x844) | Light body background | Dark body background | Changed | prefers-color-scheme seen by the page (light shot / dark shot) |
| --- | --- | --- | --- | --- |
| `home` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `play` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `daily` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `leaderboard` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `history` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `how-to-play` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `run` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `not-found` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |

Source: `docs/reports/audit-data/baseline-screenshots.json`, targets.local.themeCheck.pairs.
<!-- /audit:table -->

<!-- audit:table screens-theme prod -->
| Route (390x844) | Light body background | Dark body background | Changed | prefers-color-scheme seen by the page (light shot / dark shot) |
| --- | --- | --- | --- | --- |
| `home` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `play` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `daily` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `leaderboard` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `history` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `how-to-play` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `run` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |
| `not-found` | rgb(238, 244, 239) | rgb(8, 19, 14) | yes | light / dark |

Source: `docs/reports/audit-data/baseline-screenshots.json`, targets.prod.themeCheck.pairs.
<!-- /audit:table -->

### 5.5 Committed set

The local-build shots are committed as WebP in `docs/reports/audit-baseline/` within the 4 MB budget. The order of keeping is every 390x844 and 1440x900 viewport shot, then the full-page 390x844 shots, then 360x640, then 430x932 and 844x390. Full-page shots are scaled to 780 px wide (2x). Viewport shots keep their size. Production PNGs for the same matrix are in the scratch directory and are not committed.

<!-- audit:table screens-committed -->
| Item | Value |
| --- | --- |
| Directory | `docs/reports/audit-baseline` |
| Quality | WebP 70 |
| Budget | 4000000 bytes |
| Used | 3995606 bytes in 62 files |
| Left out | 34 shots: 2 at 360x640, 16 at 430x932, 16 at 844x390 |

Source: `docs/reports/audit-data/baseline-screenshots.json`, meta.committed.
<!-- /audit:table -->

<!-- audit:table screens-index -->
| Route id | 390x844 | 390x844 full page | 1440x900 | 360x640 | 430x932 | 844x390 |
| --- | --- | --- | --- | --- | --- | --- |
| `home` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `play` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `daily` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `leaderboard` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `history` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `how-to-play` | light and dark | light and dark | light and dark | light and dark | left out | left out |
| `run` | light and dark | light and dark | light and dark | light | left out | left out |
| `not-found` | light and dark | light and dark | light and dark | light | left out | left out |

Source: `docs/reports/audit-data/baseline-screenshots.json`, meta.committed.kept; files are named `local__<route id>__<viewport>__<theme>[__full].webp` in `docs/reports/audit-baseline`.
<!-- /audit:table -->

## 6. Comparison with dispatch 5

**Verdict.** Partly agrees. `/leaderboard` reproduces dispatch 5 exactly, including its two modes. `/play?mode=kanto151...` agrees within the spread. `/` does not agree on LCP: today's clean run scored 96 at 2.77 s, against dispatch 5's 88 at 3.8 s in three identical runs. The accessibility, best practices and SEO scores agree on all three pages.

Dispatch 5 measured the local production build with the mobile preset and simulated throttling, the same settings as here (`docs/reports/finish-qa.md` lines 123 to 134, `STATE.md` line 24). Its numbers beside today's:

<!-- audit:table dispatch5-core -->
| Page | Perf, dispatch 5 | Perf, today | LCP, dispatch 5 | LCP, today (simulated) | TBT, dispatch 5 | TBT, today | CLS, dispatch 5 | CLS, today | Clean runs today |
| --- | --- | ---: | --- | ---: | --- | ---: | --- | ---: | ---: |
| `/` | 88 (3 identical runs) | 96 | 3.8 s | 2.77 s | 70 to 150 ms | 45 ms | 0 to 0.028 | 0.000 | 1/3 |
| `/play?mode=kanto151...` | 96 | 99 | 2.6 s | 2.11 s | 70 to 150 ms | 47 ms | 0 to 0.028 | 0.028 | 1/3 |
| `/leaderboard` | 96 (one run 83) | 84 | 2.6 s (one run 4.4 s) | 4.36 s | 70 to 150 ms | 120 ms | 0 to 0.028 | 0.000 | 1/3 |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes; dispatch 5 values from docs/reports/finish-qa.md lines 127 to 129.
<!-- /audit:table -->

<!-- audit:table dispatch5-other -->
| Page | A11y, dispatch 5 | A11y, today | Best practices, dispatch 5 | Best practices, today | SEO, dispatch 5 | SEO, today |
| --- | --- | ---: | --- | ---: | --- | ---: |
| `/` | 100 | 100 | 100 | 100 | 63 | 63 |
| `/play?mode=kanto151...` | 100 | 100 | 100 | 100 | 63 | 63 |
| `/leaderboard` | 100 | 100 | 96 (the expected 503, no database) | 96 | 63 | 63 |

Source: `docs/reports/audit-data/baseline-lighthouse.json`, targets.local.routes; dispatch 5 values from docs/reports/finish-qa.md lines 127 to 129.
<!-- /audit:table -->

- **`/leaderboard`.** Dispatch 5 had 96 at 2.6 s with one run of 83 at 4.4 s. Today the three local runs are 84 at 4.36 s (clean), 97 at 2.62 s and 96 at 2.66 s (`baseline-lighthouse.json`, `targets.local.routes.leaderboard.runs`). The same two modes appear. The headline row shows 84 only because the table uses clean runs and the clean run happened to be the slow one.
- **`/play?mode=kanto151...`.** Dispatch 5 had 96 at 2.6 s. Today's clean run is 99 at 2.11 s, and the busy runs are 91 at 3.01 s and 83 at 4.14 s. The clean run agrees within the spread.
- **`/`.** Dispatch 5 had 88 at 3.8 s in three identical runs. Today the runs are 82 at 3.90 s (busy, benchmark index 3427), 96 at 2.77 s (clean) and 95 at 2.79 s (busy). One of three runs matches dispatch 5. The pattern of a run sitting on one of two steps is the same as in dispatch 5. Why dispatch 5 sat on the long step three times in a row cannot be shown from here: the step depends on whether the browser's first paint comes before or after the 1.33 MB data chunk arrives (section 2.2), and that depends on the Chrome version, the machine and its load. I checked that today's build serves the `h1` "Build your XI" in the first HTML response (22,277 bytes), so the observed paint does not wait for the chunk. That is why a fast paint gives the short step.
- **Observed LCP.** Dispatch 5 reported an unthrottled real-browser LCP of 36 to 65 ms (`docs/reports/finish-qa.md` line 133). Today's fastest local runs painted at 30 to 59 ms, which agrees.
- **TBT and CLS.** Dispatch 5 had a TBT of 70 to 150 ms and a CLS of 0 to 0.028. Today's local TBT in the clean runs is 45 to 120 ms across the three pages, and CLS is 0 on `/` and `/leaderboard` and 0.028 on the kanto151 row. These agree.
- **Scores 100/100/63 and 96.** Accessibility 100, Best Practices 100 (96 on `/leaderboard`, the expected 503) and SEO 63 agree on every page.

The earlier numbers came from a quieter machine than this one (a load of 98% above 6 now), so differences of a few points in the score or of a few tens of ms in TBT should not be read as regressions.

## 7. What this baseline cannot tell

- **INP.** Lighthouse navigation mode does not compute it, so every INP in `baseline-lighthouse.json` is `null`. Lab INP and long animation frames while drafting come from the perf agent's traces.
- **Real devices.** Every number comes from a MacBook Pro under Chromium emulation (a Moto G Power profile, a 4x CPU slowdown model, simulated 1.6 Mbps). There is no phone, no iOS Safari or WebKit timing and no real cellular network. Screenshots are Chromium only.
- **Production POST.** It writes rows and burns the 10-per-hour submit limit, so it was not measured. The POST number in section 4.5 is a local Next server plus the Neon preview branch over the internet. It is not Vercel-to-Neon latency and says nothing about the production handler.
- **Interactive cost.** No measured route runs a draft. Player images load only on `/r/<token>` (6 requests, 8,071 bytes) and `/leaderboard` (one request of 0 bytes) (`baseline-lighthouse.json`, per-run `network.byType` in the raw records). Chunks that a page loads later with `import()` are outside both first-load methods, which stop 2 s after network idle.
- **One day, one place, one network.** Everything was measured on 2026-10-10 from one Wi-Fi connection. Cold starts and Neon resumes depend on Vercel and Neon internals and on the time of day.
- **A busy machine.** The tables say how many runs of each route were clean. Busy runs are flagged and are biased: TBT and Speed Index read high, scores low (section 1.3).
- **Simulated LCP.** It moves in steps that depend on timing, not on the page (section 2.2). This report gives the observed LCP beside it, but one second method (DevTools throttling or a real device) is still missing.
- **The late first paint** on production (section 2.5) is observed and unexplained.

## 8. NOT RUN

- **INP.** Lighthouse navigation mode does not compute it. Not run: lab INP belongs to the perf agent.
- **Production POST.** It writes rows and burns the rate limit. Not run on production. The POST in section 4.5 is a local server plus the Neon preview branch.
- **Clean Lighthouse runs for most routes.** The brief asks for three runs per route on a machine at a load of 6 or less. Only 8 of 24 production runs and 3 of 24 local runs were clean, because that load level was reached in short windows only. A clean-only pass waited from 17:46 to 18:27 EDT for another window and found none. The other runs are flagged BUSY with their reasons.
- **A quiet-machine API series.** Every warm, `/card` and cold series was taken at a client load above 6. The controls and the recorded loads show how much that matters, and no series is clean.
- **A second LCP method.** DevTools throttling, a real phone and WebKit or Safari timing were not run (section 7).
- **A Chrome trace of a late first paint.** Not run, so section 2.5 stays unexplained.
- **The planned cold-sample schedule.** Up to three cold samples per endpoint were taken: three for daily and three for all (E1 to E6). The brief's plan of one at the start, one after the production Lighthouse block and one after the local block was not followed to the letter, because each needs 16 idle minutes and the quiet windows decided the order.
- **Full-size screenshots of every committed shot.** Full-page shots in the committed set are scaled to 780 px wide; viewport shots keep their size (section 5.5). Production PNGs are outside the repository.
- **Direct Neon round-trip time.** Not measured, so the POST cost cannot be split into replay, rate limit, insert and rank.

## Appendix: files

| File | What it holds |
| --- | --- |
| `docs/reports/audit-data/baseline-env.json` | Machine, tools, deployment, latency floors, load during the baseline, pinned-link check |
| `docs/reports/audit-data/baseline-lighthouse.json` | Every Lighthouse run of both targets, medians, LCP elements and phases, request milestones, load and benchmark index per run |
| `docs/reports/audit-data/baseline-first-load-js.json` | Method (a) per route and per chunk, method (b) for local, local without prefetch and production, the comparison, the compression probe |
| `docs/reports/audit-data/baseline-api-timing.json` | Latency floors, warm series with controls, cold events with notes, `/card` series, POST timing |
| `docs/reports/audit-data/baseline-screenshots.json` | Every shot with overflow, theme and console checks, and the committed set |
| `docs/reports/audit-baseline/` | WebP screenshots of the local build |
| `scripts/audit/` | The tools, their tests and the README. The final readback runs them again with `--name final` and `report.mjs --baseline docs/reports/audit-data --final DIR` prints the comparison |
