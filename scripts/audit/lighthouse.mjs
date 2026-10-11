// Lighthouse mobile runs, resumable. Every finished run appends one JSON line to
// <raw-dir>/raw/<name>-lighthouse-<label>.jsonl and keeps the full report under <raw-dir>/lhr/.
// Runs are ordered run-major (all routes for run 1, then run 2, ...) so a load spike hits one run
// of several routes, not all runs of one route. Mobile preset, default simulated throttling.
//   pnpm exec tsx scripts/audit/lighthouse.mjs --label prod|local --raw-dir DIR [--runs 3]
//   add --summarize-only to rebuild the summary from the JSONL without running anything
// Quiet-machine gate. A run starts only when the 1-minute load average is 6 or less (the Mac has
// 12 cores) and no other audit tool holds the measurement lock. A run counts as clean when the load
// was 6 or less at the start and again right after the run, and Lighthouse's own CPU benchmark
// (benchmarkIndex) was at least --min-benchmark (the load average lags: a run that began just after
// a busy spell scored 3426 although the load read 5.3, while quiet runs on this Mac score 4020 to
// 4141 and runs at load 35 to 55 score 3599 to 3782). If --max-wait-min passes without a quiet
// machine, the run goes ahead and is flagged busy. While the machine stays busy the next waits shrink
// to --busy-wait-sec. A rerun of the tool redoes every unit that has no clean record, unless
// --accept-busy is set. The summary uses one record per run number: the clean one when it exists.
// --clean-only never runs on a busy machine: when --max-wait-min passes without a quiet moment the
// tool stops, so a long wait can only add clean records.
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_OUT_DIR,
  LIGHTHOUSE_VERSION,
  SYSTEM_CHROME,
  appendJsonl,
  isoNow,
  loadNow,
  parse,
  readJson,
  readJsonl,
  recordTouch,
  requireRawDir,
  run,
  summaryFile,
  touchLogFile,
  whenQuiet,
  writeJson,
  MAX_QUIET_LOAD,
} from "./lib.mjs";
import { LIGHTHOUSE_ROUTES, TARGETS, readFixtures, routeLabel, routePath } from "./routes.mjs";
import { PERCENTILE_METHOD, median } from "./stats.mjs";

const USAGE = `usage: lighthouse.mjs --label prod|local --raw-dir DIR [--base-url URL] [--runs 3]
  [--routes id,id] [--out DIR] [--name baseline] [--max-wait-min 10] [--busy-wait-sec 30]
  [--min-benchmark 3900] [--accept-busy] [--clean-only] [--summarize-only]`;
const args = parse(
  {
    label: { type: "string" },
    "raw-dir": { type: "string" },
    "base-url": { type: "string" },
    runs: { type: "string", default: "3" },
    routes: { type: "string" },
    out: { type: "string", default: DEFAULT_OUT_DIR },
    name: { type: "string", default: "baseline" },
    "max-wait-min": { type: "string", default: "10" },
    "busy-wait-sec": { type: "string", default: "30" },
    "min-benchmark": { type: "string", default: "3900" },
    "accept-busy": { type: "boolean", default: false },
    "clean-only": { type: "boolean", default: false },
    "summarize-only": { type: "boolean", default: false },
  },
  USAGE,
);
if (!Object.hasOwn(TARGETS, args.label ?? "")) {
  console.error(USAGE);
  process.exit(2);
}
const rawDir = requireRawDir(args["raw-dir"]);
const baseUrl = args["base-url"] ?? TARGETS[args.label].baseUrl;
const runs = Number(args.runs);
const wanted = args.routes ? new Set(args.routes.split(",")) : null;
const routes = LIGHTHOUSE_ROUTES.filter((r) => wanted === null || wanted.has(r.id));
const rawFile = path.join(rawDir, "raw", `${args.name}-lighthouse-${args.label}.jsonl`);
const lhrDir = path.join(rawDir, "lhr", `${args.name}-${args.label}`);
const fixtures = readFixtures();

const pct = (score) => (score === null || score === undefined ? null : Math.round(score * 100));
const ms = (value) => (value === undefined || value === null ? null : Math.round(value * 10) / 10);

function networkTotals(items, strip) {
  const bucket = () => ({ requests: 0, transferBytes: 0, resourceBytes: 0 });
  const total = bucket();
  const byType = {};
  for (const item of items) {
    const type = item.resourceType ?? "Other";
    byType[type] ??= bucket();
    for (const b of [total, byType[type]]) {
      b.requests += 1;
      b.transferBytes += item.transferSize ?? 0;
      b.resourceBytes += item.resourceSize ?? 0;
    }
  }
  const scripts = items
    .filter((i) => i.resourceType === "Script")
    .map((i) => ({
      url: strip(i.url),
      transferBytes: i.transferSize,
      resourceBytes: i.resourceSize,
    }));
  return { total, byType, scripts, protocols: [...new Set(items.map((i) => i.protocol))] };
}

// Main-thread work of the unthrottled run: the counts of top-level tasks and their total time (the
// diagnostics audit), and the longest of the tasks over 5 ms that the main-thread-tasks audit lists.
// A late first paint with no long task before it was not waiting for JavaScript.
function mainThread(lhr) {
  const d = lhr.audits?.diagnostics?.details?.items?.[0];
  if (!d) return null;
  const listed = lhr.audits?.["main-thread-tasks"]?.details?.items ?? [];
  return {
    tasks: d.numTasks ?? null,
    totalTaskMs: ms(d.totalTaskTime),
    over10Ms: d.numTasksOver10ms ?? null,
    over50Ms: d.numTasksOver50ms ?? null,
    longestTaskMs: listed.length === 0 ? null : ms(Math.max(...listed.map((t) => t.duration))),
  };
}

// Where the request timeline of the unthrottled run reached its milestones, in ms from the first
// request: the end of the HTML, the end of the initial resources (every request that started before
// the router's first prefetch, a request with an _rsc= query), and the start of that first prefetch.
// Next to them go the DOMContentLoaded and load events and the main-thread work. Set beside the
// observed first paint they show whether a late paint waited for the network or for the CPU.
function milestones(lhr) {
  const items = lhr.audits?.["network-requests"]?.details?.items ?? [];
  const finished = items.filter(
    (i) =>
      Number.isFinite(i.networkRequestTime) &&
      Number.isFinite(i.networkEndTime) &&
      i.networkEndTime > 0,
  );
  if (finished.length === 0) return null;
  const t0 = Math.min(...finished.map((i) => i.networkRequestTime));
  const rel = (t) => ms(t - t0);
  const doc = finished.find((i) => i.resourceType === "Document");
  const prefetch = finished.filter((i) => /[?&]_rsc=/.test(i.url));
  const firstPrefetch =
    prefetch.length === 0 ? null : Math.min(...prefetch.map((i) => i.networkRequestTime));
  const initial = finished.filter(
    (i) => firstPrefetch === null || i.networkRequestTime < firstPrefetch,
  );
  const observed = lhr.audits?.metrics?.details?.items?.[0] ?? {};
  return {
    documentEndMs: doc ? rel(doc.networkEndTime) : null,
    initialResourcesEndMs:
      initial.length === 0 ? null : rel(Math.max(...initial.map((i) => i.networkEndTime))),
    firstPrefetchStartMs: firstPrefetch === null ? null : rel(firstPrefetch),
    domContentLoadedMs: ms(observed.observedDomContentLoaded),
    loadEventMs: ms(observed.observedLoad),
    mainThread: mainThread(lhr),
  };
}

// The stored milestones of a record, or, for a run taken before they were stored, the same numbers
// read from its saved report.
function milestonesOf(record) {
  if (record.milestones?.mainThread) return record.milestones;
  try {
    return milestones(readJson(record.lhrFile));
  } catch {
    return record.milestones ?? null;
  }
}

function compact(lhr, extra) {
  const strip = (url) => url.replace(baseUrl, "");
  const audits = lhr.audits;
  const num = (id) => audits[id]?.numericValue ?? null;
  const breakdown = audits["lcp-breakdown-insight"]?.details?.items ?? [];
  const phaseTable = breakdown.find((i) => i.type === "table");
  const node = breakdown.find((i) => i.type === "node");
  const phases = phaseTable
    ? Object.fromEntries(phaseTable.items.map((p) => [p.subpart, ms(p.duration)]))
    : null;
  const observed = audits.metrics?.details?.items?.[0] ?? {};
  const bootup = (audits["bootup-time"]?.details?.items ?? []).slice(0, 5).map((i) => ({
    url: strip(i.url),
    totalMs: ms(i.total),
    scriptingMs: ms(i.scripting),
    parseMs: ms(i.scriptParseCompile),
  }));
  const unused = audits["unused-javascript"]?.details;
  const blocking = audits["render-blocking-insight"]?.details?.items ?? [];
  return {
    ok: true,
    ...extra,
    lighthouseVersion: lhr.lighthouseVersion,
    config: {
      formFactor: lhr.configSettings.formFactor,
      throttlingMethod: lhr.configSettings.throttlingMethod,
      throttling: lhr.configSettings.throttling,
      screenEmulation: lhr.configSettings.screenEmulation,
      emulatedUserAgent: lhr.configSettings.emulatedUserAgent,
    },
    hostUserAgent: lhr.environment.hostUserAgent,
    benchmarkIndex: lhr.environment.benchmarkIndex,
    milestones: milestones(lhr),
    finalUrl: strip(lhr.finalDisplayedUrl),
    warnings: lhr.runWarnings,
    scores: Object.fromEntries(Object.entries(lhr.categories).map(([id, c]) => [id, pct(c.score)])),
    metrics: {
      lcpMs: ms(num("largest-contentful-paint")),
      fcpMs: ms(num("first-contentful-paint")),
      cls: num("cumulative-layout-shift"),
      tbtMs: ms(num("total-blocking-time")),
      speedIndexMs: ms(num("speed-index")),
      ttiMs: ms(num("interactive")),
      inpMs: null,
      observedLcpMs: observed.observedLargestContentfulPaint ?? null,
      observedFcpMs: observed.observedFirstContentfulPaint ?? null,
      simulatedTtfbMs: observed.timeToFirstByte ?? null,
    },
    lcp: {
      element: node
        ? { selector: node.selector, snippet: node.snippet, label: node.nodeLabel }
        : null,
      observedPhasesMs: phases,
    },
    serverResponseTimeMs: ms(num("server-response-time")),
    network: networkTotals(audits["network-requests"]?.details?.items ?? [], strip),
    bootupTop: bootup,
    unusedJavascript: unused
      ? {
          savingsBytes: unused.overallSavingsBytes ?? 0,
          savingsMs: unused.overallSavingsMs ?? 0,
          top: unused.items.slice(0, 3).map((i) => ({
            url: strip(i.url),
            totalBytes: i.totalBytes,
            wastedBytes: Math.round(i.wastedBytes),
          })),
        }
      : null,
    renderBlocking: blocking.map((i) => ({
      url: strip(i.url),
      transferBytes: i.totalBytes,
      wastedMs: ms(i.wastedMs),
    })),
    durationMs: ms(lhr.timing?.total),
  };
}

let machineBusy = false;
const MAX_ATTEMPTS = 3;

const minBenchmark = Number(args["min-benchmark"]);
// Why a run does not count as clean; empty when it does.
const busyReasons = (record) => {
  const reasons = [];
  if (record.load.atStart.load1 > MAX_QUIET_LOAD) {
    reasons.push(`load ${record.load.atStart.load1} at the start`);
  }
  if (record.load.after.load1 > MAX_QUIET_LOAD) {
    reasons.push(`load ${record.load.after.load1} after`);
  }
  if (record.benchmarkIndex < minBenchmark) {
    reasons.push(`benchmark index ${Math.round(record.benchmarkIndex)}`);
  }
  return reasons;
};
const isClean = (record) => record.ok && busyReasons(record).length === 0;
const isDone = (record) => record.ok && (args["accept-busy"] || isClean(record));

function execute(unit) {
  const url = `${baseUrl}${routePath(unit.route, fixtures)}`;
  const lhrFile = path.join(lhrDir, `${unit.route.id}-run${unit.run}.json`);
  mkdirSync(lhrDir, { recursive: true });
  const maxWaitMs = machineBusy
    ? Number(args["busy-wait-sec"]) * 1000
    : Number(args["max-wait-min"]) * 60_000;
  return whenQuiet(rawDir, `lighthouse ${unit.key}`, { maxWaitMs }, async (gate) => {
    if (args["clean-only"] && !gate.quiet) return { skipped: true };
    machineBusy = !gate.quiet;
    const startedAt = isoNow();
    const result = await run(
      "pnpm",
      [
        "dlx",
        `lighthouse@${LIGHTHOUSE_VERSION}`,
        url,
        "--output=json",
        `--output-path=${lhrFile}`,
        "--chrome-flags=--headless=new",
        "--quiet",
      ],
      { env: { ...process.env, CHROME_PATH: SYSTEM_CHROME }, timeoutMs: 6 * 60_000 },
    );
    const after = loadNow();
    if (args.label === "prod" && unit.route.id === "leaderboard") {
      recordTouch(rawDir, "prod:api-page:/leaderboard");
    }
    const base = {
      key: unit.key,
      label: args.label,
      route: unit.route.id,
      path: routePath(unit.route, fixtures),
      run: unit.run,
      startedAt,
      load: {
        atStart: { load1: gate.load1, quiet: gate.quiet, waitedMs: gate.waitedMs },
        after,
      },
      lhrFile,
    };
    if (result.code !== 0) {
      return {
        ok: false,
        ...base,
        error: `lighthouse exited ${result.code}: ${result.stderr.slice(-400)}`,
      };
    }
    const lhr = readJson(lhrFile);
    if (lhr.runtimeError) {
      return { ok: false, ...base, error: `${lhr.runtimeError.code}: ${lhr.runtimeError.message}` };
    }
    return compact(lhr, base);
  });
}

async function runAll() {
  const done = new Set(
    readJsonl(rawFile)
      .filter(isDone)
      .map((r) => r.key),
  );
  const units = [];
  for (let run = 1; run <= runs; run++) {
    for (const route of routes) units.push({ route, run, key: `${args.label}|${route.id}|${run}` });
  }
  const todo = units.filter((u) => !done.has(u.key));
  console.log(`${todo.length} of ${units.length} runs to do; load ${JSON.stringify(loadNow())}`);
  for (const unit of todo) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const outcome = await execute(unit);
      if (outcome.skipped) {
        console.log(`${unit.key}: no quiet machine within ${args["max-wait-min"]} min, stopping`);
        return;
      }
      const record = { ...outcome, attempt };
      appendJsonl(rawFile, record);
      const m = record.metrics;
      console.log(
        record.ok
          ? `${unit.key} #${attempt}: perf ${record.scores.performance} lcp ${m.lcpMs} cls ${m.cls} tbt ${m.tbtMs} load ${record.load.atStart.load1} -> ${record.load.after.load1}${isClean(record) ? "" : ` (BUSY: ${busyReasons(record).join("; ")})`}`
          : `${unit.key} #${attempt}: FAILED ${record.error.slice(0, 160)}`,
      );
      if (isDone(record)) break;
      // A run that started on a busy machine would only repeat the same busy run.
      if (record.ok && !record.load.atStart.quiet) break;
    }
  }
}

const spread = (values) => {
  const xs = values.filter((v) => v !== null && v !== undefined);
  return xs.length === 0
    ? null
    : { min: Math.min(...xs), median: median(xs), max: Math.max(...xs), n: xs.length };
};

// The heavier of the two load readings around a run: how busy the machine was while it ran.
const peakLoad = (r) => Math.max(r.load.atStart.load1, r.load.after.load1);

// One record per run number: the latest clean run; with none, the busy run that saw the lowest load
// (the latest of equals), because a run at a load of 70 says more about the machine than the page.
function pickPerRun(rows) {
  const picked = [];
  for (let run = 1; run <= runs; run++) {
    const ok = rows.filter((r) => r.ok && r.run === run);
    const leastBusy = ok.reduce(
      (best, r) => (best === null || peakLoad(r) <= peakLoad(best) ? r : best),
      null,
    );
    const chosen = ok.filter(isClean).at(-1) ?? leastBusy;
    if (chosen) picked.push(chosen);
  }
  return picked;
}

// Minutes between the previous request to the leaderboard API function (from any audit tool) and
// the start of this run. A /leaderboard page load calls that function, so the gap tells whether the
// run met a cold or a warm function.
function apiIdleMinutes(startedAt, touches) {
  if (!touches) return undefined;
  const start = Date.parse(startedAt);
  const before = touches.map((t) => t.epochMs).filter((t) => t < start);
  return before.length === 0
    ? null
    : Math.round(((start - Math.max(...before)) / 60_000) * 10) / 10;
}

function summarizeRoute(allRows, touches) {
  const ok = pickPerRun(allRows);
  const superseded = allRows
    .filter((r) => r.ok && !ok.includes(r))
    .map((r) => ({
      run: r.run,
      startedAt: r.startedAt,
      performance: r.scores.performance,
      lcpMs: r.metrics.lcpMs,
      tbtMs: r.metrics.tbtMs,
      loadAtStart: r.load.atStart.load1,
      loadAfter: r.load.after.load1,
    }));
  const rows = allRows;
  // The numbers of a route come from its clean runs. Only a route with no clean run falls back to
  // its busy runs, and says so in statsBasis. Every run stays listed in runs[] with its flag.
  const cleanRuns = ok.filter(isClean);
  const basis = cleanRuns.length > 0 ? cleanRuns : ok;
  const byLcp = [...basis].sort((a, b) => a.metrics.lcpMs - b.metrics.lcpMs);
  const mid = byLcp[Math.floor((byLcp.length - 1) / 2)];
  const js = (r) => r.network.byType.Script ?? { requests: 0, transferBytes: 0, resourceBytes: 0 };
  return {
    path: ok[0]?.path ?? null,
    runsUsed: ok.length,
    runsClean: cleanRuns.length,
    runsOnBusyMachine: ok.length - cleanRuns.length,
    statsBasis: cleanRuns.length > 0 ? "clean runs only" : "busy runs (the route has no clean run)",
    statsRuns: basis.map((r) => r.run),
    allRunsSpread: {
      performance: spread(ok.map((r) => r.scores.performance)),
      lcpMs: spread(ok.map((r) => r.metrics.lcpMs)),
      tbtMs: spread(ok.map((r) => r.metrics.tbtMs)),
    },
    failedAttempts: rows.filter((r) => !r.ok).length,
    supersededRuns: superseded,
    scores: Object.fromEntries(
      Object.keys(basis[0]?.scores ?? {}).map((id) => [id, spread(basis.map((r) => r.scores[id]))]),
    ),
    metrics: Object.fromEntries(
      Object.keys(basis[0]?.metrics ?? {}).map((id) => [
        id,
        spread(basis.map((r) => r.metrics[id])),
      ]),
    ),
    serverResponseTimeMs: spread(basis.map((r) => r.serverResponseTimeMs)),
    jsTransferBytes: spread(basis.map((r) => js(r).transferBytes)),
    jsRequests: spread(basis.map((r) => js(r).requests)),
    totalTransferBytes: spread(basis.map((r) => r.network.total.transferBytes)),
    totalRequests: spread(basis.map((r) => r.network.total.requests)),
    unusedJavascriptSavingsBytes: spread(
      basis.map((r) => r.unusedJavascript?.savingsBytes ?? null),
    ),
    benchmarkIndex: spread(basis.map((r) => r.benchmarkIndex)),
    loadAtStart: spread(basis.map((r) => r.load.atStart.load1)),
    loadAfter: spread(basis.map((r) => r.load.after.load1)),
    medianLcpRun: mid
      ? {
          run: mid.run,
          lcpElement: mid.lcp.element,
          observedPhasesMs: mid.lcp.observedPhasesMs,
          bootupTop: mid.bootupTop,
          renderBlocking: mid.renderBlocking,
          unusedJavascriptTop: mid.unusedJavascript?.top ?? [],
          scriptRequests: mid.network.scripts,
        }
      : null,
    lcpElementsAcrossRuns: ok.map((r) => r.lcp.element?.selector ?? null),
    warnings: [...new Set(basis.flatMap((r) => r.warnings))],
    runs: ok.map((r) => ({
      run: r.run,
      performance: r.scores.performance,
      lcpMs: r.metrics.lcpMs,
      cls: r.metrics.cls,
      tbtMs: r.metrics.tbtMs,
      load1: r.load.atStart.load1,
      loadAfter: r.load.after.load1,
      clean: isClean(r),
      busyReasons: busyReasons(r),
      benchmarkIndex: r.benchmarkIndex,
      observedFcpMs: r.metrics.observedFcpMs,
      observedLcpMs: r.metrics.observedLcpMs,
      milestones: milestonesOf(r),
      startedAt: r.startedAt,
      apiIdleMinutesBefore: apiIdleMinutes(r.startedAt, touches),
    })),
  };
}

function summarizeAll() {
  const rows = readJsonl(rawFile);
  const first = rows.find((r) => r.ok);
  const file = summaryFile(args.out, args.name, "lighthouse");
  let doc;
  try {
    doc = readJson(file);
  } catch {
    doc = null;
  }
  const targets = doc?.targets ?? {};
  const touches =
    args.label === "prod"
      ? readJsonl(touchLogFile(rawDir)).filter((t) => String(t.what).startsWith("prod:api"))
      : null;
  // Every route that has records, not only the routes of this invocation, so a second invocation
  // for the extra row does not drop the first.
  const measured = LIGHTHOUSE_ROUTES.filter((route) => rows.some((r) => r.route === route.id));
  targets[args.label] = {
    baseUrl,
    routes: Object.fromEntries(
      measured.map((route) => [
        route.id,
        {
          label: routeLabel(route),
          ...summarizeRoute(
            rows.filter((r) => r.route === route.id),
            route.id === "leaderboard" ? touches : null,
          ),
        },
      ]),
    ),
  };
  writeJson(file, {
    meta: {
      name: args.name,
      builtAt: isoNow(),
      lighthouse: LIGHTHOUSE_VERSION,
      chrome: first?.hostUserAgent ?? doc?.meta?.chrome ?? null,
      config: first?.config ?? doc?.meta?.config ?? null,
      runsPerRoute: runs,
      quietLoadLimit: MAX_QUIET_LOAD,
      minBenchmarkIndex: minBenchmark,
      statistic: `median of the clean runs per route with min and max (the busy runs when a route has no clean run); ${PERCENTILE_METHOD}`,
      inp: "null: Lighthouse navigation mode does not compute INP. Lab INP comes from the perf agent's traces.",
      lcpPhases:
        "observedPhasesMs come from lcp-breakdown-insight and describe the unthrottled observed load, so they do not sum to the simulated LCP in metrics.lcpMs. metrics.observedLcpMs is the matching observed value.",
      runSelection:
        "one record per run number: the latest clean run (load 6 or less at the start and after, and benchmarkIndex at least minBenchmarkIndex), else the busy run with the lowest load (the latest of equals), which is then counted in runsOnBusyMachine. The medians, minima and maxima use the clean runs only, and the busy runs only for a route that has none (statsBasis, statsRuns); allRunsSpread has the numbers over every run. Other attempts are listed in supersededRuns.",
    },
    targets,
  });
  console.log(`wrote ${file}`);
}

if (!args["summarize-only"]) await runAll();
summarizeAll();
