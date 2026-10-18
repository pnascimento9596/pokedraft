// Records a 4 s Chrome trace of the live broadcast under a 4x CPU throttle and sums the main
// thread's rendering work by event: how many times it ran, its milliseconds, and for style
// recalcs the elements restyled. It explains where broadcast-frames.mts's task time goes.
//
//   pnpm exec tsx scripts/perf/broadcast-trace.mts before=http://localhost:3522 after=http://localhost:3521
//
// Pass several name=url targets, repeated to alternate them. Headless Chromium rasterises in
// software; these numbers do not include GPU raster.
import { chromium } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../../src/engine/versions/__tests__/fixtures";

const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const EVENTS = ["FunctionCall", "UpdateLayoutTree", "Layout", "PrePaint", "Paint", "Layerize"];

interface TraceEvent {
  readonly name: string;
  readonly ph: string;
  readonly dur?: number;
  readonly args?: { readonly elementCount?: number };
}

const browser = await chromium.launch();
try {
  for (const target of process.argv.slice(2)) {
    const eq = target.indexOf("=");
    const name = target.slice(0, eq);
    const url = target.slice(eq + 1);
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
    await page.getByTestId("match-replay").getByTestId("broadcast").waitFor();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.waitForTimeout(1_000);
    const events: TraceEvent[] = [];
    cdp.on("Tracing.dataCollected", (e) => events.push(...(e.value as unknown as TraceEvent[])));
    const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.start", {
      categories: "devtools.timeline,disabled-by-default-devtools.timeline",
      transferMode: "ReportEvents",
    });
    await page.waitForTimeout(4_000);
    await cdp.send("Tracing.end");
    await complete;
    await context.close();

    const sums = Object.fromEntries(EVENTS.map((e) => [e, { n: 0, ms: 0, elements: 0 }]));
    for (const e of events) {
      const sum = sums[e.name];
      if (sum === undefined || e.ph !== "X") continue;
      sum.n++;
      sum.ms += (e.dur ?? 0) / 1_000;
      sum.elements += e.args?.elementCount ?? 0;
    }
    for (const sum of Object.values(sums)) sum.ms = Math.round(sum.ms);
    console.log(`${name} ${JSON.stringify(sums)}`);
  }
} finally {
  await browser.close();
}
