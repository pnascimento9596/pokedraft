// Screenshots of every route in light and dark at five viewports, with the checks that make them
// evidence, not pictures. Playwright Chromium, a fresh context per page load, reducedMotion "reduce".
//   shoot      take the matrix for one target. Resumable. Raw PNGs go to <raw-dir>/shots/<label>/.
//   compress   convert the LOCAL PNGs to WebP (quality 70, sharp is already a dependency of the app)
//              into --commit-dir, within --max-bytes. Priority: viewport-sized 390x844 and 1440x900
//              shots, the full-page 390x844 shots (scaled to 780 px wide), then 360x640, then the rest.
//              The kept set is a prefix of that order.
//   summarize  write <out>/<name>-screenshots.json from the raw JSONL and the compress result.
//   pnpm exec tsx scripts/audit/screenshots.mjs --mode shoot --label local|prod --raw-dir DIR
// Per shot the tool records: document scrollWidth against the viewport width (horizontal overflow),
// the computed body background colour, prefers-color-scheme as the page sees it, the html data-theme
// attribute, console errors, page errors, failed requests and the document status. A shot whose
// prefers-color-scheme does not match the requested theme is retaken. The matrix is 8 routes x 5
// viewports x 2 themes viewport-sized, plus a full-page shot at 390x844 in each theme.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  DEFAULT_OUT_DIR,
  REPO_ROOT,
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
  SCREENSHOT_ROUTES,
  TARGETS,
  THEMES,
  VIEWPORTS,
  readFixtures,
  routeLabel,
  routePath,
} from "./routes.mjs";

const USAGE = `usage: screenshots.mjs --mode shoot --label prod|local --raw-dir DIR [--base-url URL]
         [--pause-ms 3000] [--settle-ms 500] [--routes id,id] [--viewports 390x844,...] [--limit N]
       screenshots.mjs --mode compress --label local --raw-dir DIR [--commit-dir DIR]
         [--max-bytes 4000000] [--quality 70]
       screenshots.mjs --mode summarize --raw-dir DIR [--out DIR] [--name baseline]`;
const args = parse(
  {
    mode: { type: "string" },
    label: { type: "string" },
    "raw-dir": { type: "string" },
    "base-url": { type: "string" },
    "pause-ms": { type: "string", default: "3000" },
    "settle-ms": { type: "string", default: "500" },
    routes: { type: "string" },
    viewports: { type: "string" },
    limit: { type: "string" },
    "commit-dir": { type: "string", default: path.join(REPO_ROOT, "docs/reports/audit-baseline") },
    "max-bytes": { type: "string", default: "4000000" },
    quality: { type: "string", default: "70" },
    out: { type: "string", default: DEFAULT_OUT_DIR },
    name: { type: "string", default: "baseline" },
  },
  USAGE,
);
const rawDir = requireRawDir(args["raw-dir"]);
const fixtures = readFixtures();
const rawFile = (label) => path.join(rawDir, "raw", `${args.name}-screenshots-${label}.jsonl`);
const shotsDir = (label) => path.join(rawDir, "shots", label);
const compressFile = path.join(rawDir, "raw", `${args.name}-screenshots-compress.json`);
const THEME_RETAKES = 2;
const WEBP_MAX_SIDE = 16383;
const FULL_PAGE_WIDTH = 780;

const shotId = (route, viewport, theme, full) =>
  `${route.id}__${viewport.id}__${theme}${full ? "__full" : ""}`;

function plan() {
  const wantedRoutes = args.routes ? new Set(args.routes.split(",")) : null;
  const wantedViewports = args.viewports ? new Set(args.viewports.split(",")) : null;
  const items = [];
  for (const viewport of VIEWPORTS) {
    if (wantedViewports && !wantedViewports.has(viewport.id)) continue;
    for (const theme of THEMES) {
      for (const route of SCREENSHOT_ROUTES) {
        if (wantedRoutes && !wantedRoutes.has(route.id)) continue;
        items.push({ route, viewport, theme, alsoFull: viewport.id === "390x844" });
      }
    }
  }
  return items;
}

// Runs inside the page. Everything it returns is plain data.
function measureInPage() {
  const root = document.documentElement;
  const body = document.body;
  const bodyStyle = getComputedStyle(body);
  const width = window.innerWidth;
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className.trim() !== ""
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const wide = [];
  for (const el of document.querySelectorAll("body *")) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && (rect.right > width + 0.5 || rect.left < -0.5)) {
      wide.push({
        element: describe(el),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }
  }
  wide.sort((a, b) => b.right - a.right);
  return {
    title: document.title,
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    innerWidth: width,
    scrollHeight: root.scrollHeight,
    bodyBackgroundColor: bodyStyle.backgroundColor,
    bodyColor: bodyStyle.color,
    htmlDataTheme: root.getAttribute("data-theme"),
    prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
    prefersReducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    elementsPastViewport: wide.length,
    widest: wide.slice(0, 5),
  };
}

async function shootOnce(browser, baseUrl, item, files) {
  const { route, viewport, theme } = item;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    colorScheme: theme,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    const errorResponses = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ text: msg.text().slice(0, 300), url: msg.location().url || null });
      }
    });
    page.on("pageerror", (error) =>
      consoleErrors.push({ text: `pageerror: ${error.message.slice(0, 300)}`, url: null }),
    );
    page.on("requestfailed", (request) =>
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null }),
    );
    page.on("response", (response) => {
      if (response.status() >= 400 && response.request().resourceType() !== "document") {
        errorResponses.push({ url: response.url(), status: response.status() });
      }
    });
    const response = await page.goto(`${baseUrl}${routePath(route, fixtures)}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await sleep(Number(args["settle-ms"]));
    const measured = await page.evaluate(measureInPage);
    await page.screenshot({ path: files.viewport, type: "png" });
    if (item.alsoFull) await page.screenshot({ path: files.full, type: "png", fullPage: true });
    return {
      documentStatus: response?.status() ?? null,
      ...measured,
      viewportWidth: viewport.width,
      overflowPx: Math.max(0, measured.scrollWidth - viewport.width),
      consoleErrors,
      failedRequests,
      errorResponses,
    };
  } finally {
    await context.close();
  }
}

async function shoot() {
  if (!Object.hasOwn(TARGETS, args.label ?? "")) {
    console.error(USAGE);
    process.exit(2);
  }
  const label = args.label;
  const baseUrl = args["base-url"] ?? TARGETS[label].baseUrl;
  const dir = shotsDir(label);
  mkdirSync(dir, { recursive: true });
  const done = new Set(readJsonl(rawFile(label)).map((r) => r.id));
  const pending = plan().filter(
    (item) => !done.has(shotId(item.route, item.viewport, item.theme, false)),
  );
  // --limit takes the next N page loads and leaves the rest for a later call (the tool is resumable).
  const todo = args.limit === undefined ? pending : pending.slice(0, Number(args.limit));
  console.log(`${label}: ${todo.length} of ${pending.length} pending page loads to do`);
  if (todo.length === 0) return;
  await whenQuiet(rawDir, `screenshots ${label}`, { requireQuiet: false }, async (gate) => {
    const browser = await chromium.launch();
    const version = browser.version();
    try {
      for (const item of todo) {
        const id = shotId(item.route, item.viewport, item.theme, false);
        const files = {
          viewport: path.join(dir, `${id}.png`),
          full: path.join(dir, `${shotId(item.route, item.viewport, item.theme, true)}.png`),
        };
        let result;
        let retakes = 0;
        for (;;) {
          result = await shootOnce(browser, baseUrl, item, files);
          if (label === "prod" && item.route.id === "leaderboard") {
            recordTouch(rawDir, "prod:api-page:/leaderboard");
          }
          const themeApplied = result.prefersDark === (item.theme === "dark");
          if (themeApplied || retakes >= THEME_RETAKES) break;
          retakes += 1;
          await sleep(Number(args["pause-ms"]));
        }
        const record = {
          id,
          label,
          route: item.route.id,
          path: routePath(item.route, fixtures),
          viewport: item.viewport.id,
          theme: item.theme,
          at: isoNow(),
          chromium: version,
          load1AtStart: gate.load1,
          retakes,
          themeApplied: result.prefersDark === (item.theme === "dark"),
          fullPageFile: item.alsoFull
            ? `${shotId(item.route, item.viewport, item.theme, true)}.png`
            : null,
          file: `${id}.png`,
          pngBytes: statSync(files.viewport).size,
          fullPagePngBytes: item.alsoFull ? statSync(files.full).size : null,
          ...result,
        };
        appendJsonl(rawFile(label), record);
        console.log(
          `${id}: overflow ${record.overflowPx}px, bg ${record.bodyBackgroundColor}, ${record.consoleErrors.length} console errors`,
        );
        await sleep(Number(args["pause-ms"]));
      }
    } finally {
      await browser.close();
    }
  });
}

// --- compress ---------------------------------------------------------------------------------

function priority(label) {
  const rows = readJsonl(rawFile(label));
  const entries = [];
  for (const r of rows) {
    entries.push({
      id: r.id,
      viewport: r.viewport,
      full: false,
      source: r.file,
      route: r.route,
      theme: r.theme,
    });
    if (r.fullPageFile) {
      entries.push({
        id: `${r.id}__full`,
        viewport: r.viewport,
        full: true,
        source: r.fullPageFile,
        route: r.route,
        theme: r.theme,
      });
    }
  }
  // Tier 0: viewport-sized 390x844 and 1440x900. Tier 1: the full-page 390x844 shots. Tier 2:
  // 360x640. Tier 3: everything else. So the budget runs out in the least important tier first.
  const rank = (e) => {
    if (!e.full && (e.viewport === "390x844" || e.viewport === "1440x900")) return 0;
    if (e.full) return 1;
    return e.viewport === "360x640" ? 2 : 3;
  };
  const order = (e) => VIEWPORTS.findIndex((v) => v.id === e.viewport);
  const routeOrder = (e) => SCREENSHOT_ROUTES.findIndex((r) => r.id === e.route);
  return entries.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      order(a) - order(b) ||
      THEMES.indexOf(a.theme) - THEMES.indexOf(b.theme) ||
      routeOrder(a) - routeOrder(b),
  );
}

async function compress() {
  const label = args.label ?? "local";
  const budget = Number(args["max-bytes"]);
  const quality = Number(args.quality);
  const commitDir = path.resolve(args["commit-dir"]);
  mkdirSync(commitDir, { recursive: true });
  const kept = [];
  const omitted = [];
  let used = 0;
  let full = false;
  for (const entry of priority(label)) {
    const name = `${label}__${entry.id}.webp`;
    if (full) {
      omitted.push({
        id: entry.id,
        viewport: entry.viewport,
        reason: "after the budget was reached",
      });
      continue;
    }
    // Full-page shots are the tall ones. They are kept at 2x (780 px wide) so that all of them fit
    // the budget. WebP also cannot hold more than 16383 pixels on a side, so a taller page is
    // scaled down to fit.
    const image = sharp(path.join(shotsDir(label), entry.source));
    const { width, height } = await image.metadata();
    // sharp keeps only the last resize call, so the target size is worked out once.
    let scale = entry.full ? Math.min(1, FULL_PAGE_WIDTH / width) : 1;
    if (height * scale > WEBP_MAX_SIDE) scale = WEBP_MAX_SIDE / height;
    const resized =
      scale === 1
        ? image
        : image.resize({
            width: Math.floor(width * scale),
            height: Math.floor(height * scale),
            fit: "fill",
          });
    const buffer = await resized.webp({ quality }).toBuffer();
    const written = await sharp(buffer).metadata();
    if (
      buffer.subarray(0, 4).toString("latin1") !== "RIFF" ||
      buffer.subarray(8, 12).toString("latin1") !== "WEBP"
    ) {
      throw new Error(`${name} is not a WebP file`);
    }
    if (used + buffer.length > budget) {
      full = true;
      omitted.push({
        id: entry.id,
        viewport: entry.viewport,
        webpBytes: buffer.length,
        reason: "would exceed the budget",
      });
      continue;
    }
    writeFileSync(path.join(commitDir, name), buffer);
    used += buffer.length;
    kept.push({
      id: entry.id,
      viewport: entry.viewport,
      file: name,
      webpBytes: buffer.length,
      pixels: `${written.width}x${written.height}`,
    });
  }
  writeJson(compressFile, {
    label,
    quality,
    budgetBytes: budget,
    usedBytes: used,
    dir: path.relative(REPO_ROOT, commitDir),
    order:
      "viewport-sized 390x844 and 1440x900 shots, then the full-page 390x844 shots, then 360x640, then 430x932 and 844x390; the kept set is a prefix of this order",
    fullPageScale: `full-page shots are scaled to ${FULL_PAGE_WIDTH} px wide (2x); viewport shots keep their size (390x844 and 360x640 at 3x, 1440x900 at 1x)`,
    kept,
    omitted,
  });
  console.log(`kept ${kept.length} files (${used} bytes), omitted ${omitted.length}`);
}

// --- summarize --------------------------------------------------------------------------------

function summarizeTarget(label) {
  const rows = readJsonl(rawFile(label));
  if (rows.length === 0) return null;
  const byKey = new Map(rows.map((r) => [`${r.route}|${r.viewport}|${r.theme}`, r]));
  const pairs = [];
  for (const route of SCREENSHOT_ROUTES) {
    for (const viewport of VIEWPORTS) {
      const light = byKey.get(`${route.id}|${viewport.id}|light`);
      const dark = byKey.get(`${route.id}|${viewport.id}|dark`);
      if (!light || !dark) continue;
      pairs.push({
        route: route.id,
        viewport: viewport.id,
        lightBackground: light.bodyBackgroundColor,
        darkBackground: dark.bodyBackgroundColor,
        backgroundChanged: light.bodyBackgroundColor !== dark.bodyBackgroundColor,
        textColourChanged: light.bodyColor !== dark.bodyColor,
        lightPrefersDark: light.prefersDark,
        darkPrefersDark: dark.prefersDark,
      });
    }
  }
  const strip = (r) => ({
    id: r.id,
    route: r.route,
    viewport: r.viewport,
    theme: r.theme,
    documentStatus: r.documentStatus,
    scrollWidth: r.scrollWidth,
    viewportWidth: r.viewportWidth,
    overflowPx: r.overflowPx,
    widest: r.overflowPx > 0 ? r.widest : [],
    bodyBackgroundColor: r.bodyBackgroundColor,
    bodyColor: r.bodyColor,
    htmlDataTheme: r.htmlDataTheme,
    prefersDark: r.prefersDark,
    themeApplied: r.themeApplied,
    retakes: r.retakes,
    consoleErrors: r.consoleErrors,
    failedRequests: r.failedRequests.length,
    errorResponses: r.errorResponses,
    pngBytes: r.pngBytes,
    fullPagePngBytes: r.fullPagePngBytes,
    scrollHeight: r.scrollHeight,
  });
  return {
    baseUrl: TARGETS[label].baseUrl,
    chromium: rows[0].chromium,
    pageLoads: rows.length,
    viewportShots: rows.length,
    fullPageShots: rows.filter((r) => r.fullPageFile).length,
    shotsWithOverflow: rows.filter((r) => r.overflowPx > 0).map((r) => strip(r)),
    shotsWithConsoleErrors: rows
      .filter((r) => r.consoleErrors.length > 0)
      .map((r) => ({ id: r.id, consoleErrors: r.consoleErrors })),
    shotsWithErrorResponses: rows
      .filter((r) => r.errorResponses.length > 0)
      .map((r) => ({ id: r.id, errorResponses: r.errorResponses })),
    themeCheck: {
      shotsWherePrefersColorSchemeMatchedTheme: rows.filter((r) => r.themeApplied).length,
      shotsWhereItDidNot: rows.filter((r) => !r.themeApplied).map((r) => r.id),
      retakes: rows.reduce((t, r) => t + r.retakes, 0),
      pairsChecked: pairs.length,
      pairsWithSameBodyBackground: pairs.filter((p) => !p.backgroundChanged),
      pairs,
    },
    shots: rows.map((r) => ({
      ...strip(r),
      label: routeLabel(SCREENSHOT_ROUTES.find((x) => x.id === r.route)),
    })),
  };
}

function summarizeAll() {
  const file = summaryFile(args.out, args.name, "screenshots");
  let compressed = null;
  try {
    compressed = readJson(compressFile);
  } catch {
    compressed = null;
  }
  const targets = {};
  for (const label of Object.keys(TARGETS)) {
    const summary = summarizeTarget(label);
    if (summary) targets[label] = summary;
  }
  writeJson(file, {
    meta: {
      name: args.name,
      builtAt: isoNow(),
      tool: "Playwright Chromium, fresh context per page load",
      reducedMotion: "reduce",
      colourScheme: "set with the colorScheme context option; verified in the page with matchMedia",
      viewports: VIEWPORTS,
      themes: THEMES,
      routes: SCREENSHOT_ROUTES.map((r) => ({ id: r.id, path: routeLabel(r) })),
      overflowMeasure:
        "document.documentElement.scrollWidth minus the viewport width, 0 when there is none",
      committed: compressed,
    },
    targets,
  });
  console.log(`wrote ${file}`);
}

const modes = { shoot, compress, summarize: summarizeAll };
if (!Object.hasOwn(modes, args.mode ?? "")) {
  console.error(USAGE);
  process.exit(2);
}
await modes[args.mode]();
