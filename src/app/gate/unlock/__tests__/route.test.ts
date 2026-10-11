import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db/client", () => ({
  getDb: () => {
    throw new Error("no database in this test");
  },
}));

afterEach(() => vi.unstubAllEnvs());

function post(passcode: string): NextRequest {
  const form = new FormData();
  form.set("passcode", passcode);
  form.set("next", "/daily");
  return new NextRequest("https://pokedraft.test/gate/unlock", { method: "POST", body: form });
}

describe("POST /gate/unlock wiring (catches the route reading the wrong env or skipping the limiter)", () => {
  it("fails closed with error=unavailable when IP_HASH_SECRET is too short", async () => {
    vi.stubEnv("FRIENDS_PASSCODE", "correct horse");
    vi.stubEnv("IP_HASH_SECRET", "short");
    const { POST } = await import("../route");
    const res = await POST(post("correct horse"));
    expect([res.status, res.headers.get("location"), res.headers.get("set-cookie")]).toEqual([
      303,
      "https://pokedraft.test/gate?next=%2Fdaily&error=unavailable",
      null,
    ]);
  });

  it("fails closed when the database behind the limiter is unreachable", async () => {
    vi.stubEnv("FRIENDS_PASSCODE", "correct horse");
    vi.stubEnv("IP_HASH_SECRET", "test-secret-0123456789abcdef01234567");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("../route");
    const res = await POST(post("correct horse"));
    expect(res.headers.get("location")).toBe(
      "https://pokedraft.test/gate?next=%2Fdaily&error=unavailable",
    );
  });

  it("lets anyone through to next when FRIENDS_PASSCODE is unset", async () => {
    vi.stubEnv("FRIENDS_PASSCODE", "");
    const { POST } = await import("../route");
    const res = await POST(post("anything"));
    expect([res.status, res.headers.get("location")]).toEqual([
      303,
      "https://pokedraft.test/daily",
    ]);
  });
});
