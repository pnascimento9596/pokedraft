import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { LIGHTHOUSE_ROUTES, readFixtures, routePath } from "./routes.mjs";
import { mobileMeasurement, summarizeMobile } from "./theme-metrics.mjs";

const production = "https://pokedraft-woad.vercel.app";
const expected = process.env.EXPECTED_SHA;
const phase = process.env.MEASUREMENT_PHASE;
const output = process.env.MEASUREMENT_OUTPUT ?? "output/dispatch-8/lighthouse";
if (!/^[a-f0-9]{40}$/.test(expected ?? ""))
  throw new Error("EXPECTED_SHA must be a full commit SHA");
if (!["baseline", "final"].includes(phase))
  throw new Error("MEASUREMENT_PHASE must be baseline or final");
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  !process.env.GITHUB_RUN_ID ||
  process.platform !== "linux"
) {
  throw new Error("Measurements require the GitHub-hosted ubuntu-latest workflow");
}

mkdirSync(output, { recursive: true });
async function servedIdentity() {
  const response = await fetch(`${production}/api/health?probe=${randomUUID()}`, {
    cache: "no-store",
  });
  if (!response.ok || response.headers.get("cache-control") !== "no-store")
    throw new Error("Health probe must be successful and no-store");
  const health = await response.json();
  if (health.sha !== expected || health.env !== "production")
    throw new Error("Production does not serve the expected merge SHA");
  return health;
}

const identityBefore = await servedIdentity();
const fixtures = readFixtures();
const chromePath = chromium.executablePath();
const environment = {
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  workflowSha: process.env.GITHUB_SHA,
  runnerImage: process.env.ImageOS,
  runnerImageVersion: process.env.ImageVersion,
  node: process.version,
  cpus: os.availableParallelism(),
  lighthouse: "13.5.0",
  chrome: spawnSync(chromePath, ["--version"], { encoding: "utf8" }).stdout.trim(),
};
const runs = [];
writeFileSync(
  path.join(output, "environment.json"),
  JSON.stringify({ ...environment, identityBefore }, null, 2),
);
for (let run = 1; run <= 3; run++) {
  for (const route of LIGHTHOUSE_ROUTES) {
    const url = `${production}${routePath(route, fixtures)}`;
    const reportFile = path.join(output, `${route.id}-${run}.json`);
    const loadBefore = os.loadavg();
    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "lighthouse",
        url,
        "--quiet",
        "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
        "--output=json",
        `--output-path=${reportFile}`,
        "--only-categories=performance,accessibility",
        "--form-factor=mobile",
        "--throttling-method=simulate",
      ],
      {
        env: { ...process.env, CHROME_PATH: chromePath },
        encoding: "utf8",
        timeout: 180_000,
      },
    );
    if (result.status !== 0)
      throw new Error(`Lighthouse ${route.id} run ${run} failed; no median will be published`);
    const report = JSON.parse(readFileSync(reportFile, "utf8"));
    if (report.finalDisplayedUrl !== url)
      throw new Error(`Lighthouse audited an unexpected route for ${route.id}`);
    const measurement = mobileMeasurement(report);
    const sample = {
      route: route.id,
      path: route.path,
      run,
      ...measurement,
      loadBefore,
      loadAfter: os.loadavg(),
      benchmarkIndex: report.environment.benchmarkIndex,
      lighthouseVersion: report.lighthouseVersion,
      chrome: report.environment.hostUserAgent,
      config: report.configSettings,
      warnings: report.runWarnings,
    };
    runs.push(sample);
    appendFileSync(path.join(output, "runs.jsonl"), `${JSON.stringify(sample)}\n`);
    console.log(JSON.stringify({ route: route.id, run, ...measurement }));
  }
}
const identityAfter = await servedIdentity();
const medians = LIGHTHOUSE_ROUTES.map((route) => ({
  route: route.id,
  path: route.path,
  runs: 3,
  ...summarizeMobile(runs.filter((run) => run.route === route.id)),
}));
const summary = { phase, production, environment, identityBefore, identityAfter, medians };
writeFileSync(path.join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
const markdown = [
  `# Dispatch 8 ${phase} mobile Lighthouse`,
  `Production SHA ${expected}. GitHub run ${environment.runId}, attempt ${environment.runAttempt}. Each number is the median of three mobile runs.`,
  "| Route | Performance | Accessibility | LCP ms | CLS |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...medians.map(
    (row) =>
      `| ${row.route} | ${row.performance.toFixed(0)} | ${row.accessibility.toFixed(0)} | ${row.lcpMs.toFixed(1)} | ${row.cls.toFixed(6)} |`,
  ),
].join("\n");
writeFileSync(path.join(output, "summary.md"), `${markdown}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
if (phase === "final" && runs.some((run) => run.accessibility !== 100 || run.cls !== 0)) {
  throw new Error(
    "Final gate requires Accessibility 100 and measured CLS 0 in every run; reports retained",
  );
}
