import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function headersFor(source: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((r) => r.source === source);
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));
}

describe("security headers (catches a site that can be framed, sniffed or loaded with any script)", () => {
  it("sends nosniff, a referrer policy, a permissions policy, frame denial and a report-only CSP on every path", async () => {
    expect(await headersFor("/:path*")).toEqual({
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy-Report-Only":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/csp-report",
    });
  });

  it("does not enforce a CSP yet", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const keys = rules.flatMap((r) => r.headers.map((h) => h.key.toLowerCase()));
    expect(keys).not.toContain("content-security-policy");
  });
});
