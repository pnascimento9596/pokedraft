import { describe, expect, it } from "vitest";
import { prerender } from "react-dom/static";
import GatePage, { generateMetadata } from "../page";
import { A11Y_RUN_V1, GOLDEN_CUP8_V2 } from "@/engine/versions/__tests__/fixtures";

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

const CURRENT_RUN =
  "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwiMDE0OGVhNzFlMWFjNTFlMyIsW1sicCIsNzQ5LCJzMCJdLFsicCIsNjMsInMxIl0sWyJwIiw5NDQsInMyIl0sWyJwIiwyNywiczMiXSxbInAiLDgyMSwiczQiXSxbInAiLDY1NiwiczUiXSxbInAiLDIwMCwiczYiXSxbInAiLDUyNCwiczciXSxbInAiLDI2OSwiczgiXSxbInAiLDQzMywiczkiXSxbInAiLDU0MywiczEwIl0sWyJwIiw5NDgsImIwIl0sWyJwIiw1MjksImIxIl0sWyJwIiw4MzQsImIyIl0sWyJwIiwzOTMsImIzIl0sWyJwIiwyNSwiYjQiXV1d";

describe("gated share metadata (catches query links losing their title, description and card)", () => {
  it.each([
    [
      CURRENT_RUN,
      "pokedraft run: 1-1-1, Team Score 283",
      "Out in the group stage with 4-3-3. Draft your own XI on pokedraft.",
      "pokedraft run card: 1-1-1, Team Score 283",
    ],
    [
      A11Y_RUN_V1,
      "pokedraft run: 8-0-0, Team Score 845",
      "Champions with 4-3-3. Draft your own XI on pokedraft.",
      "pokedraft run card: 8-0-0, Team Score 845",
    ],
    [
      GOLDEN_CUP8_V2,
      "pokedraft run: 3-0-2, Team Score 593",
      "Out in the Round of 16 with 4-2-3-1. Draft your own XI on pokedraft.",
      "pokedraft run card: 3-0-2, Team Score 593",
    ],
  ])(
    "replays a query-format link through its own engine",
    async (token, title, description, alt) => {
      const [version, payload] = token.split(".");
      const meta = await generateMetadata({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ next: `/r/${version}?t=${payload}` }),
      });
      const image = { url: `/r/${token}/opengraph-image`, width: 1200, height: 630, alt };
      expect(meta).toEqual({
        title,
        description,
        openGraph: { title, description, images: [image] },
        twitter: { card: "summary_large_image", title, description, images: [image] },
      });
    },
  );

  it("keeps legacy dot links previewable", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ next: `/r/${A11Y_RUN_V1}` }),
    });
    expect(meta.title).toBe("pokedraft run: 8-0-0, Team Score 845");
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: "pokedraft run: 8-0-0, Team Score 845",
      description: "Champions with 4-3-3. Draft your own XI on pokedraft.",
      images: [
        {
          url: `/r/${A11Y_RUN_V1}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "pokedraft run card: 8-0-0, Team Score 845",
        },
      ],
    });
  });
});
