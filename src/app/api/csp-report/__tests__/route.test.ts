import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

afterEach(() => vi.restoreAllMocks());

function report(body: string, type: string): Request {
  return new Request("http://local/api/csp-report", {
    method: "POST",
    headers: { "content-type": type },
    body,
  });
}

function lines(spy: { mock: { calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.map((a) => JSON.parse(String(a[0])));
}

describe("CSP report sink (catches a report-only policy whose violations nobody can read)", () => {
  it("logs a Reporting API batch as one summary line per violation, without query strings", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const batch = [
      {
        type: "csp-violation",
        url: "https://pokedraft.test/r/pd3.abc?nick=Ash",
        body: {
          documentURL: "https://pokedraft.test/r/pd3.abc?nick=Ash",
          effectiveDirective: "script-src-elem",
          blockedURL: "https://evil.test/x.js?k=secret",
          disposition: "report",
        },
      },
      { type: "deprecation", body: { id: "x" } },
    ];
    const res = await POST(report(JSON.stringify(batch), "application/reports+json"));
    expect(res.status).toBe(204);
    expect(lines(spy)).toEqual([
      {
        level: "warn",
        where: "csp-report",
        directive: "script-src-elem",
        blocked: "https://evil.test",
        page: "/r/pd3.abc",
        disposition: "report",
      },
    ]);
  });

  it("logs WebKit's single report object sent to report-uri", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const single = {
      type: "csp-violation",
      url: "http://localhost:3491/how-to-play?probe=webkit",
      body: {
        documentURL: "http://localhost:3491/how-to-play?probe=webkit",
        disposition: "report",
        effectiveDirective: "img-src",
        blockedURL: "https://example.com:443/csp-probe.png",
      },
    };
    const res = await POST(report(JSON.stringify(single), "application/csp-report"));
    expect(res.status).toBe(204);
    expect(lines(spy)).toEqual([
      {
        level: "warn",
        where: "csp-report",
        directive: "img-src",
        blocked: "https://example.com",
        page: "/how-to-play",
        disposition: "report",
      },
    ]);
  });

  it("logs WebKit's hybrid report-uri body ({ type, csp-report })", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hybrid = {
      type: "csp-violation",
      url: "http://localhost:3491/how-to-play?probe=webkit",
      "csp-report": {
        "document-uri": "http://localhost:3491/how-to-play?probe=webkit",
        "violated-directive": "img-src",
        "effective-directive": "img-src",
        "blocked-uri": "https://example.com/csp-probe.png",
        disposition: "report",
      },
    };
    await POST(report(JSON.stringify(hybrid), "application/csp-report"));
    expect(lines(spy)).toEqual([
      {
        level: "warn",
        where: "csp-report",
        directive: "img-src",
        blocked: "https://example.com",
        page: "/how-to-play",
        disposition: "report",
      },
    ]);
  });

  it("logs a legacy report-uri body the same way", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const legacy = {
      "csp-report": {
        "document-uri": "https://pokedraft.test/play?seed=1",
        "violated-directive": "script-src",
        "blocked-uri": "eval",
        disposition: "report",
      },
    };
    const res = await POST(report(JSON.stringify(legacy), "application/csp-report"));
    expect(res.status).toBe(204);
    expect(lines(spy)).toEqual([
      {
        level: "warn",
        where: "csp-report",
        directive: "script-src",
        blocked: "eval",
        page: "/play",
        disposition: "report",
      },
    ]);
  });

  it("answers 204 and logs nothing for junk, an oversized body or more than 5 reports", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await POST(report("{nope", "application/json"))).status).toBe(204);
    expect((await POST(report("x".repeat(9000), "application/reports+json"))).status).toBe(204);
    const many = Array.from({ length: 8 }, () => ({
      type: "csp-violation",
      body: { documentURL: "https://p.test/", effectiveDirective: "img-src", blockedURL: "data" },
    }));
    await POST(report(JSON.stringify(many), "application/reports+json"));
    expect(spy.mock.calls).toHaveLength(5);
  });
});
