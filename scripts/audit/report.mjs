// Builds the tables of docs/reports/audit-baseline.md from the JSON summaries, and compares two
// measurement sets.
//
//   Fill the tables of the report (the prose around the markers stays as written):
//     pnpm exec tsx scripts/audit/report.mjs --data docs/reports/audit-data --report docs/reports/audit-baseline.md
//     add --check to fail when a table in the report differs from the data
//   Compare the baseline with a final readback made by the same tools:
//     pnpm exec tsx scripts/audit/report.mjs --baseline docs/reports/audit-data --final DIR
//       [--baseline-name baseline] [--final-name final]
//
// A table in the report sits between these two lines, and the tool rewrites what is between them:
//   <!-- audit:table ID [ARG] -->
//   <!-- /audit:table -->
// Ranges read "median (min to max)". A source line under each table names the JSON file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { markdownTable } from "./stats.mjs";

const USAGE = `usage: report.mjs --data DIR --report FILE [--name baseline] [--check]
       report.mjs --baseline DIR --final DIR [--baseline-name baseline] [--final-name final]`;
let args;
try {
  args = parseArgs({
    options: {
      data: { type: "string" },
      report: { type: "string" },
      name: { type: "string", default: "baseline" },
      check: { type: "boolean", default: false },
      baseline: { type: "string" },
      final: { type: "string" },
      "baseline-name": { type: "string", default: "baseline" },
      "final-name": { type: "string", default: "final" },
    },
    strict: true,
    allowPositionals: false,
  }).values;
} catch (error) {
  console.error(`${error.message}\n\n${USAGE}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------

const NA = "not measured";
const int = (n) => String(Math.round(n));
const dec = (digits) => (n) => Number(n).toFixed(digits);
const seconds = (ms) => (ms / 1000).toFixed(2);
const kilobytes = (n) => (n / 1000).toFixed(1);
const millis = (n) => (Math.abs(n) >= 100 ? int(n) : Number(n).toFixed(1));
const code = (text) => `\`${text}\``;
// What a sample's newConnection flag says. Samples taken before the flag existed are named for what
// the tool did then.
const connectionText = (flag, legacyText = "not recorded") =>
  flag === true ? "new" : flag === false ? "reused" : legacyText;

function range(spread, format) {
  if (!spread) return NA;
  const f = format;
  return spread.min === spread.max
    ? f(spread.median)
    : `${f(spread.median)} (${f(spread.min)} to ${f(spread.max)})`;
}

// ---------------------------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------------------------

function load(dir, name, kind) {
  const file = path.join(dir, `${name}-${kind}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

function sourceLine(file, detail) {
  return `Source: ${code(file)}${detail ? `, ${detail}` : ""}.`;
}

const ROUTE_ORDER = [
  "home",
  "play",
  "daily",
  "leaderboard",
  "history",
  "how-to-play",
  "run",
  "play-kanto151",
  "not-found",
];
const byRoute = (a, b) => ROUTE_ORDER.indexOf(a) - ROUTE_ORDER.indexOf(b);
const routeEntries = (obj) => Object.entries(obj ?? {}).sort(([a], [b]) => byRoute(a, b));
const routeName = (id, label) => code(label ?? id);

// ---------------------------------------------------------------------------------------------
// Table builders. Each takes the data set and returns { table, source } or null.
// ---------------------------------------------------------------------------------------------

const floorText = (f) =>
  `HEAD /robots.txt, n=${f.n}: median ${millis(f.medianMs)} ms, min ${millis(f.minMs)} ms, max ${millis(f.maxMs)} ms; ${f.newConnections === undefined || f.newConnections === null ? "connections not recorded" : `${f.newConnections} of ${f.n} opened a new connection`}`;
const floorGetText = (g) =>
  `GET /robots.txt, n=${g.n}: median ${millis(g.medianMs)} ms, min ${millis(g.minMs)} ms, max ${millis(g.maxMs)} ms; ${g.newConnections} of ${g.n} opened a new connection; the GET that opened it took ${millis(g.firstMs)} ms`;

// "clean/recorded runs", with a note when a route has no clean run and its numbers come from busy ones.
const runsCell = (r) =>
  r.runsClean === 0 ? `0/${r.runsUsed} (numbers from busy runs)` : `${r.runsClean}/${r.runsUsed}`;

const builders = {
  env(data, d) {
    const env = d.env;
    if (!env) return null;
    const vercel = env.vercel?.current;
    const rows = [
      ["Captured", `${env.localTime} (${env.timeZone})`],
      [
        "Machine",
        `${env.machine.modelName}, ${env.machine.chip}, ${env.machine.logicalCores} cores, ${env.machine.memoryGB} GB, macOS ${env.machine.macOS}`,
      ],
      ["Node, pnpm", `${env.tools.node}, ${env.tools.pnpm}`],
      ["System Chrome (Lighthouse)", env.tools.systemChrome],
      [
        "Playwright, Chromium, WebKit",
        `${env.tools.playwright}, ${env.tools.playwrightChromium}, ${env.tools.playwrightWebkit}`,
      ],
      ["Lighthouse", env.tools.lighthouse],
      ["Audit clone", `${env.git.auditCloneBranch} at ${env.git.auditCloneHead.slice(0, 7)}`],
      [
        "Served local build",
        `main at ${env.git.servedCheckoutHead.slice(0, 7)}, build id ${code(env.git.servedBuildId)}`,
      ],
      [
        "Production deployment",
        vercel
          ? `${code(vercel.id)}, ${vercel.state}, git ${String(vercel.gitSha).slice(0, 7)}, created ${vercel.createdAt}`
          : NA,
      ],
      ["Network", env.network.kind],
      ["Latency floor, as the brief defines it", floorText(env.network.latencyFloor)],
      ...(env.network.latencyFloor.getOnKeptAliveConnection
        ? [
            [
              "Latency floor on a kept-alive connection",
              floorGetText(env.network.latencyFloor.getOnKeptAliveConnection),
            ],
          ]
        : []),
      [
        "Pinned share link",
        `${env.fixtureCheck.sameOnBothTargets ? "same record and score on local and production" : "DIFFERENT on local and production"}: ${env.fixtureCheck.expected.record}, score ${env.fixtureCheck.expected.score}`,
      ],
    ];
    const end = env.atEnd;
    if (end) {
      const f = end.latencyFloor;
      rows.push(
        [
          "Production deployment at the end",
          end.sameDeploymentAsStart
            ? `unchanged (${code(end.productionDeployment.id)})`
            : `CHANGED to ${code(end.productionDeployment.id)} (git ${String(end.productionDeployment.gitSha).slice(0, 7)}), so later production numbers may not describe the same code`,
        ],
        ["Latency floor at the end, as the brief defines it", `${end.localTime}: ${floorText(f)}`],
        ...(f.getOnKeptAliveConnection
          ? [
              [
                "Latency floor at the end on a kept-alive connection",
                floorGetText(f.getOnKeptAliveConnection),
              ],
            ]
          : []),
      );
    }
    if (env.loadDuringBaseline) {
      const l = env.loadDuringBaseline;
      rows.push([
        "Machine load during the baseline",
        `1-minute load average sampled every ${l.intervalSeconds} s, n=${l.samples}: min ${l.min}, median ${l.p50}, p95 ${l.p95}, max ${l.max}; ${l.shareAbove6Percent}% of samples above 6`,
      ]);
    }
    return {
      table: markdownTable(["Item", "Value"], rows),
      source: sourceLine(`${d.dir}/${d.name}-env.json`),
    };
  },

  "lighthouse-scores"(data, d, target) {
    const t = d.lighthouse?.targets?.[target];
    if (!t) return null;
    const rows = routeEntries(t.routes).map(([id, r]) => [
      routeName(id, r.label),
      range(r.scores.performance, int),
      range(r.scores.accessibility, int),
      range(r.scores["best-practices"], int),
      range(r.scores.seo, int),
      `${range(r.metrics.lcpMs, seconds)} s`,
      `${range(r.metrics.fcpMs, seconds)} s`,
      `${range(r.metrics.tbtMs, int)} ms`,
      range(r.metrics.cls, dec(3)),
      `${range(r.metrics.speedIndexMs, seconds)} s`,
      runsCell(r),
    ]);
    return {
      table: markdownTable(
        [
          "Route",
          "Perf",
          "A11y",
          "Best practices",
          "SEO",
          "LCP",
          "FCP",
          "TBT",
          "CLS",
          "Speed Index",
          "Clean / recorded runs",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        `targets.${target}.routes; each route's numbers are its clean runs only, and a route with no clean run shows its busy runs and says so in the last column`,
      ),
    };
  },

  "lighthouse-weight"(data, d, target) {
    const t = d.lighthouse?.targets?.[target];
    if (!t) return null;
    const rows = routeEntries(t.routes).map(([id, r]) => [
      routeName(id, r.label),
      range(r.jsRequests, int),
      `${range(r.jsTransferBytes, kilobytes)} kB`,
      `${range(r.totalTransferBytes, kilobytes)} kB`,
      `${range(r.serverResponseTimeMs, millis)} ms`,
      `${range(r.unusedJavascriptSavingsBytes, kilobytes)} kB`,
      range(r.loadAtStart, dec(1)),
      range(r.benchmarkIndex, int),
    ]);
    return {
      table: markdownTable(
        [
          "Route",
          "JS requests",
          "JS transferred",
          "All transferred",
          "Server response",
          "Unused JS (est. savings)",
          "Load at start",
          "Benchmark index",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(`${d.dir}/${d.name}-lighthouse.json`, `targets.${target}.routes`),
    };
  },

  "lighthouse-lcp"(data, d, target) {
    const t = d.lighthouse?.targets?.[target];
    if (!t) return null;
    const phase = (r, key) => {
      const p = r.medianLcpRun?.observedPhasesMs;
      return p && p[key] !== undefined && p[key] !== null ? `${millis(p[key])} ms` : "n/a";
    };
    const rows = routeEntries(t.routes).map(([id, r]) => [
      routeName(id, r.label),
      `${range(r.metrics.lcpMs, seconds)} s`,
      `${range(r.metrics.observedLcpMs, millis)} ms`,
      r.medianLcpRun?.lcpElement ? code(r.medianLcpRun.lcpElement.selector) : NA,
      phase(r, "timeToFirstByte"),
      phase(r, "resourceLoadDelay"),
      phase(r, "resourceLoadDuration"),
      phase(r, "elementRenderDelay"),
    ]);
    return {
      table: markdownTable(
        [
          "Route",
          "LCP (simulated)",
          "LCP (observed)",
          "LCP element (median run)",
          "TTFB",
          "Load delay",
          "Load time",
          "Render delay",
        ],
        rows,
        ["l", "r", "r", "l", "r", "r", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        `targets.${target}.routes[*].medianLcpRun; the four phases are observed, unthrottled values of the median run`,
      ),
    };
  },

  "lighthouse-runs"(data, d, target) {
    const t = d.lighthouse?.targets?.[target];
    if (!t) return null;
    const hasApiGap = Object.values(t.routes).some((r) =>
      r.runs.some((run) => run.apiIdleMinutesBefore !== undefined),
    );
    const optional = (value, format) =>
      value === undefined || value === null ? "n/a" : format(value);
    const rows = [];
    for (const [id, r] of routeEntries(t.routes)) {
      for (const run of r.runs) {
        const row = [
          routeName(id, r.label),
          run.run,
          run.performance,
          seconds(run.lcpMs),
          optional(run.observedLcpMs, int),
          int(run.tbtMs),
          dec(3)(run.cls),
          `${run.load1} to ${run.loadAfter ?? "n/a"}`,
          run.clean
            ? "yes"
            : `BUSY${run.busyReasons?.length ? ` (${run.busyReasons.join("; ")})` : ""}`,
          int(run.benchmarkIndex),
        ];
        if (hasApiGap) row.push(optional(run.apiIdleMinutesBefore, dec(1)));
        rows.push(row);
      }
    }
    const headers = [
      "Route",
      "Run",
      "Perf",
      "LCP s (simulated)",
      "LCP ms (observed)",
      "TBT ms",
      "CLS",
      "Load, start to after",
      "Clean",
      "Benchmark index",
    ];
    const align = ["l", "r", "r", "r", "r", "r", "r", "r", "l", "r"];
    if (hasApiGap) {
      headers.push("API idle before (min)");
      align.push("r");
    }
    return {
      table: markdownTable(headers, rows, align),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        `targets.${target}.routes[*].runs${hasApiGap ? "; API idle is the time since the previous request to the leaderboard function, filled for /leaderboard only" : ""}`,
      ),
    };
  },

  // When the page finished loading its initial resources against when it first painted, per run,
  // with the main-thread work of the load. A late paint with an idle main thread was not waiting for
  // JavaScript.
  "lighthouse-paint"(data, d, target) {
    const t = d.lighthouse?.targets?.[target];
    if (!t) return null;
    const opt = (value) => (value === undefined || value === null ? "n/a" : millis(value));
    const rows = [];
    for (const [id, r] of routeEntries(t.routes)) {
      for (const run of r.runs) {
        const m = run.milestones ?? {};
        const cpu = m.mainThread ?? {};
        rows.push([
          routeName(id, r.label),
          run.run,
          opt(m.documentEndMs),
          opt(m.initialResourcesEndMs),
          opt(m.firstPrefetchStartMs),
          opt(m.domContentLoadedMs),
          opt(m.loadEventMs),
          opt(run.observedFcpMs),
          opt(run.observedLcpMs),
          opt(cpu.totalTaskMs),
          opt(cpu.longestTaskMs),
          run.clean ? "yes" : "BUSY",
        ]);
      }
    }
    return {
      table: markdownTable(
        [
          "Route",
          "Run",
          "HTML done (ms)",
          "Initial resources done (ms)",
          "First router prefetch starts (ms)",
          "DOMContentLoaded (ms)",
          "Load event (ms)",
          "First paint (ms)",
          "LCP (ms)",
          "Main-thread task time, whole load (ms)",
          "Longest task (ms)",
          "Clean",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        `targets.${target}.routes[*].runs[*].milestones and observedFcpMs; all values are from the unthrottled run, in ms from the first request. The longest task is the longest top-level main-thread task over 5 ms that Lighthouse lists; n/a means none was listed`,
      ),
    };
  },

  // Every Lighthouse run of both targets, sorted by the observed LCP, next to the simulated LCP.
  // Lantern cuts its graph at the observed paint time, so the simulated value jumps in steps.
  "lcp-steps"(data, d) {
    const rows = [];
    for (const target of ["local", "prod"]) {
      const t = d.lighthouse?.targets?.[target];
      if (!t) continue;
      for (const [id, r] of routeEntries(t.routes)) {
        for (const run of r.runs) {
          if (run.observedLcpMs === undefined || run.observedLcpMs === null) continue;
          rows.push({ target, id, label: r.label, run });
        }
      }
    }
    if (rows.length === 0) return null;
    rows.sort((a, b) => a.run.observedLcpMs - b.run.observedLcpMs);
    return {
      table: markdownTable(
        ["Observed LCP (ms)", "Simulated LCP (s)", "Perf", "Target", "Route", "Run", "Clean"],
        rows.map(({ target, id, label, run }) => [
          millis(run.observedLcpMs),
          seconds(run.lcpMs),
          run.performance,
          target,
          routeName(id, label),
          run.run,
          run.clean ? "yes" : "BUSY",
        ]),
        ["r", "r", "r", "l", "l", "r", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        "targets.*.routes[*].runs; observedLcpMs is unthrottled, lcpMs is the simulated value the score uses",
      ),
    };
  },

  // Dispatch 5 numbers (docs/reports/finish-qa.md lines 127 to 129, STATE.md line 24) beside
  // today's local-build medians for the same three pages.
  "dispatch5-core"(data, d) {
    const t = d.lighthouse?.targets?.local;
    if (!t) return null;
    const earlier = {
      home: { perf: "88 (3 identical runs)", lcp: "3.8 s", pageLabel: "/" },
      "play-kanto151": { perf: "96", lcp: "2.6 s", pageLabel: "/play?mode=kanto151..." },
      leaderboard: {
        perf: "96 (one run 83)",
        lcp: "2.6 s (one run 4.4 s)",
        pageLabel: "/leaderboard",
      },
    };
    const rows = Object.entries(earlier).map(([id, e]) => {
      const r = t.routes?.[id];
      return [
        code(e.pageLabel),
        e.perf,
        r ? range(r.scores.performance, int) : NA,
        e.lcp,
        r ? `${range(r.metrics.lcpMs, seconds)} s` : NA,
        "70 to 150 ms",
        r ? `${range(r.metrics.tbtMs, int)} ms` : NA,
        "0 to 0.028",
        r ? range(r.metrics.cls, dec(3)) : NA,
        r ? runsCell(r) : NA,
      ];
    });
    return {
      table: markdownTable(
        [
          "Page",
          "Perf, dispatch 5",
          "Perf, today",
          "LCP, dispatch 5",
          "LCP, today (simulated)",
          "TBT, dispatch 5",
          "TBT, today",
          "CLS, dispatch 5",
          "CLS, today",
          "Clean runs today",
        ],
        rows,
        ["l", "l", "r", "l", "r", "l", "r", "l", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        "targets.local.routes; dispatch 5 values from docs/reports/finish-qa.md lines 127 to 129",
      ),
    };
  },

  "dispatch5-other"(data, d) {
    const t = d.lighthouse?.targets?.local;
    if (!t) return null;
    const earlier = {
      home: { a11y: "100", bp: "100", seo: "63", pageLabel: "/" },
      "play-kanto151": { a11y: "100", bp: "100", seo: "63", pageLabel: "/play?mode=kanto151..." },
      leaderboard: {
        a11y: "100",
        bp: "96 (the expected 503, no database)",
        seo: "63",
        pageLabel: "/leaderboard",
      },
    };
    const rows = Object.entries(earlier).map(([id, e]) => {
      const r = t.routes?.[id];
      return [
        code(e.pageLabel),
        e.a11y,
        r ? range(r.scores.accessibility, int) : NA,
        e.bp,
        r ? range(r.scores["best-practices"], int) : NA,
        e.seo,
        r ? range(r.scores.seo, int) : NA,
      ];
    });
    return {
      table: markdownTable(
        [
          "Page",
          "A11y, dispatch 5",
          "A11y, today",
          "Best practices, dispatch 5",
          "Best practices, today",
          "SEO, dispatch 5",
          "SEO, today",
        ],
        rows,
        ["l", "l", "r", "l", "r", "l", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-lighthouse.json`,
        "targets.local.routes; dispatch 5 values from docs/reports/finish-qa.md lines 127 to 129",
      ),
    };
  },

  "first-load-a"(data, d) {
    const a = d.firstLoad?.methodA;
    if (!a) return null;
    const rows = routeEntries(a.routes).map(([id, r]) => [
      routeName(id, r.label),
      r.total.files,
      r.total.raw,
      r.total.gzip,
      r.total.brotli,
      r.sharedRootMain.raw,
      r.routeOnly.raw,
      r.crossCheck.status,
    ]);
    return {
      table: markdownTable(
        [
          "Route",
          "Files",
          "Raw bytes",
          "Gzip bytes",
          "Brotli bytes",
          "Shared root files (raw)",
          "Route files (raw)",
          "HTML cross-check",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-first-load-js.json`,
        `methodA.routes; build id ${a.buildId}; the noModule polyfill (${a.polyfill.total.raw} raw, ${a.polyfill.total.gzip} gzip, ${a.polyfill.total.brotli} brotli bytes) is not in these totals`,
      ),
    };
  },

  "first-load-b"(data, d, target) {
    const b = d.firstLoad?.methodB?.[target];
    if (!b) return null;
    const rows = routeEntries(b.routes).map(([id, r]) => [
      routeName(id, r.label),
      r.jsRequests,
      r.decodedBodyBytes,
      r.encodedBodyBytes,
      r.transferBytes,
      r.contentEncodings.join(", "),
      `${r.scriptsAtNetworkIdle} / ${r.scriptsAfterSettle}`,
      r.sameScriptsEveryLoad ? "yes" : "NO",
    ]);
    return {
      table: markdownTable(
        [
          "Route",
          "JS requests",
          "Decoded bytes",
          "Encoded body bytes",
          "Transferred bytes (with headers)",
          "Encoding",
          "Scripts at idle / after settle",
          "Same every load",
        ],
        rows,
        ["l", "r", "r", "r", "r", "l", "r", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-first-load-js.json`,
        `methodB.${target}.routes; ${b.chromium}, ${b.loadsPerRoute ?? "2"} loads per route`,
      ),
    };
  },

  "first-load-compare"(data, d, target) {
    const c = d.firstLoad?.comparison?.[target];
    if (!c) return null;
    const signed = (n) => `${n > 0 ? "+" : ""}${n}%`;
    const withServer = Object.values(c).some(
      (r) => r.encodedVsServerQualityPct !== null && r.encodedVsServerQualityPct !== undefined,
    );
    const names = (list) =>
      list
        .slice()
        .sort((x, y) => (y.decodedBodyBytes ?? y.raw) - (x.decodedBodyBytes ?? x.raw))
        .slice(0, 1)
        .map((f) => `${code(f.file.split("/").pop())} ${f.decodedBodyBytes ?? f.raw} B`);
    const rows = routeEntries(c).map(([id, r]) => [
      code(id),
      `${r.a.files} / ${r.a.raw} / ${r.a.gzip} / ${r.a.brotli}`,
      `${r.b.files} / ${r.b.decodedBodyBytes} / ${r.b.encodedBodyBytes}`,
      signed(r.decodedDiffPct),
      `${signed(r.encodedVsModelledPct)} vs ${r.modelledAgainst}`,
      ...(withServer
        ? [
            r.encodedVsServerQualityPct == null
              ? "n/a"
              : `${signed(r.encodedVsServerQualityPct)} vs ${r.serverQuality}`,
          ]
        : []),
      r.exceedsFivePercent ? "over 5%" : "within 5%",
      r.extraInB.files === 0
        ? "none"
        : `${r.extraInB.files} files, ${r.extraInB.decodedBytes} B (largest ${names(r.onlyInB)[0]})`,
      r.missingFromB.files === 0
        ? "none"
        : `${r.missingFromB.files} files, ${r.missingFromB.rawBytes} B`,
    ]);
    const pairing = [...new Set(Object.values(c).map((r) => r.pairing))].join("; ");
    return {
      table: markdownTable(
        [
          "Route",
          "(a) files / raw / gzip / brotli",
          "(b) files / decoded / encoded",
          "Decoded diff",
          "Encoded diff",
          ...(withServer ? ["Encoded diff, (a) priced like the server"] : []),
          "Verdict",
          "Scripts in (b) that (a) lacks",
          "Files of (a) not fetched",
        ],
        rows,
        ["l", "r", "r", "r", "r", ...(withServer ? ["r"] : []), "l", "l", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-first-load-js.json`,
        `comparison.${target}; files of (a) and (b) paired ${pairing}`,
      ),
    };
  },

  "first-load-prod-vs-local"(data, d) {
    const l = d.firstLoad?.methodB?.local?.routes;
    const p = d.firstLoad?.methodB?.prod?.routes;
    if (!l || !p) return null;
    const rows = routeEntries(p)
      .filter(([id]) => l[id])
      .map(([id, pr]) => {
        const lr = l[id];
        return [
          routeName(id, pr.label),
          `${lr.jsRequests} / ${pr.jsRequests}`,
          lr.decodedBodyBytes,
          pr.decodedBodyBytes,
          `${pr.decodedBodyBytes - lr.decodedBodyBytes > 0 ? "+" : ""}${pr.decodedBodyBytes - lr.decodedBodyBytes}`,
          lr.encodedBodyBytes,
          pr.encodedBodyBytes,
          `${pr.encodedBodyBytes - lr.encodedBodyBytes > 0 ? "+" : ""}${(((pr.encodedBodyBytes - lr.encodedBodyBytes) / lr.encodedBodyBytes) * 100).toFixed(1)}%`,
        ];
      });
    return {
      table: markdownTable(
        [
          "Route",
          "JS requests, local / prod",
          "Decoded, local",
          "Decoded, prod",
          "Decoded diff (bytes)",
          "Encoded, local (gzip 6)",
          "Encoded, prod (brotli)",
          "Encoded diff",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-first-load-js.json`,
        "methodB.local.routes and methodB.prod.routes, both with the router prefetch on",
      ),
    };
  },

  "first-load-probe"(data, d) {
    const targets = Object.entries(d.firstLoad?.methodB ?? {}).filter(
      ([, b]) => b.compressionProbe,
    );
    if (targets.length === 0) return null;
    const sent = (e) =>
      e.contentEncoding === "none"
        ? "not compressed"
        : `${e.bytesOnWire} (${e.contentEncoding}; nearest ${e.nearest}, ${e.nearestDiffPct > 0 ? "+" : ""}${e.nearestDiffPct}%${e.exactMatches.length > 0 ? ", exact" : ""})`;
    const rows = targets.flatMap(([label, b]) =>
      b.compressionProbe.probes.map((p) => [
        label,
        code(p.file.split("/").pop()),
        p.decodedBytes,
        sent(p.encodings.br),
        sent(p.encodings.gzip),
        `${p.reference.brotliQuality11Bytes} / ${p.reference.gzipLevel6Bytes}`,
      ]),
    );
    return {
      table: markdownTable(
        [
          "Target",
          "Script",
          "Decoded bytes",
          "Bytes sent for Accept-Encoding br",
          "Bytes sent for Accept-Encoding gzip",
          "Model of (a): brotli q11 / gzip level 6",
        ],
        rows,
        ["l", "l", "r", "l", "l", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-first-load-js.json`,
        "methodB.<target>.compressionProbe; the distance is the nearest Node zlib setting against the bytes the server sent",
      ),
    };
  },

  "first-load-largest"(data, d) {
    const a = d.firstLoad?.methodA;
    if (!a) return null;
    const dataInside = (c) => {
      const modules = c.jsonModules ?? [];
      if (modules.length === 0) return "none over 50 kB";
      const bytes = modules.reduce((sum, m) => sum + m.bytes, 0);
      return `${modules.length} JSON module${modules.length === 1 ? "" : "s"}, ${bytes} bytes (${((bytes / c.raw) * 100).toFixed(1)}% of the chunk)`;
    };
    const rows = a.largestChunks.map((c) => [
      code(c.file.replace("static/chunks/", "")),
      c.raw,
      c.gzip,
      c.brotli,
      c.routes.join(", ") || "none",
      c.kind,
      dataInside(c),
    ]);
    return {
      table: markdownTable(
        ["Chunk", "Raw bytes", "Gzip bytes", "Brotli bytes", "Routes", "Kind", "Data inside"],
        rows,
        ["l", "r", "r", "r", "l", "l", "l"],
      ),
      source: sourceLine(`${d.dir}/${d.name}-first-load-js.json`, "methodA.largestChunks"),
    };
  },

  "api-floor"(data, d) {
    const floor = d.api?.floor;
    if (!floor || floor.length === 0) return null;
    const rows = [];
    for (const f of floor) {
      rows.push([
        f.tag,
        f.at,
        "HEAD /robots.txt",
        f.n,
        millis(f.medianMs),
        millis(f.minMs),
        millis(f.maxMs),
        f.newConnections === null ? "not recorded" : `${f.newConnections} of ${f.n}`,
        f.load1,
      ]);
      if (f.get) {
        rows.push([
          f.tag,
          f.at,
          "GET /robots.txt, first (opens the connection)",
          1,
          millis(f.get.firstMs),
          millis(f.get.firstMs),
          millis(f.get.firstMs),
          f.get.firstNewConnection ? "1 of 1" : "0 of 1",
          f.load1,
        ]);
        rows.push([
          f.tag,
          f.at,
          "GET /robots.txt, then ten on that connection",
          f.get.n,
          millis(f.get.medianMs),
          millis(f.get.minMs),
          millis(f.get.maxMs),
          `${f.get.newConnections} of ${f.get.n}`,
          f.load1,
        ]);
      }
    }
    return {
      table: markdownTable(
        [
          "Series",
          "Taken at",
          "Request",
          "n",
          "Median ms",
          "Min ms",
          "Max ms",
          "Opened a connection",
          "Client load",
        ],
        rows,
        ["l", "l", "l", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-api-timing.json`,
        "floor; time to headers of a static file served by the CDN",
      ),
    };
  },

  "api-warm"(data, d) {
    const lb = d.api?.leaderboard;
    if (!lb) return null;
    const rows = [];
    const connection = (w) =>
      w.connectionNotRecorded === w.n
        ? "not recorded"
        : `${w.newConnectionSamples} of ${w.n} opened one`;
    const push = (what, scope, w, s, extra) =>
      rows.push([
        scope,
        what,
        w.n,
        millis(s.min),
        millis(s.p50),
        millis(s.p95),
        millis(s.max),
        millis(s.mean),
        w.failures ?? 0,
        connection(w),
        `${w.clientLoad1.max} (${w.clientLoad1.samplesAbove6} samples above 6)`,
        ...(extra ?? []),
      ]);
    for (const scope of ["daily", "all"]) {
      const w = lb[scope]?.warm;
      if (!w || w.n === 0) continue;
      push("time to headers", scope, w, w.headersMs);
      push("total", scope, w, w.totalMs);
    }
    const c = d.api?.warmControl;
    if (c && c.n > 0) {
      push("time to headers", "control: GET /robots.txt", c, c.headersMs);
      push("total", "control: GET /robots.txt", c, c.totalMs);
    }
    if (rows.length === 0) return null;
    const series = lb.daily?.warm?.series;
    return {
      table: markdownTable(
        [
          "Scope",
          "Measure",
          "n",
          "Min ms",
          "p50 ms",
          "p95 ms",
          "Max ms",
          "Mean ms",
          "Failures",
          "Connections",
          "Client load (max)",
        ],
        rows,
        ["l", "l", "r", "r", "r", "r", "r", "r", "r", "l", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-api-timing.json`,
        `leaderboard.*.warm and warmControl, series ${series}; percentiles: ${d.api.meta.percentileMethod}`,
      ),
    };
  },

  "api-cold"(data, d) {
    const lb = d.api?.leaderboard;
    if (!lb) return null;
    const controls = new Map((d.api.coldControls ?? []).map((c) => [c.event, c]));
    const rows = [];
    for (const scope of ["daily", "all"]) {
      for (const [position, list] of [
        ["cold", lb[scope]?.cold ?? []],
        ["follower (warm function)", lb[scope]?.afterColdOfOtherScope ?? []],
      ]) {
        for (const r of list) {
          const control = controls.get(r.event);
          rows.push([
            r.event,
            scope,
            position,
            r.idleMinutes ?? "n/a",
            millis(r.headersMs),
            millis(r.totalMs),
            r.status,
            r.cache,
            (r.regions ?? []).join(" / "),
            connectionText(
              r.newConnection,
              position === "cold"
                ? "new (a HEAD came first and the edge closes after a HEAD; not flagged then)"
                : "reused (it followed a GET; not flagged then)",
            ),
            position === "cold" && control
              ? `${control.medianMs} (${control.samplesMs.join(", ")})`
              : "n/a",
            r.load1,
          ]);
        }
      }
    }
    if (rows.length === 0) return null;
    rows.sort((x, y) => String(x[0]).localeCompare(String(y[0])) || (x[2] === "cold" ? -1 : 1));
    const notes = new Map();
    for (const n of d.api.coldNotes ?? [])
      notes.set(n.event, [...(notes.get(n.event) ?? []), n.text]);
    const withNotes = notes.size > 0;
    if (withNotes)
      for (const row of rows)
        row.push(row[2] === "cold" ? (notes.get(row[0]) ?? []).join(" ") || "none" : "");
    return {
      table: markdownTable(
        [
          "Event",
          "Scope",
          "Position",
          "Idle min",
          "Headers ms",
          "Total ms",
          "Status",
          "Cache",
          "Edge / function region",
          "Connection of the request",
          "Control GET /robots.txt ms (median, samples)",
          "Client load",
          ...(withNotes ? ["Database state (Neon MCP)"] : []),
        ],
        rows,
        ["l", "l", "l", "r", "r", "r", "r", "l", "l", "l", "l", "r", ...(withNotes ? ["l"] : [])],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-api-timing.json`,
        "leaderboard.*.cold, leaderboard.*.afterColdOfOtherScope and coldControls",
      ),
    };
  },

  "api-card"(data, d) {
    const c = d.api?.card;
    if (!c) return null;
    const connection = (l) =>
      l.connectionNotRecorded === l.n
        ? "not recorded"
        : `${l.newConnectionSamples} of ${l.n} opened one`;
    const line = (name, l) =>
      !l || l.n === 0
        ? null
        : [
            name,
            l.n,
            millis(l.headersMs.min),
            millis(l.headersMs.p50),
            millis(l.headersMs.p95),
            millis(l.headersMs.max),
            millis(l.totalMs.p50),
            connection(l),
            l.clientLoad1.max,
          ];
    const first = c.firstRequest;
    const rows = [
      first
        ? [
            "first request (function start)",
            1,
            millis(first.headersMs),
            millis(first.headersMs),
            millis(first.headersMs),
            millis(first.headersMs),
            millis(first.totalMs),
            first.newConnection === null
              ? "not recorded"
              : `${first.newConnection ? 1 : 0} of 1 opened one`,
            "n/a",
          ]
        : null,
      line("10 distinct tokens, all", c.distinctTokens),
      line("9 distinct tokens after the first", c.distinctAfterFirst),
      line("3 repeats of one token", c.repeats),
      line("control: 3 GETs of /robots.txt before", c.controls?.before),
      line("control: 3 GETs of /robots.txt after", c.controls?.after),
    ].filter(Boolean);
    return {
      table: markdownTable(
        [
          "Request set",
          "n",
          "Min ms",
          "p50 ms",
          "p95 ms",
          "Max ms",
          "Total p50 ms",
          "Connections",
          "Client load (max)",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "l", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-api-timing.json`,
        `card, series ${c.series}; cache states, distinct ${JSON.stringify(c.cacheStates.distinct)}, repeats ${JSON.stringify(c.cacheStates.repeats)}`,
      ),
    };
  },

  "api-post"(data, d) {
    const p = d.api?.post;
    if (!p) return null;
    const rows = [
      [
        "all requests",
        p.all.n,
        millis(p.all.headersMs.min),
        millis(p.all.headersMs.p50),
        millis(p.all.headersMs.p95),
        millis(p.all.headersMs.max),
        millis(p.all.headersMs.mean),
        p.all.failures,
      ],
      [
        "after the first request",
        p.afterFirst.n,
        millis(p.afterFirst.headersMs.min),
        millis(p.afterFirst.headersMs.p50),
        millis(p.afterFirst.headersMs.p95),
        millis(p.afterFirst.headersMs.max),
        millis(p.afterFirst.headersMs.mean),
        0,
      ],
    ];
    return {
      table: markdownTable(
        ["Request set", "n", "Min ms", "p50 ms", "p95 ms", "Max ms", "Mean ms", "Failures"],
        rows,
        ["l", "r", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-api-timing.json`,
        `post; first request ${millis(p.firstRequest.headersMs)} ms; cleanup ${p.cleanup ? `${p.cleanup.leaderboardEntriesDeleted} leaderboard rows and ${p.cleanup.rateLimitEventsDeleted} rate-limit rows deleted` : "not recorded"}`,
      ),
    };
  },

  "screens-summary"(data, d) {
    const s = d.screens?.targets;
    if (!s) return null;
    const rows = Object.entries(s).map(([label, t]) => [
      label,
      t.pageLoads,
      t.fullPageShots,
      t.shotsWithOverflow.length,
      t.shotsWithConsoleErrors.length,
      `${t.themeCheck.shotsWherePrefersColorSchemeMatchedTheme}/${t.pageLoads}`,
      `${t.themeCheck.pairsChecked - t.themeCheck.pairsWithSameBodyBackground.length}/${t.themeCheck.pairsChecked}`,
    ]);
    return {
      table: markdownTable(
        [
          "Target",
          "Viewport shots",
          "Full-page shots",
          "Shots with horizontal overflow",
          "Shots with console errors",
          "Theme applied (prefers-color-scheme matched)",
          "Light/dark pairs with different body background",
        ],
        rows,
        ["l", "r", "r", "r", "r", "r", "r"],
      ),
      source: sourceLine(`${d.dir}/${d.name}-screenshots.json`, "targets.*"),
    };
  },

  "screens-matrix"(data, d, target) {
    const t = d.screens?.targets?.[target];
    if (!t) return null;
    const viewports = d.screens.meta.viewports.map((v) => v.id);
    const routes = [...new Set(t.shots.map((s) => s.route))].sort(byRoute);
    const rows = routes.map((route) => {
      const label = t.shots.find((s) => s.route === route).label;
      return [
        routeName(route, label),
        ...viewports.map((vp) => {
          const shots = t.shots.filter((s) => s.route === route && s.viewport === vp);
          if (shots.length === 0) return "none";
          const overflow = Math.max(...shots.map((s) => s.overflowPx));
          const errors = shots.reduce((n, s) => n + s.consoleErrors.length, 0);
          return `${overflow === 0 ? "0" : `+${overflow}`} px${errors > 0 ? `, ${errors} err` : ""}`;
        }),
      ];
    });
    return {
      table: markdownTable(["Route", ...viewports], rows, ["l", ...viewports.map(() => "r")]),
      source: sourceLine(
        `${d.dir}/${d.name}-screenshots.json`,
        `targets.${target}.shots; each cell is the larger horizontal overflow of the light and dark shot, then the console errors of both`,
      ),
    };
  },

  "screens-theme"(data, d, target) {
    const t = d.screens?.targets?.[target];
    if (!t) return null;
    const rows = t.themeCheck.pairs
      .filter((p) => p.viewport === "390x844")
      .map((p) => [
        code(p.route),
        p.lightBackground,
        p.darkBackground,
        p.backgroundChanged ? "yes" : "NO",
        `${p.lightPrefersDark ? "dark" : "light"} / ${p.darkPrefersDark ? "dark" : "light"}`,
      ]);
    return {
      table: markdownTable(
        [
          "Route (390x844)",
          "Light body background",
          "Dark body background",
          "Changed",
          "prefers-color-scheme seen by the page (light shot / dark shot)",
        ],
        rows,
        ["l", "l", "l", "l", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-screenshots.json`,
        `targets.${target}.themeCheck.pairs`,
      ),
    };
  },

  "screens-committed"(data, d) {
    const c = d.screens?.meta?.committed;
    if (!c) return null;
    const rows = [
      ["Directory", code(c.dir)],
      ["Quality", `WebP ${c.quality}`],
      ["Budget", `${c.budgetBytes} bytes`],
      ["Used", `${c.usedBytes} bytes in ${c.kept.length} files`],
      [
        "Left out",
        c.omitted.length === 0
          ? "none"
          : `${c.omitted.length} shots: ${summarizeOmitted(c.omitted)}`,
      ],
    ];
    return {
      table: markdownTable(["Item", "Value"], rows),
      source: sourceLine(`${d.dir}/${d.name}-screenshots.json`, "meta.committed"),
    };
  },

  // Which committed files exist for each route: the themes kept per viewport, and the full-page
  // shots of 390x844.
  "screens-index"(data, d) {
    const c = d.screens?.meta?.committed;
    if (!c) return null;
    const kept = new Set(c.kept.map((k) => k.id));
    const routeIds = [...new Set([...c.kept, ...c.omitted].map((k) => k.id.split("__")[0]))].sort(
      byRoute,
    );
    const columns = [
      ["390x844", ""],
      ["390x844", "__full"],
      ["1440x900", ""],
      ["360x640", ""],
      ["430x932", ""],
      ["844x390", ""],
    ];
    const cell = (route, viewport, suffix) => {
      const themes = ["light", "dark"].filter((t) =>
        kept.has(`${route}__${viewport}__${t}${suffix}`),
      );
      return themes.length === 0 ? "left out" : themes.join(" and ");
    };
    const rows = routeIds.map((route) => [
      code(route),
      ...columns.map(([viewport, suffix]) => cell(route, viewport, suffix)),
    ]);
    return {
      table: markdownTable(
        ["Route id", "390x844", "390x844 full page", "1440x900", "360x640", "430x932", "844x390"],
        rows,
        ["l", "l", "l", "l", "l", "l", "l"],
      ),
      source: sourceLine(
        `${d.dir}/${d.name}-screenshots.json`,
        `meta.committed.kept; files are named ${code("local__<route id>__<viewport>__<theme>[__full].webp")} in ${code(c.dir)}`,
      ),
    };
  },
};

function summarizeOmitted(omitted) {
  const counts = {};
  for (const o of omitted) counts[o.viewport] = (counts[o.viewport] ?? 0) + 1;
  return Object.entries(counts)
    .map(([viewport, n]) => `${n} at ${viewport}`)
    .join(", ");
}

// ---------------------------------------------------------------------------------------------
// Fill the report
// ---------------------------------------------------------------------------------------------

function loadSet(dir, name) {
  return {
    dir: path.relative(process.cwd(), dir) || ".",
    name,
    env: load(dir, name, "env"),
    lighthouse: load(dir, name, "lighthouse"),
    firstLoad: load(dir, name, "first-load-js"),
    api: load(dir, name, "api-timing"),
    screens: load(dir, name, "screenshots"),
  };
}

const MARKER = /<!-- audit:table ([^\s>]+)(?: ([^\s>]+))? -->[\s\S]*?<!-- \/audit:table -->/g;

function fillReport() {
  const dir = path.resolve(args.data);
  const reportFile = path.resolve(args.report);
  const set = loadSet(dir, args.name);
  const original = readFileSync(reportFile, "utf8");
  const missing = [];
  const filled = original.replace(MARKER, (whole, id, arg) => {
    const build = builders[id];
    if (!build) {
      missing.push(`${id}: no such table`);
      return whole;
    }
    const built = build(null, set, arg);
    const open = `<!-- audit:table ${id}${arg ? ` ${arg}` : ""} -->`;
    if (!built) {
      missing.push(`${id}${arg ? ` ${arg}` : ""}: no data`);
      return `${open}\nNot measured (no data in the summary file).\n<!-- /audit:table -->`;
    }
    return `${open}\n${built.table}\n\n${built.source}\n<!-- /audit:table -->`;
  });
  for (const m of missing) console.error(`warning: ${m}`);
  if (args.check) {
    if (filled !== original) {
      console.error(`${args.report} is out of date; run report.mjs without --check`);
      process.exit(1);
    }
    console.log(`${args.report} matches ${args.data}`);
    return;
  }
  writeFileSync(reportFile, filled);
  console.log(`wrote ${reportFile} (${[...original.matchAll(MARKER)].length} tables)`);
}

// ---------------------------------------------------------------------------------------------
// Compare mode
// ---------------------------------------------------------------------------------------------

function delta(base, now, format, { pct = true } = {}) {
  if (base === undefined || base === null || now === undefined || now === null) return NA;
  const diff = now - base;
  const sign = diff > 0 ? "+" : "";
  const pctText = pct && base !== 0 ? `, ${sign}${((diff / base) * 100).toFixed(1)}%` : "";
  return `${format(base)} to ${format(now)} (${sign}${format(diff)}${pctText})`;
}

// Baseline range to final range, flagged when they overlap (then the change is inside the
// run-to-run spread and proves nothing).
function compareSpread(b, f, format) {
  if (!b || !f) return NA;
  const overlap = b.min <= f.max && f.min <= b.max;
  return `${range(b, format)} to ${range(f, format)}${overlap ? " [ranges overlap]" : ""}`;
}

function compareReports() {
  const base = loadSet(path.resolve(args.baseline), args["baseline-name"]);
  const final = loadSet(path.resolve(args.final), args["final-name"]);
  const out = [];
  const section = (title, table) => out.push(`### ${title}\n\n${table}\n`);

  for (const target of ["prod", "local"]) {
    const b = base.lighthouse?.targets?.[target];
    const f = final.lighthouse?.targets?.[target];
    if (!b || !f) {
      out.push(
        `### Lighthouse ${target}\n\nNot compared (missing in ${!b ? "baseline" : "final"}).\n`,
      );
      continue;
    }
    const rows = routeEntries(b.routes)
      .filter(([id]) => f.routes[id])
      .map(([id, r]) => {
        const n = f.routes[id];
        return [
          routeName(id, r.label),
          compareSpread(r.scores.performance, n.scores.performance, int),
          compareSpread(r.metrics.lcpMs, n.metrics.lcpMs, seconds),
          compareSpread(r.metrics.tbtMs, n.metrics.tbtMs, int),
          compareSpread(r.metrics.cls, n.metrics.cls, dec(3)),
          compareSpread(r.jsTransferBytes, n.jsTransferBytes, kilobytes),
          `${runsCell(r)} to ${runsCell(n)}`,
        ];
      });
    section(
      `Lighthouse mobile, ${target} (median with min to max, baseline to final)`,
      `${markdownTable(
        ["Route", "Perf", "LCP s", "TBT ms", "CLS", "JS transferred kB", "Clean runs"],
        rows,
      )}\n\nA change is only a finding when the two ranges do not overlap. "Clean runs" counts runs taken at a 1-minute load of 6 or less.`,
    );
  }

  const ba = base.firstLoad?.methodA;
  const fa = final.firstLoad?.methodA;
  if (ba && fa) {
    const rows = routeEntries(ba.routes)
      .filter(([id]) => fa.routes[id])
      .map(([id, r]) => {
        const n = fa.routes[id];
        return [
          routeName(id, r.label),
          delta(r.total.raw, n.total.raw, kilobytes),
          delta(r.total.gzip, n.total.gzip, kilobytes),
          delta(r.total.brotli, n.total.brotli, kilobytes),
          delta(r.total.files, n.total.files, int, { pct: false }),
        ];
      });
    section(
      "First-load JS, method (a), build output (baseline to final)",
      markdownTable(["Route", "Raw kB", "Gzip kB", "Brotli kB", "Files"], rows),
    );
  }
  for (const target of ["local", "prod"]) {
    const bb = base.firstLoad?.methodB?.[target];
    const fb = final.firstLoad?.methodB?.[target];
    if (!bb || !fb) continue;
    const rows = routeEntries(bb.routes)
      .filter(([id]) => fb.routes[id])
      .map(([id, r]) => {
        const n = fb.routes[id];
        return [
          routeName(id, r.label),
          delta(r.decodedBodyBytes, n.decodedBodyBytes, kilobytes),
          delta(r.encodedBodyBytes, n.encodedBodyBytes, kilobytes),
          delta(r.jsRequests, n.jsRequests, int, { pct: false }),
        ];
      });
    section(
      `First-load JS, method (b), measured on ${target} (baseline to final)`,
      markdownTable(["Route", "Decoded kB", "Encoded body kB", "JS requests"], rows),
    );
  }

  const bl = base.api?.leaderboard;
  const fl = final.api?.leaderboard;
  if (bl && fl) {
    const rows = [];
    for (const scope of ["daily", "all"]) {
      const bw = bl[scope]?.warm;
      const fw = fl[scope]?.warm;
      if (!bw || !fw || bw.n === 0 || fw.n === 0) continue;
      rows.push([`warm ${scope} p50 headers`, delta(bw.headersMs.p50, fw.headersMs.p50, millis)]);
      rows.push([`warm ${scope} p95 headers`, delta(bw.headersMs.p95, fw.headersMs.p95, millis)]);
      const coldList = (list) =>
        list
          .map((c) => `${millis(c.headersMs)} (${connectionText(c.newConnection, "new")})`)
          .join(", ") || NA;
      rows.push([
        `cold ${scope} headers (each sample; compare only samples on the same kind of connection)`,
        `${coldList(bl[scope].cold)} to ${coldList(fl[scope].cold)}`,
      ]);
    }
    const bctl = base.api?.warmControl;
    const fctl = final.api?.warmControl;
    if (bctl && fctl) {
      rows.push([
        "control GET /robots.txt p50 headers (the network and edge part of a request)",
        delta(bctl.headersMs.p50, fctl.headersMs.p50, millis),
      ]);
    }
    const bcard = base.api?.card;
    const fcard = final.api?.card;
    if (bcard && fcard) {
      rows.push([
        "/card distinct tokens p50 headers",
        delta(bcard.distinctTokens.headersMs.p50, fcard.distinctTokens.headersMs.p50, millis),
      ]);
      rows.push([
        "/card repeats p50 headers",
        delta(bcard.repeats.headersMs.p50, fcard.repeats.headersMs.p50, millis),
      ]);
    }
    const bp = base.api?.post;
    const fp = final.api?.post;
    if (bp && fp) {
      rows.push([
        "POST (local server, Neon preview) p50",
        delta(bp.all.headersMs.p50, fp.all.headersMs.p50, millis),
      ]);
      rows.push([
        "POST (local server, Neon preview) p95",
        delta(bp.all.headersMs.p95, fp.all.headersMs.p95, millis),
      ]);
    }
    section(
      "API timing (baseline to final)",
      markdownTable(["Measure", "Baseline to final"], rows),
    );
  }

  const bs = base.screens?.targets;
  const fs = final.screens?.targets;
  if (bs && fs) {
    const rows = Object.keys(bs)
      .filter((label) => fs[label])
      .map((label) => [
        label,
        delta(bs[label].shotsWithOverflow.length, fs[label].shotsWithOverflow.length, int, {
          pct: false,
        }),
        delta(
          bs[label].shotsWithConsoleErrors.length,
          fs[label].shotsWithConsoleErrors.length,
          int,
          { pct: false },
        ),
        `${fs[label].themeCheck.shotsWhereItDidNot.length} shots without the requested theme`,
      ]);
    section(
      "Screenshots (baseline to final)",
      markdownTable(
        ["Target", "Shots with overflow", "Shots with console errors", "Theme check (final)"],
        rows,
      ),
    );
  }

  console.log(out.join("\n"));
}

if (args.baseline && args.final) compareReports();
else if (args.data && args.report) fillReport();
else {
  console.error(USAGE);
  process.exit(2);
}
