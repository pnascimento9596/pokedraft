import type { Page } from "@playwright/test";

/** The client chunks a build serves, which the switch below rewrites. */
export const CLIENT_CHUNKS = "**/_next/static/chunks/**";

/**
 * The test-only engine 7 switch. Engine 7 rules ship dormant: the UI reads the live coefficients
 * at module scope, with no flag, query or storage key. This rewrites each minified engine 6
 * literal to its engine 7 value in the client chunks the browser downloads; the built chunks are
 * untouched. Returns how many literals it rewrote, so a spec can assert the switch ran.
 */
export async function switchToV7(
  page: Page,
  literals: readonly (readonly [live: string, v7: string])[],
): Promise<() => number> {
  let rewritten = 0;
  await page.route(CLIENT_CHUNKS, async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    for (const [live, v7] of literals) {
      rewritten += body.split(live).length - 1;
      body = body.replaceAll(live, v7);
    }
    await route.fulfill({ response: res, body });
  });
  return () => rewritten;
}
