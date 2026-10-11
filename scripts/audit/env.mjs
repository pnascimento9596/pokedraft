// Captures the measurement environment into <out>/<name>-env.json: machine, tool versions, the
// production deployment, the network latency floor, and a check that the pinned share link renders
// the same record on the local build and on production.
//   pnpm exec tsx scripts/audit/env.mjs --raw-dir DIR --served-checkout /path/to/served/checkout
//     [--load-log FILE]   the 1-minute load average sampled during the run, one "ISO load1 load5 load15" line per sample
//     [--phase start|end] start (default) captures everything. end keeps that capture and adds an
//                         atEnd block (production deployment again, latency floor again, pinned link
//                         again) plus the load summary, so a reader can see what changed while measuring.
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, webkit } from "@playwright/test";
import {
  DEFAULT_OUT_DIR,
  LIGHTHOUSE_VERSION,
  PROD_URL,
  REPO_ROOT,
  SYSTEM_CHROME,
  loadNow,
  parse,
  recordTouch,
  readJson,
  requireRawDir,
  run,
  sleep,
  summaryFile,
  timedFetch,
  vercelInfo,
  writeJson,
} from "./lib.mjs";
import { TARGETS, readFixtures } from "./routes.mjs";
import { summarize } from "./stats.mjs";

const USAGE = `usage: env.mjs --raw-dir DIR --served-checkout DIR [--load-log FILE] [--phase start|end] [--out DIR] [--name baseline]
Writes <out>/<name>-env.json.`;
const args = parse(
  {
    "raw-dir": { type: "string" },
    "served-checkout": { type: "string" },
    "load-log": { type: "string" },
    phase: { type: "string", default: "start" },
    out: { type: "string", default: DEFAULT_OUT_DIR },
    name: { type: "string", default: "baseline" },
  },
  USAGE,
);
const rawDir = requireRawDir(args["raw-dir"]);
const servedCheckout = args["served-checkout"] ?? process.env.AUDIT_SERVED_CHECKOUT;
if (!servedCheckout) {
  console.error(USAGE);
  process.exit(2);
}

const VERCEL_PROJECT = "prj_GfNWnE8gbjY2YXOPOWszq7vxGOnL";
const VERCEL_TEAM = "team_UcazzacLGnW6w4OjIU2njYFM";

async function sh(command, argv) {
  const result = await run(command, argv, { timeoutMs: 60_000 });
  return result.code === 0
    ? result.stdout.trim()
    : `ERROR(${result.code}): ${result.stderr.trim()}`;
}

async function machine() {
  const model = await sh("sysctl", ["-n", "hw.model"]);
  const hardware = await sh("system_profiler", ["SPHardwareDataType"]);
  return {
    modelIdentifier: model,
    modelName: /Model Name:\s*(.+)/.exec(hardware)?.[1] ?? null,
    chip: await sh("sysctl", ["-n", "machdep.cpu.brand_string"]),
    logicalCores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 2 ** 30),
    macOS: `${await sh("sw_vers", ["-productVersion"])} (${await sh("sw_vers", ["-buildVersion"])})`,
    arch: os.arch(),
  };
}

async function browserVersions() {
  const out = {};
  for (const [name, type] of [
    ["playwrightChromium", chromium],
    ["playwrightWebkit", webkit],
  ]) {
    try {
      const browser = await type.launch();
      out[name] = browser.version();
      await browser.close();
    } catch (error) {
      out[name] = `ERROR: ${error.message.split("\n")[0]}`;
    }
  }
  return out;
}

async function vercelProduction() {
  const result = await run("vercel", [
    "api",
    `/v6/deployments?projectId=${VERCEL_PROJECT}&teamId=${VERCEL_TEAM}&target=production&limit=3`,
  ]);
  if (result.code !== 0) return { error: `vercel api exited ${result.code}` };
  try {
    const { deployments } = JSON.parse(result.stdout);
    return {
      current: pickDeployment(deployments[0]),
      previous: deployments.slice(1).map(pickDeployment),
    };
  } catch {
    return { error: "vercel api did not return JSON" };
  }
}

function pickDeployment(d) {
  return {
    id: d.uid,
    state: d.state ?? d.readyState,
    createdAt: new Date(d.created).toISOString(),
    gitSha: d.meta?.githubCommitSha ?? null,
    gitMessage: (d.meta?.githubCommitMessage ?? "").split("\n")[0],
  };
}

async function gitInfo() {
  const git = (cwd, ...argv) => run("git", ["-C", cwd, ...argv]).then((r) => r.stdout.trim());
  return {
    auditCloneHead: await git(REPO_ROOT, "rev-parse", "HEAD"),
    auditCloneBranch: await git(REPO_ROOT, "branch", "--show-current"),
    servedCheckoutHead: await git(servedCheckout, "rev-parse", "HEAD"),
    servedBuildId: readFileSync(path.join(servedCheckout, ".next/BUILD_ID"), "utf8").trim(),
  };
}

async function network() {
  const routeOut = await sh("route", ["-n", "get", "default"]);
  const iface = /interface:\s*(\S+)/.exec(routeOut)?.[1] ?? null;
  const ports = await sh("networksetup", ["-listallhardwareports"]);
  const port =
    iface === null
      ? null
      : new RegExp(`Hardware Port: (.+)\\nDevice: ${iface}\\b`).exec(ports)?.[1];
  const url = `${PROD_URL}/robots.txt`;
  recordTouch(rawDir, "prod:/robots.txt");
  // Ten HEADs, as the brief defines the floor. The edge closes the connection after a HEAD, so each
  // of them opens a new one and pays for TCP and TLS setup as well as the request.
  const samples = [];
  let heads = 0;
  let last;
  for (let i = 0; i < 10; i++) {
    last = await timedFetch(url, { method: "HEAD" });
    samples.push(last.headersMs);
    if (last.newConnection) heads += 1;
    await sleep(300);
  }
  // The API series reuse one connection, so the floor that belongs beside them is a GET on a kept-alive
  // connection: the first GET opens it, the next ten reuse it.
  const gets = [];
  let getsOnNewConnection = 0;
  let firstGet;
  for (let i = 0; i < 11; i++) {
    const res = await timedFetch(url);
    if (i === 0) firstGet = res;
    else {
      gets.push(res.headersMs);
      if (res.newConnection) getsOnNewConnection += 1;
    }
    await sleep(300);
  }
  const curl = await sh("curl", [
    "-s",
    "-o",
    "/dev/null",
    "-I",
    "-w",
    "%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total} %{http_version}",
    url,
  ]);
  const [dns, connect, tls, firstByte, total, httpVersion] = curl.split(" ");
  const summary = summarize(samples);
  const getSummary = summarize(gets);
  return {
    kind: `a MacBook Pro on a ${port ?? "unknown"} connection (${iface}); consumer or office ISP, not a datacenter. Home or office is not recorded by the tool.`,
    latencyFloor: {
      what: "time to response headers for HEAD /robots.txt, 10 sequential requests 300 ms apart. The edge closes the connection after a HEAD, so newConnections of the 10 opened a new connection.",
      url,
      n: summary.n,
      medianMs: round1(summary.p50),
      minMs: round1(summary.min),
      maxMs: round1(summary.max),
      firstRequestMs: round1(samples[0]),
      samplesMs: samples.map(round1),
      newConnections: heads,
      edge: vercelInfo(last.headers),
      getOnKeptAliveConnection: {
        what: "time to response headers for GET /robots.txt: one GET opens the connection (firstMs), then 10 sequential GETs 300 ms apart reuse it",
        firstMs: round1(firstGet.headersMs),
        firstOpenedConnection: firstGet.newConnection,
        n: getSummary.n,
        medianMs: round1(getSummary.p50),
        minMs: round1(getSummary.min),
        maxMs: round1(getSummary.max),
        samplesMs: gets.map(round1),
        newConnections: getsOnNewConnection,
      },
    },
    curlBreakdownSeconds: {
      what: "one new connection: DNS lookup, TCP connect, TLS done, first byte, total",
      dns: Number(dns),
      connect: Number(connect),
      tls: Number(tls),
      firstByte: Number(firstByte),
      total: Number(total),
      httpVersion,
    },
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

async function fixtureCheck() {
  const fixtures = readFixtures();
  const token = encodeURIComponent(fixtures.shareRun.token);
  const checks = {};
  for (const target of Object.values(TARGETS)) {
    if (target.label === "prod") recordTouch(rawDir, "prod:/r/<token>");
    try {
      const res = await timedFetch(`${target.baseUrl}/r/${token}`);
      const html = res.bytes.toString("utf8");
      checks[target.label] = {
        status: res.status,
        record: /data-testid="results-record">([^<]*)</.exec(html)?.[1] ?? null,
        score: /data-testid="results-score">([^<]*)</.exec(html)?.[1] ?? null,
      };
    } catch (error) {
      checks[target.label] = { error: error.message };
    }
  }
  const expected = fixtures.shareRun.expected;
  const same = Object.values(checks).every(
    (c) => c.record === expected.record && c.score === String(expected.score),
  );
  return { token: "fixtures.json shareRun.token", expected, checks, sameOnBothTargets: same };
}

// The machine was shared with an unrelated CI runner, so the load while measuring is part of the
// result. The sampler writes "ISO load1 load5 load15" every few seconds.
function loadDuring(file) {
  if (!file) return undefined;
  const rows = readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [at, load1] = line.split(" ");
      return { at, load1: Number(load1) };
    })
    .filter((r) => Number.isFinite(r.load1) && !Number.isNaN(Date.parse(r.at)));
  if (rows.length < 2) return undefined;
  const loads = summarize(rows.map((r) => r.load1));
  const gaps = rows.slice(1).map((r, i) => (Date.parse(r.at) - Date.parse(rows[i].at)) / 1000);
  return {
    what: "1-minute load average of the measuring Mac (os.loadavg), sampled by a background process; the Mac has 12 cores and ran an unrelated CI runner",
    from: rows[0].at,
    to: rows.at(-1).at,
    intervalSeconds: Math.round(summarize(gaps).p50),
    samples: loads.n,
    min: round1(loads.min),
    p50: round1(loads.p50),
    p95: round1(loads.p95),
    max: round1(loads.max),
    shareAbove6Percent: round1((rows.filter((r) => r.load1 > 6).length / rows.length) * 100),
  };
}

const now = new Date();
const file = summaryFile(args.out, args.name, "env");

if (args.phase === "end") {
  const start = readJson(file);
  if (!start?.capturedAt) {
    console.error(`${file} has no start capture; run with --phase start first`);
    process.exit(2);
  }
  const production = await vercelProduction();
  const startId = start.vercel?.current?.id ?? null;
  const endId = production.current?.id ?? null;
  const end = {
    capturedAt: now.toISOString(),
    localTime: now.toString(),
    loadAtCapture: loadNow(),
    productionDeployment: production.current ?? production,
    sameDeploymentAsStart: startId !== null && startId === endId,
    latencyFloor: (await network()).latencyFloor,
    fixtureCheck: await fixtureCheck(),
  };
  writeJson(file, {
    ...start,
    loadDuringBaseline: loadDuring(args["load-log"]) ?? start.loadDuringBaseline,
    atEnd: end,
  });
  console.log(`wrote ${file} (end phase; same deployment as start: ${end.sameDeploymentAsStart})`);
  process.exit(0);
}

const env = {
  capturedAt: now.toISOString(),
  localTime: now.toString(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  machine: await machine(),
  loadAtCapture: loadNow(),
  loadDuringBaseline: loadDuring(args["load-log"]),
  tools: {
    node: process.version,
    pnpm: await sh("pnpm", ["-v"]),
    systemChrome: await sh(SYSTEM_CHROME, ["--version"]),
    playwright: JSON.parse(
      readFileSync(path.join(REPO_ROOT, "node_modules/@playwright/test/package.json"), "utf8"),
    ).version,
    ...(await browserVersions()),
    lighthouse: LIGHTHOUSE_VERSION,
    lighthouseCheck: await sh("pnpm", ["dlx", `lighthouse@${LIGHTHOUSE_VERSION}`, "--version"]),
    vercelCli: (await sh("vercel", ["--version"])).split("\n").pop(),
  },
  git: await gitInfo(),
  vercel: await vercelProduction(),
  network: await network(),
  fixtureCheck: await fixtureCheck(),
};
writeJson(file, env);
console.log(`wrote ${file}`);
