// Shared plumbing for the audit tools: argument parsing, paths, JSONL files, the load gate and a
// process runner. Pure statistics live in stats.mts.
import { spawn } from "node:child_process";
import dc from "node:diagnostics_channel";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

export { sleep };

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
export const SYSTEM_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const LIGHTHOUSE_VERSION = "13.5.0";
export const PROD_URL = "https://pokedraft-woad.vercel.app";
export const LOCAL_URL = "http://localhost:3401";
export const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs/reports/audit-data");
export const MAX_QUIET_LOAD = 6;

export function parse(options, usage) {
  try {
    return parseArgs({ options, strict: true, allowPositionals: false }).values;
  } catch (error) {
    console.error(`${error.message}\n\n${usage}`);
    process.exit(2);
  }
}

export function requireRawDir(value) {
  const dir = value ?? process.env.AUDIT_RAW_DIR;
  if (!dir) {
    console.error("Set --raw-dir or AUDIT_RAW_DIR to a scratch directory outside the repository.");
    process.exit(2);
  }
  return path.resolve(dir);
}

export function appendJsonl(file, record) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`);
}

export function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function summaryFile(outDir, name, kind) {
  return path.join(outDir, `${name}-${kind}.json`);
}

export function loadNow() {
  const [load1, load5, load15] = os.loadavg().map((n) => Math.round(n * 100) / 100);
  return { load1, load5, load15 };
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

// One measurement at a time, across processes: an exclusive lock file in the raw directory. A lock
// whose process is gone is stale and gets removed.
function tryLock(file, holder) {
  mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(file, "wx");
      writeSync(fd, JSON.stringify({ pid: process.pid, holder, at: isoNow() }));
      closeSync(fd);
      return true;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let current = null;
      try {
        current = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        // The holder is still writing the file.
      }
      if (current && !pidAlive(current.pid)) {
        unlinkSync(file);
        continue;
      }
      return false;
    }
  }
  return false;
}

// Runs `task(gate)` while holding the measurement lock. With requireQuiet (the default) the task
// starts only when the 1-minute load average is at or under `maxLoad`, or after `maxWaitMs` of
// waiting, in which case `gate.quiet` is false and the caller must flag the result. The lock is held
// only while the task runs, so a job that is still waiting for a quiet machine does not block others.
export async function whenQuiet(
  rawDir,
  holder,
  { maxLoad = MAX_QUIET_LOAD, maxWaitMs = 15 * 60_000, pollMs = 10_000, requireQuiet = true } = {},
  task,
) {
  const file = path.join(rawDir, "measure.lock");
  const started = Date.now();
  let announced = false;
  for (;;) {
    const load = loadNow();
    const waitedMs = Date.now() - started;
    const quiet = load.load1 <= maxLoad;
    const ready = !requireQuiet || quiet || waitedMs >= maxWaitMs;
    if (ready && tryLock(file, holder)) {
      try {
        return await task({ ...load, quiet, waitedMs });
      } finally {
        try {
          unlinkSync(file);
        } catch {
          // Already removed.
        }
      }
    }
    if (!announced) {
      console.error(
        ready
          ? `${holder}: waiting for the measurement lock`
          : `${holder}: load ${load.load1} is above ${maxLoad}; waiting up to ${Math.round(maxWaitMs / 60_000)} min for a quiet machine`,
      );
      announced = true;
    }
    await sleep(pollMs);
  }
}

export function run(command, args, { env, cwd, timeoutMs = 180_000, input } = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(command, args, {
      env: env ?? process.env,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, stdout, stderr, ms: performance.now() - started });
    });
    child.stdin.end(input ?? "");
  });
}

export function isoNow() {
  return new Date().toISOString();
}

// The daily board date: the calendar day in America/New_York, as src/leaderboard/daily.ts defines it.
export function newYorkDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hostOf(url) {
  return new URL(url).host;
}

// Records every request a tool sends to a function the cold-start protocol tracks, so a cold
// sample can prove it followed 15 idle minutes.
export function touchLogFile(rawDir) {
  return path.join(rawDir, "prod-touch.jsonl");
}

export function recordTouch(rawDir, what) {
  appendJsonl(touchLogFile(rawDir), { at: isoNow(), epochMs: Date.now(), what });
}

export function minutesSinceTouch(rawDir, whatPrefix) {
  const touches = readJsonl(touchLogFile(rawDir)).filter((t) => t.what.startsWith(whatPrefix));
  if (touches.length === 0) return Number.POSITIVE_INFINITY;
  return (Date.now() - Math.max(...touches.map((t) => t.epochMs))) / 60_000;
}

export const AUDIT_USER_AGENT = "pokedraft-audit/1 (dispatch 7 baseline; contact: repo owner)";

// Connections that Node's fetch (undici) has opened in this process. A request on a new connection
// pays for TCP and TLS setup (about three round trips); a request on a kept-alive connection does
// not. The Vercel edge answers a HEAD with "connection: close", so every HEAD that follows another
// HEAD opens a new connection, while GETs keep one alive. Every timed sample records which kind it
// was, because the two differ by tens of milliseconds and a table must not mix them.
let connectionsOpened = 0;
dc.subscribe("undici:client:connected", () => {
  connectionsOpened += 1;
});

// One request with the two times a latency table needs: until the response headers arrive (the
// time to first byte, plus header parsing) and until the body has been read. `newConnection` is true
// when this request had to open a connection. Requests must run one at a time for it to be exact.
export async function timedFetch(url, { method = "GET", headers = {}, body } = {}) {
  const connectionsBefore = connectionsOpened;
  const started = performance.now();
  const response = await fetch(url, {
    method,
    headers: { "user-agent": AUDIT_USER_AGENT, ...headers },
    body,
    redirect: "manual",
  });
  const headersMs = performance.now() - started;
  const bytes = Buffer.from(await response.arrayBuffer());
  const totalMs = performance.now() - started;
  return {
    status: response.status,
    headersMs,
    totalMs,
    bytes,
    headers: response.headers,
    newConnection: connectionsOpened > connectionsBefore,
  };
}

// `x-vercel-id` reads "edgeRegion::functionRegion::requestId". Only the regions are kept.
export function vercelInfo(headers) {
  const id = headers.get("x-vercel-id");
  return {
    regions: id === null ? [] : id.split("::").slice(0, -1),
    cache: headers.get("x-vercel-cache"),
    cacheControl: headers.get("cache-control"),
  };
}

// Production API requests seen by the platform in the last `sinceMinutes`, from every caller, read
// from `vercel logs` (Hobby keeps one hour). Used to prove a cold sample followed an idle period.
export async function platformApiRequests(sinceMinutes) {
  const result = await run(
    "vercel",
    [
      "logs",
      "--no-branch",
      "--since",
      `${sinceMinutes}m`,
      "--limit",
      "1000",
      "--json",
      "--no-follow",
    ],
    { cwd: REPO_ROOT, timeoutMs: 120_000 },
  );
  if (result.code !== 0) return { ok: false, error: `vercel logs exited ${result.code}`, rows: [] };
  const rows = result.stdout
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line))
    .filter((row) => row.requestPath?.startsWith("/api/leaderboard"))
    .map((row) => ({
      at: new Date(row.timestamp).toISOString(),
      epochMs: row.timestamp,
      method: row.requestMethod,
      path: row.requestPath,
      status: row.responseStatusCode,
      source: row.source,
    }));
  return { ok: true, rows };
}
