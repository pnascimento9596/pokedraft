// Times matchStory, which the live broadcast calls once per match at kickoff, in headless Chromium
// under a 4x CPU throttle: every played match of the golden cup8 and kanto151 runs, several rounds.
//
//   pnpm exec tsx scripts/perf/story-timing.mts --runs 5
//
// The code is bundled with the esbuild that tsx already ships, so the page runs the same modules the
// app does, unminified. Round 1 is cold (a fresh page, no JIT); the app's first call is warmer,
// because the results or the matchday have already run the cup.
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "@playwright/test";

const THROTTLE = 4;
const ROOT = path.resolve(import.meta.dirname, "../..");
const runsArg = process.argv.indexOf("--runs");
const RUNS = runsArg === -1 ? 5 : Number(process.argv[runsArg + 1]);

const require = createRequire(import.meta.url);
// esbuild is tsx's own dependency, not the repo's, so it carries no types here.
interface Esbuild {
  build(options: Record<string, unknown>): Promise<{ outputFiles: { text: string }[] }>;
}
const esbuild = createRequire(require.resolve("tsx"))("esbuild") as Esbuild;

const entry = `
import { decodeToken, replay } from "@/engine";
import { toFullLineup } from "@/engine/draft";
import { matchStory } from "@/engine/story";
import { GOLDEN_CUP8_V5, GOLDEN_KANTO151_V5 } from "@/engine/versions/__tests__/fixtures";

window.timeStories = () => {
  const out = [];
  for (const [name, v5] of [["cup8", GOLDEN_CUP8_V5], ["kanto151", GOLDEN_KANTO151_V5]]) {
    const token = "pd6." + v5.slice("pd5.".length);
    const { draft, cup } = replay(token);
    const run = { lineup: toFullLineup(draft), mode: cup.mode, manager: decodeToken(token).manager ?? [] };
    cup.matches.forEach((m, i) => {
      if (m.status !== "played") return;
      const t0 = performance.now();
      const story = matchStory(cup.seed, i, run);
      const ms = performance.now() - t0;
      const same = JSON.stringify(story.result) === JSON.stringify(m);
      out.push({ run: name, match: i, ms, windows: story.windows.length, same });
    });
  }
  return out;
};
`;

const bundle = await esbuild.build({
  stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  tsconfig: path.join(ROOT, "tsconfig.json"),
  logLevel: "error",
});
const code = bundle.outputFiles[0]!.text;

interface Timing {
  readonly run: string;
  readonly match: number;
  readonly ms: number;
  readonly windows: number;
  readonly same: boolean;
}

const browser = await chromium.launch({ args: ["--mute-audio"] });
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await page.setContent("<!doctype html><title>story timing</title>");
  await page.addScriptTag({ content: code });
  for (let round = 1; round <= RUNS; round++) {
    const timings = (await page.evaluate("window.timeStories()")) as Timing[];
    for (const name of ["cup8", "kanto151"]) {
      const mine = timings.filter((t) => t.run === name);
      const total = mine.reduce((sum, t) => sum + t.ms, 0);
      const worst = Math.max(...mine.map((t) => t.ms));
      const windows = mine.reduce((sum, t) => sum + t.windows, 0);
      const wrong = mine.filter((t) => !t.same).length;
      console.log(
        `round ${round} ${name}: ${mine.length} played matches, ${total.toFixed(1)} ms in all, ` +
          `${(total / mine.length).toFixed(1)} ms per match, slowest ${worst.toFixed(1)} ms, ` +
          `${windows} windows, ${wrong} results unlike the cup's`,
      );
    }
  }
} finally {
  await browser.close();
}
