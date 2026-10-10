import { expect, test, type APIRequestContext } from "@playwright/test";

// React splits text around inserted values with comment markers; drop them to read what a user sees.
async function text(request: APIRequestContext, url: string): Promise<string> {
  return (await (await request.get(url)).text()).replaceAll("<!-- -->", "");
}

// The largest text on these pages used to appear only after the JavaScript had loaded and
// hydrated (the server sent a "Loading" line), which put Lighthouse's mobile LCP at 3.7 to 3.9 s.
// The first response must already carry the content.
test.describe("first response carries the main content", () => {
  test("/play start panel", async ({ request }) => {
    const html = await text(request, "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151");
    expect(html).toContain("16 rounds. Each round the wheel rolls");
    expect(html).toContain("151 Challenge");
  });

  test("/leaderboard caption", async ({ request }) => {
    const html = await text(request, "/leaderboard");
    expect(html).toMatch(/Daily 8-0 Challenge for [A-Z][a-z]+day, [A-Z][a-z]+ \d+, \d{4}/);
  });
});
