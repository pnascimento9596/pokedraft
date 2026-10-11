// First-load JavaScript per route, measured two ways and reported side by side.
//
// Method (a), from the build output. Next 16 no longer prints First Load JS in `pnpm build`, so the
// number is rebuilt from the `.next` artifacts of the build that is served:
//   files(route) = build-manifest.json rootMainFiles
//                + every entryJSFiles list in server/app/<route>/page_client-reference-manifest.js
//                  (layout, not-found and page entries; the global-error entry is left out)
// The noModule polyfill chunk (build-manifest polyfillFiles) is reported separately. Modern browsers
// do not fetch it. The rebuilt set is cross-checked against the <script src> tags of the prerendered
// HTML in server/app/<route>.html. Sizes are raw bytes plus gzip level 6 and brotli quality 11 of
// each file, summed. A chunk that a page loads later with import() is NOT in this set.
//   pnpm exec tsx scripts/audit/first-load-js.mjs --method a --next-dir DIR/.next [--raw-dir DIR] [--out DIR] [--name baseline]
// (--raw-dir only makes it wait for the measurement lock; nothing is written there.)
//
// Method (b), measured. Playwright Chromium with the iPhone 14 viewport and user agent, cache
// disabled, a fresh context per load. The tool waits for network idle and fonts, then settles for
// --settle-ms, and sums JS from CDP network events (encodedDataLength = bytes on the wire including
// headers) and from Resource Timing (encodedBodySize, decodedBodySize). Every load is one JSONL line.
//   pnpm exec tsx scripts/audit/first-load-js.mjs --method b --label prod|local --raw-dir DIR [--loads 2]
// With --no-prefetch the same loads run while every request with an _rsc= query is aborted, which is
// what the Next router sends to prefetch the pages behind <Link>s. The result is stored as the
// target "<label>-no-prefetch". It shows how much of the measured JS is pulled in by those prefetches.
//
// Method (b) also runs a compression probe: it fetches the three largest scripts of the home page
// three times each (identity, br, gzip; GET of static assets) and finds which brotli quality or gzip
// level of Node's zlib comes closest to the bytes the server sent. That tells how the sizes in (a), which assume
// brotli q11 and gzip level 6, relate to what each server really sends.
//
// Both methods write into <out>/<name>-first-load-js.json. After either one the tool recomputes the
// comparison and lists every route where (a) and (b) differ by more than 5 percent, with the files
// that explain the gap.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { chromium, devices } from "@playwright/test";
import {
  DEFAULT_OUT_DIR,
  appendJsonl,
  isoNow,
  parse,
  readJson,
  readJsonl,
  recordTouch,
  requireRawDir,
  sleep,
  summaryFile,
  whenQuiet,
  writeJson,
} from "./lib.mjs";
import {
  EXTRA_ROUTES,
  NOT_FOUND_ROUTE,
  ROUTES,
  TARGETS,
  readFixtures,
  routeLabel,
  routePath,
} from "./routes.mjs";
import { brotliBytes, gzipBytes, pctDiff } from "./stats.mjs";

const USAGE = `usage: first-load-js.mjs --method compare [--out DIR] [--name baseline]   (recompute the comparison from the stored data)
       first-load-js.mjs --method a --next-dir DIR [--raw-dir DIR] [--out DIR] [--name baseline]
       first-load-js.mjs --method b --label prod|local --raw-dir DIR [--base-url URL] [--loads 2]
         [--settle-ms 2000] [--pause-ms 4000] [--no-prefetch] [--out DIR] [--name baseline]`;
const args = parse(
  {
    method: { type: "string" },
    "next-dir": { type: "string" },
    label: { type: "string" },
    "raw-dir": { type: "string" },
    "base-url": { type: "string" },
    loads: { type: "string", default: "2" },
    "settle-ms": { type: "string", default: "2000" },
    "pause-ms": { type: "string", default: "4000" },
    "no-prefetch": { type: "boolean", default: false },
    out: { type: "string", default: DEFAULT_OUT_DIR },
    name: { type: "string", default: "baseline" },
  },
  USAGE,
);
if (!["a", "b", "compare"].includes(args.method)) {
  console.error(USAGE);
  process.exit(2);
}

const BYTE_THRESHOLD_PCT = 5;
const targetKey = () => (args["no-prefetch"] ? `${args.label}-no-prefetch` : args.label);
const fixtures = readFixtures();
const summaryPath = summaryFile(args.out, args.name, "first-load-js");
const loadSummary = () => (existsSync(summaryPath) ? readJson(summaryPath) : {});

// The /play extra row loads the same page entry as /play, so method (a) has one entry for both.
const A_ALIAS = { "play-kanto151": "play" };
const aRouteId = (id) => A_ALIAS[id] ?? id;

function appDir(route) {
  if (route.id === NOT_FOUND_ROUTE.id) return "_not-found";
  const clean = route.path.split("?")[0];
  return clean === "/" ? "" : clean.slice(1).replace("{token}", "[token]");
}

const toFile = (url) => new URL(url, "http://x").pathname.replace(/^\/_next\//, "");

// ---------------------------------------------------------------------------------------------
// Method (a)
// ---------------------------------------------------------------------------------------------

function walk(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name.endsWith(".js")) found.push(full);
  }
  return found;
}

function methodA() {
  if (!args["next-dir"]) {
    console.error(USAGE);
    process.exit(2);
  }
  const nextDir = path.resolve(args["next-dir"]);
  const build = readJson(path.join(nextDir, "build-manifest.json"));
  const buildId = readFileSync(path.join(nextDir, "BUILD_ID"), "utf8").trim();
  const sizeCache = new Map();
  const sizes = (file) => {
    if (!sizeCache.has(file)) {
      const data = readFileSync(path.join(nextDir, file));
      sizeCache.set(file, {
        file,
        raw: data.length,
        gzip: gzipBytes(data),
        brotli: brotliBytes(data),
        brotli3: brotliBytes(data, 3),
      });
    }
    return sizeCache.get(file);
  };
  const total = (files) =>
    files.reduce(
      (t, f) => ({
        raw: t.raw + f.raw,
        gzip: t.gzip + f.gzip,
        brotli: t.brotli + f.brotli,
        brotli3: t.brotli3 + f.brotli3,
        files: t.files + 1,
      }),
      { raw: 0, gzip: 0, brotli: 0, brotli3: 0, files: 0 },
    );

  const rootMain = build.rootMainFiles;
  const routes = {};
  for (const route of [...ROUTES, NOT_FOUND_ROUTE]) {
    const dir = appDir(route);
    const manifestFile = path.join(nextDir, "server/app", dir, "page_client-reference-manifest.js");
    const context = vm.createContext({});
    vm.runInContext(readFileSync(manifestFile, "utf8"), context);
    const [entry] = Object.values(context.__RSC_MANIFEST);
    const entryFiles = Object.entries(entry.entryJSFiles)
      .filter(([key]) => !key.includes("global-error"))
      .flatMap(([, files]) => files);
    const files = [...new Set([...rootMain, ...entryFiles])];
    const rootSet = new Set(rootMain);

    const htmlFile = path.join(nextDir, "server/app", dir === "" ? "index" : dir) + ".html";
    let crossCheck = { status: "no prerendered HTML for this route" };
    if (existsSync(htmlFile)) {
      const html = readFileSync(htmlFile, "utf8");
      const tags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
      const inHtml = new Set(
        tags.filter((t) => !/\bnoModule\b/i.test(t[0])).map((t) => toFile(t[1])),
      );
      const onlyInManifest = files.filter((f) => !inHtml.has(f));
      const onlyInHtml = [...inHtml].filter((f) => !files.includes(f));
      crossCheck = {
        status: onlyInManifest.length === 0 && onlyInHtml.length === 0 ? "match" : "mismatch",
        htmlScripts: inHtml.size,
        onlyInManifest,
        onlyInHtml,
      };
    }
    const sized = files.map(sizes);
    routes[route.id] = {
      label: routeLabel(route),
      files: sized.map((f) => ({ ...f, shared: rootSet.has(f.file) })),
      sharedRootMain: total(sized.filter((f) => rootSet.has(f.file))),
      routeOnly: total(sized.filter((f) => !rootSet.has(f.file))),
      total: total(sized),
      crossCheck,
    };
  }

  const polyfill = build.polyfillFiles.map(sizes);
  const used = new Map();
  for (const [id, r] of Object.entries(routes)) {
    for (const f of r.files) used.set(f.file, [...(used.get(f.file) ?? []), id]);
  }
  const allChunks = walk(path.join(nextDir, "static"))
    .map((full) => path.relative(nextDir, full))
    .map((file) => ({ file, raw: statSync(path.join(nextDir, file)).size }))
    .sort((a, b) => b.raw - a.raw || a.file.localeCompare(b.file));
  // Turbopack writes a JSON file that the code imports as JSON.parse('...'). Finding the big ones
  // shows how much of a chunk is data and how much is code.
  const jsonModules = (file) => {
    const text = readFileSync(path.join(nextDir, file), "utf8");
    return [...text.matchAll(/JSON\.parse\('((?:[^'\\]|\\.)*)'\)/g)]
      .filter((m) => m[1].length >= 50_000)
      .map((m) => ({
        offset: m.index,
        bytes: Buffer.byteLength(m[1]),
        startsWith: m[1].slice(0, 40).replaceAll('\\"', '"'),
      }));
  };
  const largest = allChunks.slice(0, 10).map((c) => {
    const inRoutes = used.get(c.file) ?? [];
    return {
      ...sizes(c.file),
      jsonModules: jsonModules(c.file),
      kind: rootMain.includes(c.file)
        ? "root main file, every route"
        : inRoutes.length > 0
          ? "route entry chunk"
          : "not in any initial route set",
      routes: rootMain.includes(c.file) ? ["all"] : inRoutes,
    };
  });

  return {
    what: "First-load JS rebuilt from the build output, no network",
    buildId,
    nextDir: "<served checkout>/.next",
    compression:
      "gzip level 6 and brotli quality 11 of each file, summed (brotli quality 3 is kept too, because that is what the production CDN sends)",
    jsChunksInBuild: allChunks.length,
    rootMainFiles: rootMain,
    polyfill: {
      note: "noModule polyfill chunk, listed in build-manifest polyfillFiles; modern browsers do not fetch it, so it is not in the route totals",
      files: polyfill,
      total: total(polyfill),
    },
    routes,
    largestChunks: largest,
  };
}

// ---------------------------------------------------------------------------------------------
// Method (b)
// ---------------------------------------------------------------------------------------------

const header = (headers, name) =>
  Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === name)?.[1] ?? null;

async function loadOnce(browser, baseUrl, route, blockRsc) {
  const url = `${baseUrl}${routePath(route, fixtures)}`;
  const context = await browser.newContext({ ...devices["iPhone 14"], serviceWorkers: "block" });
  try {
    if (blockRsc)
      await context.route(
        (u) => u.searchParams.has("_rsc"),
        (r) => r.abort(),
      );
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    const requests = new Map();
    const entry = (id) => requests.get(id);
    cdp.on("Network.requestWillBeSent", (e) => {
      requests.set(e.requestId, {
        url: e.request.url,
        type: e.type,
        decodedBytes: 0,
        transferBytes: null,
        finished: false,
        initiator: {
          type: e.initiator.type,
          url: e.initiator.url ?? e.initiator.stack?.callFrames?.[0]?.url ?? null,
        },
      });
    });
    cdp.on("Network.responseReceived", (e) => {
      const r = entry(e.requestId);
      if (!r) return;
      r.status = e.response.status;
      r.protocol = e.response.protocol;
      r.contentEncoding = header(e.response.headers, "content-encoding");
      r.fromCache = Boolean(e.response.fromDiskCache || e.response.fromServiceWorker);
    });
    cdp.on("Network.dataReceived", (e) => {
      const r = entry(e.requestId);
      if (r) r.decodedBytes += e.dataLength;
    });
    cdp.on("Network.loadingFinished", (e) => {
      const r = entry(e.requestId);
      if (r) Object.assign(r, { transferBytes: e.encodedDataLength, finished: true });
    });
    cdp.on("Network.loadingFailed", (e) => {
      const r = entry(e.requestId);
      if (r) r.failed = true;
    });

    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    const scriptsAtIdle = [...requests.values()].filter((r) => r.type === "Script").length;
    await sleep(Number(args["settle-ms"]));
    const timing = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((e) => ({
        name: e.name,
        encodedBodySize: e.encodedBodySize,
        decodedBodySize: e.decodedBodySize,
      })),
    );
    const byUrl = new Map(timing.map((t) => [t.name, t]));
    const scripts = [...requests.values()]
      .filter((r) => r.type === "Script")
      .map((r) => {
        const t = byUrl.get(r.url);
        return {
          file: toFile(r.url),
          status: r.status ?? null,
          protocol: r.protocol ?? null,
          contentEncoding: r.contentEncoding,
          transferBytes: r.transferBytes,
          encodedBodyBytes: t?.encodedBodySize ?? null,
          decodedBodyBytes: t?.decodedBodySize ?? r.decodedBytes,
          initiator: r.initiator,
        };
      })
      .sort((a, b) => a.file.localeCompare(b.file));
    return {
      url: routePath(route, fixtures),
      documentStatus: response?.status() ?? null,
      scriptsAtNetworkIdle: scriptsAtIdle,
      scriptsAfterSettle: scripts.length,
      unfinishedRequests: [...requests.values()].filter((r) => !r.finished && !r.failed).length,
      failedRequests: [...requests.values()].filter((r) => r.failed).length,
      requests: requests.size,
      scripts,
    };
  } finally {
    await context.close();
  }
}

const sum = (items, pick) => items.reduce((t, i) => t + (pick(i) ?? 0), 0);

function summarizeLoads(loads) {
  const first = loads[0];
  const stable = loads.every(
    (l) =>
      JSON.stringify(l.scripts.map((s) => [s.file, s.decodedBodyBytes])) ===
      JSON.stringify(first.scripts.map((s) => [s.file, s.decodedBodyBytes])),
  );
  return {
    path: first.url,
    loads: loads.length,
    documentStatus: first.documentStatus,
    sameScriptsEveryLoad: stable,
    scriptsAtNetworkIdle: first.scriptsAtNetworkIdle,
    scriptsAfterSettle: first.scriptsAfterSettle,
    unfinishedRequests: Math.max(...loads.map((l) => l.unfinishedRequests)),
    failedRequests: Math.max(...loads.map((l) => l.failedRequests ?? 0)),
    requests: first.requests,
    jsRequests: first.scripts.length,
    transferBytes: sum(first.scripts, (s) => s.transferBytes),
    encodedBodyBytes: sum(first.scripts, (s) => s.encodedBodyBytes),
    decodedBodyBytes: sum(first.scripts, (s) => s.decodedBodyBytes),
    contentEncodings: [...new Set(first.scripts.map((s) => s.contentEncoding ?? "none"))],
    protocols: [...new Set(first.scripts.map((s) => s.protocol))],
    transferBytesAcrossLoads: loads.map((l) => sum(l.scripts, (s) => s.transferBytes)),
    scripts: first.scripts,
  };
}

// GET without automatic decoding, so the length is what the server put on the wire. One fresh
// connection per request (no keep-alive reuse), and one retry after a reset.
async function fetchRaw(url, encoding, attempt = 1) {
  const client = url.startsWith("https:") ? https : http;
  const agent = new client.Agent({ keepAlive: false });
  try {
    return await new Promise((resolve, reject) => {
      client
        .get(url, { agent, headers: { "accept-encoding": encoding } }, (res) => {
          const parts = [];
          res.on("data", (c) => parts.push(c));
          res.on("error", reject);
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              contentEncoding: res.headers["content-encoding"] ?? "none",
              body: Buffer.concat(parts),
            }),
          );
        })
        .on("error", reject);
    });
  } catch (error) {
    if (attempt >= 2) throw error;
    await sleep(1000);
    return fetchRaw(url, encoding, attempt + 1);
  }
}

// How close is the server's output to each setting of Node's zlib? Exact equality is rare for big
// files (a server that compresses in streaming mode adds a few bytes), so the nearest setting is
// kept together with its distance.
function nearestSetting(sentBytes, candidates) {
  const exact = candidates.filter((c) => c.bytes === sentBytes).map((c) => c.label);
  const nearest = candidates.reduce((best, c) =>
    Math.abs(c.bytes - sentBytes) < Math.abs(best.bytes - sentBytes) ? c : best,
  );
  return {
    exactMatches: exact,
    nearest: nearest.label,
    nearestBytes: nearest.bytes,
    nearestDiffPct: Math.round(pctDiff(nearest.bytes, sentBytes) * 100) / 100,
  };
}

async function probeOne(baseUrl, file) {
  const url = `${baseUrl}/_next/${file}`;
  const plain = await fetchRaw(url, "identity");
  await sleep(400);
  const out = { file, decodedBytes: plain.body.length, encodings: {} };
  for (const encoding of ["br", "gzip"]) {
    const sent = await fetchRaw(url, encoding);
    await sleep(400);
    const roundTrip =
      sent.contentEncoding === "br"
        ? zlib.brotliDecompressSync(sent.body)
        : sent.contentEncoding === "gzip"
          ? zlib.gunzipSync(sent.body)
          : sent.body;
    const entry = {
      status: sent.status,
      contentEncoding: sent.contentEncoding,
      bytesOnWire: sent.body.length,
      decodesToTheSameBytes: roundTrip.equals(plain.body),
    };
    if (sent.contentEncoding === "br") {
      const candidates = [];
      for (let q = 1; q <= 11; q++)
        candidates.push({
          label: `brotli quality ${q}`,
          bytes: zlib.brotliCompressSync(plain.body, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: q,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: plain.body.length,
            },
          }).length,
        });
      Object.assign(entry, nearestSetting(sent.body.length, candidates));
    } else if (sent.contentEncoding === "gzip") {
      const candidates = [];
      for (let level = 1; level <= 9; level++)
        candidates.push({
          label: `gzip level ${level}`,
          bytes: zlib.gzipSync(plain.body, { level }).length,
        });
      Object.assign(entry, nearestSetting(sent.body.length, candidates));
    }
    out.encodings[encoding] = entry;
  }
  out.reference = {
    brotliQuality11Bytes: brotliBytes(plain.body),
    gzipLevel6Bytes: gzipBytes(plain.body),
  };
  return out;
}

async function compressionProbe(baseUrl, files) {
  const probes = [];
  for (const file of files) probes.push(await probeOne(baseUrl, file));
  return {
    what: "Largest home scripts fetched with Accept-Encoding identity, br and gzip (GET of static assets) and compared with Node zlib output",
    probes,
  };
}

async function methodB() {
  if (!Object.hasOwn(TARGETS, args.label ?? "")) {
    console.error(USAGE);
    process.exit(2);
  }
  const rawDir = requireRawDir(args["raw-dir"]);
  const baseUrl = args["base-url"] ?? TARGETS[args.label].baseUrl;
  const target = targetKey();
  const rawFile = path.join(rawDir, "raw", `${args.name}-first-load-js-b-${target}.jsonl`);
  const loadsWanted = Number(args.loads);
  const routes = [...ROUTES, ...EXTRA_ROUTES, NOT_FOUND_ROUTE];
  const done = new Set(readJsonl(rawFile).map((r) => r.key));
  const pending = [];
  for (let load = 1; load <= loadsWanted; load++)
    for (const route of routes)
      if (!done.has(`${target}|${route.id}|${load}`)) pending.push(route.id);
  // Bytes do not depend on the load, but a page load must not overlap a timing measurement.
  if (pending.length > 0)
    await whenQuiet(rawDir, `first-load-js b ${target}`, { requireQuiet: false }, async (gate) => {
      appendJsonl(rawFile, { key: `gate|${isoNow()}`, kind: "gate", load1: gate.load1 });
      const browser = await chromium.launch();
      try {
        for (let load = 1; load <= loadsWanted; load++) {
          for (const route of routes) {
            const key = `${target}|${route.id}|${load}`;
            if (done.has(key)) continue;
            const result = await loadOnce(browser, baseUrl, route, args["no-prefetch"]);
            if (args.label === "prod" && route.id === "leaderboard") {
              recordTouch(rawDir, "prod:api-page:/leaderboard");
            }
            appendJsonl(rawFile, {
              key,
              label: target,
              route: route.id,
              load,
              at: isoNow(),
              ...result,
            });
            console.log(
              `${key}: ${result.scripts.length} scripts, ${sum(result.scripts, (s) => s.decodedBodyBytes)} B decoded`,
            );
            await sleep(Number(args["pause-ms"]));
          }
        }
      } finally {
        await browser.close();
      }
    });
  const rows = readJsonl(rawFile);
  const result = {
    what: `First-load JS measured in Playwright Chromium, iPhone 14 viewport and user agent, cache disabled, fresh context per load${args["no-prefetch"] ? ", requests with an _rsc= query aborted (router prefetch off)" : ""}`,
    baseUrl,
    chromium: null,
    settleMs: Number(args["settle-ms"]),
    routes: {},
  };
  for (const route of routes) {
    const loads = rows.filter((r) => r.route === route.id).sort((a, b) => a.load - b.load);
    if (loads.length > 0)
      result.routes[route.id] = { label: routeLabel(route), ...summarizeLoads(loads) };
  }
  // The browser version and the compression probe touch the machine or the network, so they also
  // wait for the measurement lock.
  const homeScripts = result.routes.home?.scripts ?? [];
  const largest = [...homeScripts]
    .sort((a, b) => b.decodedBodyBytes - a.decodedBodyBytes)
    .slice(0, 3)
    .map((s) => s.file);
  await whenQuiet(
    rawDir,
    `first-load-js b wrap-up ${target}`,
    { requireQuiet: false },
    async () => {
      const browser = await chromium.launch();
      result.chromium = browser.version();
      await browser.close();
      if (largest.length > 0 && !args["no-prefetch"]) {
        result.compressionProbe = await compressionProbe(baseUrl, largest);
      }
    },
  );
  return result;
}

// ---------------------------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------------------------

function compare(doc) {
  const out = {};
  for (const [label, b] of Object.entries(doc.methodB ?? {})) {
    out[label] = {};
    for (const [id, measured] of Object.entries(b.routes)) {
      const a = doc.methodA?.routes?.[aRouteId(id)];
      if (!a) continue;
      // Pair every script the browser fetched with a file of method (a). The local build is the
      // build that (a) reads, so the names match. Production is a separate build of the same
      // commit, so its chunk names differ; then the pairing is by exact decoded size.
      const aByName = new Map(a.files.map((f) => [f.file, f]));
      const sameBuild = measured.scripts.some((s) => aByName.has(s.file));
      const pairing = sameBuild
        ? "by file name"
        : "by exact decoded size, then by the nearest size within 0.5% (separate build, names differ)";
      const sizePool = new Map();
      if (!sameBuild)
        for (const f of a.files) sizePool.set(f.raw, [...(sizePool.get(f.raw) ?? []), f]);
      const paired = [];
      const onlyInB = [];
      for (const s of measured.scripts) {
        const match = sameBuild ? aByName.get(s.file) : sizePool.get(s.decodedBodyBytes)?.shift();
        if (match) paired.push({ a: match, b: s });
        else
          onlyInB.push({
            file: s.file,
            decodedBodyBytes: s.decodedBodyBytes,
            encodedBodyBytes: s.encodedBodyBytes,
            initiator: s.initiator,
          });
      }
      // A separate build embeds build-specific strings, so a few shared chunks differ by tens or
      // hundreds of bytes. Pair what is left by the nearest size within 0.5%.
      if (!sameBuild) {
        const taken = new Set(paired.map((p) => p.a.file));
        for (const s of [...onlyInB]) {
          const near = a.files
            .filter((f) => !taken.has(f.file))
            .map((f) => ({ f, gap: Math.abs(f.raw - s.decodedBodyBytes) }))
            .filter(({ f, gap }) => gap <= f.raw * 0.005)
            .sort((x, y) => x.gap - y.gap)[0];
          if (!near) continue;
          taken.add(near.f.file);
          const full = measured.scripts.find((m) => m.file === s.file);
          paired.push({ a: near.f, b: full });
          onlyInB.splice(onlyInB.indexOf(s), 1);
        }
      }
      const usedA = new Set(paired.map((p) => p.a.file));
      const onlyInA = a.files
        .filter((f) => !usedA.has(f.file))
        .map((f) => ({ file: f.file, raw: f.raw }));
      // Model the encoded bytes file by file: each file in (a) is priced with the encoding the
      // browser really received for it (br, gzip, or none for scripts below the compression
      // threshold). A route with one tiny uncompressed script is then not priced as raw.
      const encodingOf = new Map(paired.map((p) => [p.a.file, p.b.contentEncoding ?? "none"]));
      const routeEncoding = measured.contentEncodings.includes("br")
        ? "br"
        : measured.contentEncodings.includes("gzip")
          ? "gzip"
          : "none";
      const priced = (f) => {
        const enc = encodingOf.get(f.file) ?? routeEncoding;
        return enc === "br" ? f.brotli : enc === "gzip" ? f.gzip : f.raw;
      };
      const modelled = a.files.reduce((sum, f) => sum + priced(f), 0);
      const encoding =
        measured.contentEncodings.length === 1 ? measured.contentEncodings[0] : "mixed";
      const decodedPct = pctDiff(measured.decodedBodyBytes, a.total.raw);
      const encodedPct = pctDiff(measured.encodedBodyBytes, modelled);
      // The compression probe says which brotli quality the server really uses. When it is
      // quality 3, price every file of (a) at quality 3 as well, so only real differences remain.
      const brProbes = (b.compressionProbe?.probes ?? [])
        .map((p) => p.encodings?.br)
        .filter((e) => e?.contentEncoding === "br");
      const serverQ3 =
        brProbes.length > 0 &&
        brProbes.every((e) => e.nearest === "brotli quality 3" && Math.abs(e.nearestDiffPct) < 2);
      const modelledServer =
        serverQ3 && (encoding === "br" || encoding === "mixed")
          ? a.files.reduce(
              (sum, f) =>
                sum + ((encodingOf.get(f.file) ?? routeEncoding) === "br" ? f.brotli3 : priced(f)),
              0,
            )
          : null;
      const encodedServerPct =
        modelledServer === null ? null : pctDiff(measured.encodedBodyBytes, modelledServer);
      out[label][id] = {
        aRoute: aRouteId(id),
        pairing,
        a: {
          raw: a.total.raw,
          gzip: a.total.gzip,
          brotli: a.total.brotli,
          brotli3: a.total.brotli3 ?? null,
          files: a.total.files,
        },
        b: {
          decodedBodyBytes: measured.decodedBodyBytes,
          encodedBodyBytes: measured.encodedBodyBytes,
          transferBytes: measured.transferBytes,
          files: measured.jsRequests,
        },
        encoding,
        decodedDiffPct: Math.round(decodedPct * 10) / 10,
        encodedVsModelledPct: Math.round(encodedPct * 10) / 10,
        modelledAgainst:
          encoding === "br"
            ? "brotli q11"
            : encoding === "gzip"
              ? "gzip level 6"
              : encoding === "mixed"
                ? "per-file encoding (gzip level 6 or brotli q11, raw below the compression threshold)"
                : "raw",
        extraInB: {
          files: onlyInB.length,
          decodedBytes: onlyInB.reduce((t, f) => t + f.decodedBodyBytes, 0),
        },
        missingFromB: {
          files: onlyInA.length,
          rawBytes: onlyInA.reduce((t, f) => t + f.raw, 0),
        },
        encodedVsServerQualityPct:
          encodedServerPct === null ? null : Math.round(encodedServerPct * 10) / 10,
        serverQuality:
          encodedServerPct === null ? null : "brotli q3 (matched by the compression probe)",
        exceedsFivePercent:
          Math.abs(decodedPct) > BYTE_THRESHOLD_PCT ||
          Math.abs(encodedServerPct ?? encodedPct) > BYTE_THRESHOLD_PCT,
        onlyInB,
        onlyInA,
      };
    }
  }
  return out;
}

const doc = loadSummary();
doc.meta = {
  name: args.name,
  builtAt: isoNow(),
  thresholdPct: BYTE_THRESHOLD_PCT,
  note: "Method (a) counts the chunks the prerendered HTML references. Method (b) counts every script the browser fetched until network idle plus the settle time, so it also counts chunks that the router prefetch pulls in for the pages behind visible links (see the no-prefetch target).",
};
if (args.method === "a") {
  // Offline, but compressing every chunk at brotli q11 takes a few seconds of CPU, so with
  // --raw-dir it waits for the measurement lock like every other job.
  doc.methodA = args["raw-dir"]
    ? await whenQuiet(
        requireRawDir(args["raw-dir"]),
        "first-load-js a",
        { requireQuiet: false },
        () => methodA(),
      )
    : methodA();
} else if (args.method === "b") {
  doc.methodB ??= {};
  doc.methodB[targetKey()] = await methodB();
}
doc.comparison = compare(doc);
writeJson(summaryPath, doc);
console.log(`wrote ${summaryPath}`);
