import { describe, expect, it, vi } from "vitest";
import { onRequestError } from "../instrumentation";

describe("onRequestError (catches an uncaught server error logged with its message or query)", () => {
  it("logs one JSON line with the request id, route and digest, without the message or query", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new RangeError("seed pd3.secret-token for Ash"), {
      digest: "123456",
    });
    await onRequestError(
      err,
      {
        path: "/r/pd3.secret-token?nick=Ash",
        method: "GET",
        headers: { "x-vercel-id": "iad1::abc-1" },
      },
      {
        routerKind: "App Router",
        routePath: "/r/[token]",
        routeType: "render",
        renderSource: "server-rendering",
        revalidateReason: undefined,
      },
    );
    expect(spy.mock.calls.map((a) => JSON.parse(String(a[0])))).toEqual([
      {
        level: "error",
        where: "onRequestError",
        requestId: "iad1::abc-1",
        method: "GET",
        path: "/r/pd3.secret-token",
        routePath: "/r/[token]",
        routeType: "render",
        name: "RangeError",
        digest: "123456",
      },
    ]);
    expect(String(spy.mock.calls[0]![0])).not.toContain("Ash");
    spy.mockRestore();
  });
});
