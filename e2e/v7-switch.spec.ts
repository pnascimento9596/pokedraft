import { expect, test } from "@playwright/test";
import { CLIENT_CHUNKS } from "./v7-switch";

// Next serves client chunks from /_next/static/chunks/ under `next start`, and Vercel serves them
// from /_next/static/immutable/chunks/. The engine 7 switch must reach both, or a spec run against
// production silently tests engine 6.
test("the engine 7 switch's route matches client chunks under both chunk paths (catches a rewrite that never runs on Vercel)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "a routing check needs one browser");
  const hits: string[] = [];
  await page.route(CLIENT_CHUNKS, (route) => {
    hits.push(new URL(route.request().url()).pathname);
    return route.fulfill({ body: "chunk", contentType: "text/plain" });
  });
  for (const path of ["/_next/static/chunks/probe.js", "/_next/static/immutable/chunks/probe.js"]) {
    await page.goto(path);
  }
  expect(hits).toEqual([
    "/_next/static/chunks/probe.js",
    "/_next/static/immutable/chunks/probe.js",
  ]);
});
