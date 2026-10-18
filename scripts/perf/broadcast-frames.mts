// Measures the live broadcast's frame pacing on a phone-sized page under a 4x CPU throttle.
//
//   pnpm exec tsx scripts/perf/broadcast-frames.mts --target before=http://localhost:3522 \
//     --target after=http://localhost:3521 --runs 5 --out docs/reports/broadcast-frame-loop/frames.json
//
// Each run opens a fresh context at 390x844, watches group match 1 of the golden cup8 run live at
// 1x, waits out the first second of play, then records 10 s: every rAF timestamp, every long task,
// every DOM mutation record, and Chrome's task, script, layout and style time. Targets alternate run
// by run so warmup and drift hit every side alike. Headless Chromium rasterises in software and
// these numbers do not include GPU raster.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../../src/engine/versions/__tests__/fixtures";

const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const WARMUP_MS = 1_000;
const WINDOW_MS = 10_000;
const THROTTLE = 4;
const LONG_TASK_MS = 50;
// A gap past one and a half 60 Hz frames is a frame the page did not draw.
const DROPPED_MS = 25;

interface Run {
  readonly target: string;
  readonly run: number;
  readonly frames: number;
  readonly p50: number;
  readonly p95: number;
  readonly maxGap: number;
  readonly dropped: number;
  readonly longTasks: number;
  readonly longTaskMs: number;
  readonly mutationsPerSec: number;
  readonly taskMs: number;
  readonly scriptMs: number;
  readonly layoutMs: number;
  readonly styleMs: number;
  readonly minuteFrom: number;
  readonly minuteTo: number;
}

function args(): { targets: [string, string][]; runs: number; out: string | null } {
  const argv = process.argv.slice(2);
  const targets: [string, string][] = [];
  let runs = 5;
  let out: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[++i];
    if (value === undefined) throw new Error(`${flag} needs a value`);
    if (flag === "--target") {
      const eq = value.indexOf("=");
      if (eq < 1) throw new Error(`--target wants name=url, got ${value}`);
      targets.push([value.slice(0, eq), value.slice(eq + 1)]);
    } else if (flag === "--runs") runs = Number(value);
    else if (flag === "--out") out = value;
    else throw new Error(`unknown flag ${flag}`);
  }
  if (targets.length === 0) throw new Error("pass at least one --target name=url");
  return { targets, runs, out };
}

function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const at = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[at]!;
}

function median(xs: readonly number[]): number {
  return percentile(
    [...xs].sort((a, b) => a - b),
    0.5,
  );
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

async function measure(browser: Browser, target: string, url: string, run: number): Promise<Run> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(`${url}/r/${LIVE}`);
  await page.getByTestId("results-record").waitFor();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await replay.getByTestId("broadcast").waitFor();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await cdp.send("Performance.enable");
  await page.waitForTimeout(WARMUP_MS);

  const minuteFrom = Number(await replay.getByTestId("match-player").getAttribute("data-minute"));
  const metric = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    const get = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
    return {
      task: get("TaskDuration"),
      script: get("ScriptDuration"),
      layout: get("LayoutDuration"),
      style: get("RecalcStyleDuration"),
    };
  };
  const before = await metric();
  // A string, so the bundler's helper names never reach the page.
  await page.evaluate(`(() => {
    const perf = { stamps: [], long: [], mutations: 0, on: true };
    window.perf = perf;
    const frame = (t) => {
      if (!perf.on) return;
      perf.stamps.push(t);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (perf.on && e.duration > ${LONG_TASK_MS}) perf.long.push(e.duration);
    }).observe({ type: "longtask" });
    new MutationObserver((records) => {
      if (perf.on) perf.mutations += records.length;
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  })()`);
  await page.waitForTimeout(WINDOW_MS);
  const sample = await page.evaluate(() => {
    const w = window as unknown as {
      perf: { stamps: number[]; long: number[]; mutations: number; on: boolean };
    };
    w.perf.on = false;
    return { stamps: w.perf.stamps, long: w.perf.long, mutations: w.perf.mutations };
  });
  const after = await metric();
  const minuteTo = Number(await replay.getByTestId("match-player").getAttribute("data-minute"));
  await context.close();

  const gaps = sample.stamps
    .slice(1)
    .map((t, i) => t - sample.stamps[i]!)
    .sort((a, b) => a - b);
  const span = (sample.stamps.at(-1)! - sample.stamps[0]!) / 1_000;
  return {
    target,
    run,
    frames: sample.stamps.length,
    p50: round(percentile(gaps, 0.5), 2),
    p95: round(percentile(gaps, 0.95), 2),
    maxGap: round(gaps.at(-1) ?? NaN, 2),
    dropped: gaps.filter((g) => g > DROPPED_MS).length,
    longTasks: sample.long.length,
    longTaskMs: round(
      sample.long.reduce((a, b) => a + b, 0),
      0,
    ),
    mutationsPerSec: round(sample.mutations / span, 0),
    taskMs: round((after.task - before.task) * 1_000, 0),
    scriptMs: round((after.script - before.script) * 1_000, 0),
    layoutMs: round((after.layout - before.layout) * 1_000, 0),
    styleMs: round((after.style - before.style) * 1_000, 0),
    minuteFrom,
    minuteTo,
  };
}

const { targets, runs, out } = args();
const browser = await chromium.launch();
const results: Run[] = [];
try {
  for (let run = 1; run <= runs; run++) {
    for (const [name, url] of run % 2 === 1 ? targets : [...targets].reverse()) {
      const r = await measure(browser, name, url, run);
      results.push(r);
      console.log(JSON.stringify(r));
    }
  }
} finally {
  await browser.close();
}

const keys = [
  "frames",
  "p50",
  "p95",
  "maxGap",
  "dropped",
  "longTasks",
  "longTaskMs",
  "mutationsPerSec",
  "taskMs",
  "scriptMs",
  "layoutMs",
  "styleMs",
] as const;
const summary = Object.fromEntries(
  targets.map(([name]) => {
    const mine = results.filter((r) => r.target === name);
    return [
      name,
      Object.fromEntries(
        keys.map((k) => {
          const xs = mine.map((r) => r[k]);
          return [k, { median: median(xs), min: Math.min(...xs), max: Math.max(...xs) }];
        }),
      ),
    ];
  }),
);
console.log(JSON.stringify(summary, null, 2));
if (out !== null) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify({ throttle: THROTTLE, warmupMs: WARMUP_MS, windowMs: WINDOW_MS, viewport: "390x844@3x", summary, runs: results }, null, 2)}\n`,
  );
}
