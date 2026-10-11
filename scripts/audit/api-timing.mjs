// API timing for the leaderboard and the share card. Modes:
//   cold       one cold event on production: the first request to /api/leaderboard after at least
//              --idle-min minutes without any request from these tools, then the other scope at once
//   warm       sequential GET /api/leaderboard on production, both scopes interleaved, with a GET of
//              /robots.txt in every round as a control that sees the same noise
//   card       GET /card on production: 10 distinct tokens, then 3 repeats of the first token
//   floor      the network latency floor: 10 HEADs to /robots.txt (each on a new connection, because
//              the edge closes the connection after a HEAD), then 10 GETs on one kept-alive connection
//   post       POST /api/leaderboard against a LOCAL server wired to the Neon preview branch
//   note       attach a free-text note to a cold event (for example the Neon compute state)
//   summarize  build <out>/<name>-api-timing.json from the raw JSONL
// Production is read-only: GET and HEAD only. POST never targets production.
// Every mode that sends requests waits for a quiet machine (1-minute load average of 6 or less, up to
// --max-wait-min, default 5) and holds the shared measurement lock, so no two measurements overlap.
// Each run writes a gate record with the load it started under; each sample also carries load1.
import { createHmac } from "node:crypto";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_OUT_DIR,
  PROD_URL,
  appendJsonl,
  isoNow,
  loadNow,
  minutesSinceTouch,
  newYorkDate,
  parse,
  platformApiRequests,
  readJsonl,
  recordTouch,
  requireRawDir,
  sleep,
  summaryFile,
  timedFetch,
  vercelInfo,
  whenQuiet,
  writeJson,
} from "./lib.mjs";
import { PERCENTILE_METHOD, median, summarize } from "./stats.mjs";
import { botCup8Token } from "./tokens.mjs";

const USAGE = `usage: api-timing.mjs --mode cold|warm|card|floor|post|note|summarize --raw-dir DIR
  [--out DIR] [--name baseline] [--label L] [--max-wait-min 5]
  cold:  --event E1 --first daily|all [--idle-min 15]
  warm:  [--n 30] [--gap 300]   (--label names the series; card and floor take it too)
  summarize: [--series L]       (the warm and card series to report; default the most recent)
  post:  --base-url http://localhost:3402 --preview-host HOST   (DATABASE_URL and IP_HASH_SECRET in the environment)
  note:  --event E1 --text "..."`;

const args = parse(
  {
    mode: { type: "string" },
    "raw-dir": { type: "string" },
    out: { type: "string", default: DEFAULT_OUT_DIR },
    name: { type: "string", default: "baseline" },
    label: { type: "string" },
    series: { type: "string" },
    event: { type: "string" },
    first: { type: "string" },
    "idle-min": { type: "string", default: "15" },
    "max-wait-min": { type: "string", default: "5" },
    n: { type: "string", default: "30" },
    gap: { type: "string", default: "300" },
    "base-url": { type: "string" },
    "preview-host": { type: "string" },
    text: { type: "string" },
  },
  USAGE,
);
const rawDir = requireRawDir(args["raw-dir"]);
const rawFile = path.join(rawDir, "raw", `${args.name}-api-timing.jsonl`);
const label = args.label ?? args.name;
const gapMs = Number(args.gap);
const round1 = (n) => Math.round(n * 10) / 10;
class Fatal extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
const die = (message, code = 2) => {
  throw new Fatal(message, code);
};
const maxWaitMs = Number(args["max-wait-min"]) * 60_000;
const gated = (name, task) =>
  whenQuiet(rawDir, `api-timing ${name}`, { maxWaitMs }, async (gate) => {
    appendJsonl(rawFile, {
      kind: "gate",
      mode: args.mode,
      name,
      at: isoNow(),
      load1: gate.load1,
      quiet: gate.quiet,
      waitedMs: gate.waitedMs,
    });
    return task(gate);
  });

function sampleFields(res) {
  return {
    at: isoNow(),
    status: res.status,
    headersMs: round1(res.headersMs),
    totalMs: round1(res.totalMs),
    bytes: res.bytes.length,
    load1: loadNow().load1,
    newConnection: res.newConnection,
    ...vercelInfo(res.headers),
  };
}

function boardUrl(scope) {
  const q = new URLSearchParams({ mode: "cup8", scope });
  if (scope === "daily") q.set("date", newYorkDate());
  return `${PROD_URL}/api/leaderboard?${q}`;
}

async function getBoard(scope) {
  const res = await timedFetch(boardUrl(scope));
  recordTouch(rawDir, "prod:api");
  let entries = null;
  try {
    const body = JSON.parse(res.bytes.toString("utf8"));
    if (Array.isArray(body.entries)) entries = body.entries.length;
  } catch {
    entries = null;
  }
  return { scope, entries, ...sampleFields(res) };
}

const ROBOTS_URL = `${PROD_URL}/robots.txt`;

// A GET of the static robots.txt: the network and edge cost of one request on whatever connection
// the caller already has. It is the control that sits beside a timing series.
async function getRobots() {
  return sampleFields(await timedFetch(ROBOTS_URL));
}

// The brief defines the floor as ten HEADs. The edge answers a HEAD with "connection: close", so each
// of those pays for a new TCP and TLS connection. A request of the API series reuses its connection,
// so a second series times GETs on one kept-alive connection: the first GET opens it (reported
// apart), the next ten reuse it. Each sample says whether it opened a connection.
async function floor(tag) {
  const head = [];
  for (let i = 0; i < 10; i++) {
    const res = await timedFetch(ROBOTS_URL, { method: "HEAD" });
    head.push({ ms: round1(res.headersMs), newConnection: res.newConnection });
    await sleep(gapMs);
  }
  const get = [];
  for (let i = 0; i < 11; i++) {
    const res = await timedFetch(ROBOTS_URL);
    get.push({ ms: round1(res.headersMs), newConnection: res.newConnection });
    await sleep(gapMs);
  }
  const reused = get.slice(1);
  const record = {
    kind: "floor",
    tag,
    at: isoNow(),
    load1: loadNow().load1,
    samplesMs: head.map((s) => s.ms),
    newConnections: head.filter((s) => s.newConnection).length,
    get: {
      firstMs: get[0].ms,
      firstNewConnection: get[0].newConnection,
      samplesMs: reused.map((s) => s.ms),
      newConnections: reused.filter((s) => s.newConnection).length,
    },
  };
  appendJsonl(rawFile, record);
  console.log(
    `floor ${tag}: HEAD median ${round1(summarize(record.samplesMs).p50)} ms (${record.newConnections} of 10 on a new connection); GET median ${round1(summarize(record.get.samplesMs).p50)} ms (${record.get.newConnections} of 10 on a new connection)`,
  );
}

async function cold() {
  if (!args.event || !["daily", "all"].includes(args.first)) die(USAGE);
  const idle = minutesSinceTouch(rawDir, "prod:api");
  const need = Number(args["idle-min"]);
  if (idle < need) {
    die(`only ${idle.toFixed(1)} min since the last request to the API function; need ${need}`, 3);
  }
  const windowMin = Math.max(need + 10, 25);
  const platform = await platformApiRequests(windowMin);
  const lastSeen =
    platform.rows.length === 0 ? null : Math.max(...platform.rows.map((r) => r.epochMs));
  const platformIdle = lastSeen === null ? null : (Date.now() - lastSeen) / 60_000;
  if (platformIdle !== null && platformIdle < need) {
    die(`the platform logged an API request ${platformIdle.toFixed(1)} min ago; need ${need}`, 3);
  }
  const platformCheck = {
    ok: platform.ok,
    windowMinutes: windowMin,
    requestsInWindow: platform.rows.length,
    lastRequestMinutesAgo: platformIdle === null ? null : round1(platformIdle),
  };
  // Open the connection with a GET, not a HEAD: the edge closes a connection after a HEAD, and the
  // cold request would then include TCP and TLS setup. Events E1 to E3 used a HEAD here.
  const preconnect = await timedFetch(ROBOTS_URL);
  const second = args.first === "daily" ? "all" : "daily";
  const first = await getBoard(args.first);
  appendJsonl(rawFile, {
    kind: "cold",
    event: args.event,
    idleMinutes: Number.isFinite(idle) ? round1(idle) : null,
    platformCheck,
    preconnect: {
      headersMs: round1(preconnect.headersMs),
      newConnection: preconnect.newConnection,
    },
    ...first,
  });
  const follower = await getBoard(second);
  appendJsonl(rawFile, { kind: "cold-follower", event: args.event, ...follower });
  // Control on the same connection, right after the event: what a request costs without the function.
  const controls = [];
  for (let i = 0; i < 3; i++) {
    await sleep(gapMs);
    controls.push(await getRobots());
  }
  appendJsonl(rawFile, { kind: "cold-control", event: args.event, samples: controls });
  console.log(
    `${args.event} cold ${args.first}: ${first.headersMs} ms (status ${first.status}, new connection: ${first.newConnection}); follower ${second}: ${follower.headersMs} ms; control GET /robots.txt: ${controls.map((c) => c.headersMs).join(", ")} ms`,
  );
}

async function warm() {
  const n = Number(args.n);
  const series = label;
  await floor(`${label}-pre-warm`);
  for (const scope of ["daily", "all", "daily", "all"]) {
    appendJsonl(rawFile, { kind: "warmup", series, ...(await getBoard(scope)) });
    await sleep(gapMs);
  }
  for (let i = 1; i <= n; i++) {
    appendJsonl(rawFile, { kind: "warm-control", seq: i, series, ...(await getRobots()) });
    await sleep(gapMs);
    for (const scope of ["daily", "all"]) {
      appendJsonl(rawFile, { kind: "warm", seq: i, series, ...(await getBoard(scope)) });
      await sleep(gapMs);
    }
  }
  await floor(`${label}-post-warm`);
  console.log(
    `warm series ${series} done: ${n} requests per scope, each round after a control GET`,
  );
}

function pngSize(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function card() {
  const tokens = Array.from({ length: 10 }, (_, i) => botCup8Token(`audit-card-${label}-${i + 1}`));
  const plan = [
    ...tokens.map((token, i) => ({ token, index: i + 1, distinct: true })),
    ...[1, 2, 3].map((r) => ({ token: tokens[0], index: 10 + r, distinct: false, repeat: r })),
  ];
  // Controls before and after: GETs of robots.txt on the connection the card requests will use. The
  // first one opens the connection, so the first card request does not pay for it.
  const control = async (when) => {
    for (let i = 0; i < 3; i++) {
      appendJsonl(rawFile, { kind: "card-control", when, series: label, ...(await getRobots()) });
      await sleep(gapMs);
    }
  };
  await control("before");
  for (const step of plan) {
    const res = await timedFetch(`${PROD_URL}/card?t=${encodeURIComponent(step.token)}`);
    recordTouch(rawDir, "prod:card");
    const size = pngSize(res.bytes);
    appendJsonl(rawFile, {
      kind: "card",
      series: label,
      index: step.index,
      distinct: step.distinct,
      repeat: step.repeat ?? null,
      png: size,
      contentType: res.headers.get("content-type"),
      ...sampleFields(res),
    });
    await sleep(gapMs);
  }
  await control("after");
  console.log("card series done: 10 distinct tokens, 3 repeats");
}

const CLIENT_IP = "198.51.100.77";
const PRODUCTION_ENDPOINT_FRAGMENT = "ep-falling-resonance-b7y5z6oi";
const ENGINE_VERSION = "pokedraft-engine-3";

function postChecks() {
  const base = args["base-url"];
  if (!base || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) {
    die("post needs --base-url of a LOCAL server, for example http://localhost:3402");
  }
  const url = process.env.DATABASE_URL;
  const secret = process.env.IP_HASH_SECRET;
  if (!url || !secret || secret.length < 32)
    die("DATABASE_URL and IP_HASH_SECRET (32+ chars) are required");
  const host = new URL(url).hostname;
  const expected = args["preview-host"];
  if (!expected)
    die("post needs --preview-host, the compute endpoint host of the Neon preview branch");
  const strip = (h) => h.replace("-pooler", "");
  if (host.includes(PRODUCTION_ENDPOINT_FRAGMENT))
    die(`refusing: ${host} is the production endpoint`);
  if (strip(host) !== strip(expected))
    die(`refusing: ${host} is not the preview endpoint ${expected}`);
  console.log(`database host ${host} is the preview endpoint`);

  return { base, url, secret, host };
}

async function post({ base, url, secret, host }) {
  const sql = neon(url);
  const keyHash = createHmac("sha256", secret).update(CLIENT_IP).digest("hex");
  const seedLike = `audit-${label}-%`;
  const [{ n: preexisting }] = await sql.query(
    "SELECT count(*)::int AS n FROM leaderboard_entries WHERE nickname LIKE 'bl-%' OR seed LIKE $1",
    [seedLike],
  );
  if (preexisting !== 0)
    die(`refusing: ${preexisting} rows with a bl- nickname or ${seedLike} seed already exist`);

  const total = Number(args.n);
  let rateRowsDeleted = 0;
  const clearRateLimit = async () => {
    const rows = await sql.query(
      "DELETE FROM rate_limit_events WHERE scope = 'submit' AND key_hash = $1 RETURNING id",
      [keyHash],
    );
    rateRowsDeleted += rows.length;
  };
  let written = 0;
  let removed = 0;
  try {
    for (let i = 1; i <= total; i++) {
      if ((i - 1) % 9 === 0) await clearRateLimit();
      const token = botCup8Token(`audit-${label}-${i}`);
      const body = JSON.stringify({ nickname: `bl-${i}`, token, engineVersion: ENGINE_VERSION });
      const res = await timedFetch(`${base}/api/leaderboard`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": CLIENT_IP },
        body,
      });
      let rank = null;
      let errorCode = null;
      try {
        const parsed = JSON.parse(res.bytes.toString("utf8"));
        rank = parsed.entry?.rank ?? null;
        errorCode = parsed.error?.code ?? null;
      } catch {
        errorCode = "UNPARSEABLE";
      }
      appendJsonl(rawFile, {
        kind: "post",
        seq: i,
        label,
        rank,
        errorCode,
        tokenBytes: token.length,
        ...sampleFields(res),
      });
      await sleep(gapMs);
    }
    const [{ n }] = await sql.query(
      "SELECT count(*)::int AS n FROM leaderboard_entries WHERE nickname LIKE 'bl-%' AND seed LIKE $1",
      [seedLike],
    );
    written = n;
  } finally {
    const rows = await sql.query(
      "DELETE FROM leaderboard_entries WHERE nickname LIKE 'bl-%' AND seed LIKE $1 RETURNING id",
      [seedLike],
    );
    removed = rows.length;
    await clearRateLimit();
    appendJsonl(rawFile, {
      kind: "post-cleanup",
      label,
      databaseHost: host,
      rowsWrittenAndFound: written,
      leaderboardEntriesDeleted: removed,
      rateLimitEventsDeleted: rateRowsDeleted,
    });
    console.log(
      `cleanup: deleted ${removed} leaderboard rows and ${rateRowsDeleted} rate-limit rows`,
    );
  }
}

function note() {
  if (!args.event || !args.text) die(USAGE);
  appendJsonl(rawFile, { kind: "note", event: args.event, at: isoNow(), text: args.text });
}

const stat = (xs) => (xs.length === 0 ? null : roundAll(summarize(xs)));
const roundAll = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, round1(v)]));
const counts = (xs) => xs.reduce((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
const loadStat = (rows) =>
  rows.length === 0
    ? null
    : {
        median: round1(median(rows.map((r) => r.load1))),
        max: round1(Math.max(...rows.map((r) => r.load1))),
        samplesAbove6: rows.filter((r) => r.load1 > 6).length,
      };
const latency = (rows) => ({
  n: rows.length,
  headersMs: stat(rows.map((r) => r.headersMs)),
  totalMs: stat(rows.map((r) => r.totalMs)),
  statuses: counts(rows.map((r) => r.status)),
  clientLoad1: loadStat(rows),
});

// Rows written before samples carried a series label belong to the series "legacy".
const seriesOf = (r) => r.series ?? "legacy";
const seriesNames = (rows) => [...new Set(rows.map(seriesOf))];
const connectionFields = (rows) => ({
  newConnectionSamples: rows.filter((r) => r.newConnection === true).length,
  connectionNotRecorded: rows.filter((r) => r.newConnection === undefined).length,
});

function summarizeAll() {
  const rows = readJsonl(rawFile);
  const of = (kind) => rows.filter((r) => r.kind === kind);
  // The series to report: --series, else the most recent one that has rows of that kind.
  const pick = (list) => args.series ?? (list.length === 0 ? null : seriesOf(list.at(-1)));
  const warmAll = of("warm");
  const warmSeries = pick(warmAll);
  const warmStats = (scope, series) => {
    const all = warmAll.filter((r) => r.scope === scope && seriesOf(r) === series);
    const ok = all.filter((r) => r.status === 200);
    return { series, ...latency(ok), failures: all.length - ok.length, ...connectionFields(ok) };
  };
  const leaderboard = {};
  for (const scope of ["daily", "all"]) {
    leaderboard[scope] = {
      warm: warmStats(scope, warmSeries),
      warmOtherSeries: seriesNames(warmAll)
        .filter((name) => name !== warmSeries)
        .map((name) => warmStats(scope, name)),
      cold: of("cold")
        .filter((r) => r.scope === scope)
        .map(coldRow),
      afterColdOfOtherScope: of("cold-follower")
        .filter((r) => r.scope === scope)
        .map(coldRow),
    };
  }
  const warmControlRows = of("warm-control").filter(
    (r) => seriesOf(r) === warmSeries && r.status === 200,
  );
  const coldControls = of("cold-control").map((c) => ({
    event: c.event,
    samplesMs: c.samples.map((x) => x.headersMs),
    medianMs: round1(median(c.samples.map((x) => x.headersMs))),
    newConnections: c.samples.filter((x) => x.newConnection).length,
  }));
  const cardAll = of("card");
  const cardSeries = pick(cardAll);
  const cardRows = cardAll.filter((r) => seriesOf(r) === cardSeries);
  const cardControlRows = of("card-control").filter((r) => seriesOf(r) === cardSeries);
  const cardOk = (r) => r.status === 200 && r.png?.width === 1200 && r.png?.height === 630;
  const distinct = cardRows.filter((r) => r.distinct);
  const repeats = cardRows.filter((r) => !r.distinct);
  const post = of("post");
  const cleanup = of("post-cleanup").at(-1) ?? null;
  const postOk = post.filter((r) => r.status === 201);
  const out = {
    meta: {
      name: args.name,
      builtAt: isoNow(),
      percentileMethod: PERCENTILE_METHOD,
      unit: "milliseconds",
      headersMs: "time until the response headers arrive (time to first byte)",
      totalMs: "time until the whole body has been read",
      client:
        "Node fetch (undici) from a MacBook Pro on Wi-Fi, HTTP/1.1. Each sample records newConnection, and a table does not mix samples that opened a connection with samples that reused one. The edge answers a HEAD with connection: close, so a series of HEADs opens a new connection every time.",
      coldDefinition:
        "the first request to /api/leaderboard after at least the recorded idle minutes with no request from these tools to the function; the Neon compute may also have been suspended, so a cold sample is function start plus possible database resume",
    },
    gates: of("gate").map((g) => ({
      name: g.name,
      at: g.at,
      load1: g.load1,
      quietAtStart: g.quiet,
      waitedMs: g.waitedMs,
    })),
    floor: of("floor").map((r) => ({
      tag: r.tag,
      at: r.at,
      load1: r.load1,
      medianMs: round1(summarize(r.samplesMs).p50),
      minMs: round1(summarize(r.samplesMs).min),
      maxMs: round1(summarize(r.samplesMs).max),
      n: r.samplesMs.length,
      newConnections: r.newConnections ?? null,
      get: r.get
        ? {
            firstMs: r.get.firstMs,
            firstNewConnection: r.get.firstNewConnection,
            medianMs: round1(summarize(r.get.samplesMs).p50),
            minMs: round1(summarize(r.get.samplesMs).min),
            maxMs: round1(summarize(r.get.samplesMs).max),
            n: r.get.samplesMs.length,
            newConnections: r.get.newConnections,
          }
        : null,
    })),
    warmControl:
      warmControlRows.length === 0
        ? null
        : {
            series: warmSeries,
            what: "GET /robots.txt once per round, before that round's two API requests, on the same connection",
            ...latency(warmControlRows),
            ...connectionFields(warmControlRows),
          },
    leaderboard,
    coldControls,
    coldNotes: of("note"),
    card:
      cardRows.length === 0
        ? null
        : {
            series: cardSeries,
            otherSeries: seriesNames(cardAll).filter((name) => name !== cardSeries),
            controls: Object.fromEntries(
              ["before", "after"].map((when) => {
                const list = cardControlRows.filter((r) => r.when === when && r.status === 200);
                return [when, { ...latency(list), ...connectionFields(list) }];
              }),
            ),
            firstRequest: distinct[0] ? cardRow(distinct[0], cardOk) : null,
            distinctTokens: {
              ...latency(distinct.filter(cardOk)),
              failures: distinct.filter((r) => !cardOk(r)).length,
              ...connectionFields(distinct.filter(cardOk)),
            },
            distinctAfterFirst: {
              ...latency(distinct.slice(1).filter(cardOk)),
              ...connectionFields(distinct.slice(1).filter(cardOk)),
            },
            repeats: {
              ...latency(repeats.filter(cardOk)),
              failures: repeats.filter((r) => !cardOk(r)).length,
              ...connectionFields(repeats.filter(cardOk)),
            },
            cacheStates: {
              distinct: counts(distinct.map((r) => r.cache ?? "none")),
              repeats: counts(repeats.map((r) => r.cache ?? "none")),
            },
            rows: cardRows.map((r) => cardRow(r, cardOk)),
          },
    post:
      post.length === 0
        ? null
        : {
            what: "local Next server on a laptop plus the Neon preview branch over the internet; not Vercel-to-Neon latency; production POST not measured because it writes rows and burns the rate limit",
            all: { ...latency(postOk), failures: post.length - postOk.length },
            firstRequest: post[0]
              ? { headersMs: post[0].headersMs, totalMs: post[0].totalMs, status: post[0].status }
              : null,
            afterFirst: latency(postOk.filter((r) => r.seq > 1)),
            errorCodes: counts(post.filter((r) => r.errorCode).map((r) => r.errorCode)),
            ranksReturned: postOk.filter((r) => typeof r.rank === "number").length,
            cleanup,
          },
  };
  const file = summaryFile(args.out, args.name, "api-timing");
  writeJson(file, out);
  console.log(`wrote ${file}`);
}

function coldRow(r) {
  return {
    event: r.event,
    at: r.at,
    idleMinutes: r.idleMinutes ?? null,
    platformCheck: r.platformCheck ?? null,
    status: r.status,
    headersMs: r.headersMs,
    totalMs: r.totalMs,
    regions: r.regions,
    cache: r.cache,
    entries: r.entries,
    load1: r.load1,
    newConnection: r.newConnection ?? null,
    preconnect: r.preconnect ?? null,
  };
}

function cardRow(r, ok) {
  return {
    index: r.index,
    distinct: r.distinct,
    status: r.status,
    pngOk: ok(r),
    headersMs: r.headersMs,
    totalMs: r.totalMs,
    bytes: r.bytes,
    cache: r.cache,
    cacheControl: r.cacheControl,
    regions: r.regions,
    newConnection: r.newConnection ?? null,
  };
}

const modes = {
  cold: () => {
    if (!args.event || !["daily", "all"].includes(args.first)) die(USAGE);
    const idle = minutesSinceTouch(rawDir, "prod:api");
    const need = Number(args["idle-min"]);
    if (idle < need)
      die(
        `only ${idle.toFixed(1)} min since the last request to the API function; need ${need}`,
        3,
      );
    return gated(`cold ${args.event}`, cold);
  },
  warm: () => gated(`warm ${label}`, warm),
  card: () => gated(`card ${label}`, card),
  floor: () => gated(`floor ${label}`, () => floor(label)),
  post: () => {
    const checks = postChecks();
    return gated(`post ${label}`, () => post(checks));
  },
  note,
  summarize: summarizeAll,
};
try {
  if (!Object.hasOwn(modes, args.mode ?? "")) die(USAGE);
  await modes[args.mode]();
} catch (error) {
  if (!(error instanceof Fatal)) throw error;
  console.error(error.message);
  process.exit(error.code);
}
