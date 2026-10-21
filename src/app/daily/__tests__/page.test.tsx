import { describe, expect, it } from "vitest";
import { prerender } from "react-dom/static";
import DailyPage from "../page";

// Server rendering must deliver the challenge panel, not the loading placeholder line,
// so the loading line is not the first contentful paint.
describe("Daily page server render (catches /daily serving a loading line on first paint)", () => {
  it("server-renders the daily challenge setup instead of the loading line", async () => {
    const { prelude } = await prerender(<DailyPage />);
    const html = await new Response(prelude).text();
    expect(html).not.toContain("Loading the daily challenge");
    expect(html).toContain("Daily challenge");
    expect(html).toContain("Today&#x27;s draft");
    expect(html).toContain("Formation");
    expect(html).toContain("Start run");
  });
});
