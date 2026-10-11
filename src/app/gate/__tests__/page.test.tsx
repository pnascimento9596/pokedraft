import { describe, expect, it } from "vitest";
import { prerender } from "react-dom/static";
import GatePage from "../page";

// GateForm is an async server component, so the page is rendered the way the server renders it.
async function renderGate(error?: string): Promise<string> {
  const searchParams = Promise.resolve(
    error === undefined ? { next: "/daily" } : { next: "/daily", error },
  );
  const { prelude } = await prerender(
    <GatePage params={Promise.resolve({})} searchParams={searchParams} />,
  );
  return new Response(prelude).text();
}

function alerts(html: string): string[] {
  return [...html.matchAll(/<p role="alert"[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]!);
}

describe("gate page error copy (catches a silent or unannounced unlock failure)", () => {
  it.each([
    ["1", "That passcode did not work."],
    ["limited", "Too many attempts from this network. Wait 15 minutes and try again."],
    ["unavailable", "The gate is unavailable right now. Try again in a few minutes."],
    ["something-else", "That passcode did not work."],
  ])("error=%s announces its copy in an alert", async (error, copy) => {
    expect(alerts(await renderGate(error))).toEqual([copy]);
  });

  it("shows no alert without an error and posts to /gate/unlock with the next path", async () => {
    const html = await renderGate();
    expect(alerts(html)).toEqual([]);
    expect(html).toContain('<form class="form" action="/gate/unlock" method="post">');
    expect(html).toContain('<input type="hidden" name="next" value="/daily"/>');
  });
});
