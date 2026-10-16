import { describe, expect, it } from "vitest";
import { checkServerSha, localServerPort } from "../../e2e/local-server";

const HEAD = "860f47c409ee3ef16e9b6b02e1d6839d6216b810";
const OTHER = "648cf2f4fbc40a44a3488c2702b7f6a3a9d48de6";

describe("local Playwright server", () => {
  it("gives each checkout path its own fixed port instead of a shared 3400 (catches every worktree reusing one server)", () => {
    expect(localServerPort("/work/a")).toBe(3914);
    expect(localServerPort("/work/b")).toBe(3949);
    expect(localServerPort("/work/a")).toBe(3914);
  });

  it("refuses a server whose health sha is another commit (catches a run that tests another branch's build)", () => {
    const check = checkServerSha("http://localhost:3914", HEAD, OTHER);
    expect(check.kind).toBe("mismatch");
    expect(check.kind === "mismatch" && check.message).toContain(
      `reports sha ${OTHER}, but this checkout is at ${HEAD}`,
    );
  });

  it("accepts the same commit and only warns when either sha is unknown", () => {
    expect(checkServerSha("http://localhost:3914", HEAD, HEAD)).toEqual({ kind: "match" });
    expect(checkServerSha("http://localhost:3914", HEAD, null).kind).toBe("unknown");
    expect(checkServerSha("http://localhost:3914", null, OTHER).kind).toBe("unknown");
  });
});
