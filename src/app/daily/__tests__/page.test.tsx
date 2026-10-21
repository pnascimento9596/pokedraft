import { describe, expect, it, vi } from "vitest";
import { prerender } from "react-dom/static";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/daily",
  useSearchParams: () => new URLSearchParams(),
}));

import DailyPage from "../page";

// Server rendering must deliver the challenge panel, not the loading placeholder line,
// so the loading line is not the first contentful paint.
describe("Daily page server render (catches /daily serving a loading line on first paint)", () => {
  it("server-renders the daily challenge setup instead of the loading line", async () => {
    const { prelude } = await prerender(<DailyPage />);
    const html = await new Response(prelude).text();
    expect(html).not.toContain("Loading the daily challenge");
    expect(html).toContain("Daily challenge");
    expect(html).toContain("Daily 8-0 Challenge");
    expect(html).toContain("Formation");
    expect(html).toContain("Start run");
    expect(html).toContain("Road to the Final");
  });
});
