// Measures draft drags on a phone-sized page under a 4x CPU throttle.
//
//   pnpm exec tsx scripts/perf/draft-drag.mts --target before=http://localhost:3911 \
//     --target after=http://localhost:3912 --runs 5 --out docs/reports/pitch-density-drag/drag.json
//
// Each run opens a fresh context at 390x844 on the run-test draft (Gulpin already at ST), then
// drives one scripted 2 s drag per scene with CDP mouse moves about every 16 ms:
//   candidate: an offered card dragged in a loop over the pitch, released over the drawer;
//   token: Gulpin dragged around the pitch and released where it started;
//   swipe: the open picker's toggle dragged down and up by less than the close distance.
// While each drag runs it records every rAF timestamp, every long task, every DOM mutation record
// and Chrome's task, script, layout and style time. Targets alternate run by run so warmup and
// drift hit every side alike. Headless Chromium rasterises in software and these numbers do not
// include GPU raster.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type CDPSession, type Page } from "@playwright/test";

const DRAFT = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=run-test";
const SCENES = ["candidate", "token", "swipe"] as const;
type Scene = (typeof SCENES)[number];
const DRAG_MS = 2_000;
const STEP_MS = 16;
const THROTTLE = 4;
const LONG_TASK_MS = 50;
const DROPPED_MS = 25;

interface Run {
  readonly target: string;
  readonly scene: Scene;
  readonly run: number;
  readonly moves: number;
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
}

interface Point {
  readonly x: number;
  readonly y: number;
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
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function centre(page: Page, testId: string): Promise<Point> {
  const box = await page.getByTestId(testId).boundingBox();
  if (box === null) throw new Error(`${testId} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function mouse(
  cdp: CDPSession,
  type: "mousePressed" | "mouseReleased" | "mouseMoved",
  at: Point,
  buttons: number,
): Promise<void> {
  await cdp.send("Input.dispatchMouseEvent", {
    type,
    x: at.x,
    y: at.y,
    button: "left",
    buttons,
    clickCount: type === "mouseMoved" ? 0 : 1,
  });
}

// The pointer path for each scene, as a function of the elapsed fraction of the drag.
async function plan(page: Page, scene: Scene): Promise<{ from: Point; at: (f: number) => Point }> {
  if (scene === "candidate") {
    const from = await centre(page, "candidate-296");
    const pitch = await centre(page, "slot-s5");
    return {
      from,
      at: (f) => {
        if (f < 0.15) return { x: from.x, y: from.y + (pitch.y - from.y) * (f / 0.15) };
        const a = ((f - 0.15) / 0.85) * Math.PI * 4;
        return { x: pitch.x + Math.sin(a) * 110, y: pitch.y + Math.sin(a * 0.5) * 150 };
      },
    };
  }
  if (scene === "token") {
    const from = await centre(page, "slot-s9");
    return {
      from,
      at: (f) => {
        const a = f * Math.PI * 4;
        return { x: from.x + Math.sin(a) * 110, y: from.y + (1 - Math.cos(a * 0.5)) * 160 };
      },
    };
  }
  const from = await centre(page, "draft-drawer-toggle");
  return {
    from,
    at: (f) => ({ x: from.x, y: from.y + Math.abs(Math.sin(f * Math.PI * 3)) * 70 }),
  };
}

async function measure(
  browser: Browser,
  target: string,
  url: string,
  scene: Scene,
  run: number,
): Promise<Run> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.addInitScript(() =>
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true })),
  );
  await page.goto(`${url}${DRAFT}`);
  await page.getByTestId("run-start").click();
  await page.getByTestId("candidate-316").tap();
  await page.getByTestId("slot-s9").tap();
  await page.getByTestId("candidate-296").waitFor();
  await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="draft-drawer"] > button');
    toggle?.setAttribute("data-testid", "draft-drawer-toggle");
  });
  if (scene !== "candidate") {
    await page.getByTestId("slot-s5").evaluate((el) => el.scrollIntoView({ block: "center" }));
  }
  if (scene === "token") {
    await page.getByTestId("draft-drawer-toggle").click();
    await page.getByTestId("draft-drawer-toggle").waitFor();
  }
  const path_ = await plan(page, scene);

  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await cdp.send("Performance.enable");
  await wait(500);
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
  await mouse(cdp, "mouseMoved", path_.from, 0);
  await mouse(cdp, "mousePressed", path_.from, 1);
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
  const t0 = performance.now();
  let moves = 0;
  for (;;) {
    const f = (performance.now() - t0) / DRAG_MS;
    if (f >= 1) break;
    await mouse(cdp, "mouseMoved", path_.at(f), 1);
    moves++;
    await wait(STEP_MS);
  }
  const live = await page.evaluate(
    () =>
      ({
        candidate: document.querySelector("[data-dragging-candidate]") !== null,
        token: document.querySelector("[data-dragging]") !== null,
        swipe: /translateY\((?!0px)/.test(
          document.querySelector<HTMLElement>('[data-testid="draft-drawer"]')?.style.transform ??
            "",
        ),
      }) as Record<string, boolean>,
  );
  if (!live[scene]) throw new Error(`${target} ${scene}: the drag was not live at its end`);
  const sample = await page.evaluate(() => {
    const w = window as unknown as {
      perf: { stamps: number[]; long: number[]; mutations: number; on: boolean };
    };
    w.perf.on = false;
    return { stamps: w.perf.stamps, long: w.perf.long, mutations: w.perf.mutations };
  });
  const after = await metric();
  await mouse(cdp, "mouseReleased", scene === "token" ? path_.from : path_.at(1), 0);
  await context.close();

  const gaps = sample.stamps
    .slice(1)
    .map((t, i) => t - sample.stamps[i]!)
    .sort((a, b) => a - b);
  const span = (sample.stamps.at(-1)! - sample.stamps[0]!) / 1_000;
  return {
    target,
    scene,
    run,
    moves,
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
  };
}

const { targets, runs, out } = args();
const browser = await chromium.launch();
const results: Run[] = [];
try {
  for (let run = 1; run <= runs; run++) {
    for (const scene of SCENES) {
      for (const [name, url] of run % 2 === 1 ? targets : [...targets].reverse()) {
        const r = await measure(browser, name, url, scene, run);
        results.push(r);
        console.log(JSON.stringify(r));
      }
    }
  }
} finally {
  await browser.close();
}

const keys = [
  "moves",
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
  SCENES.map((scene) => [
    scene,
    Object.fromEntries(
      targets.map(([name]) => {
        const mine = results.filter((r) => r.target === name && r.scene === scene);
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
    ),
  ]),
);
console.log(JSON.stringify(summary, null, 2));
if (out !== null) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify({ throttle: THROTTLE, dragMs: DRAG_MS, stepMs: STEP_MS, viewport: "390x844@3x", summary, runs: results }, null, 2)}\n`,
  );
}
