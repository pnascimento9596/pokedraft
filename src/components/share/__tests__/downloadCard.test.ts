// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCard } from "../download";

const NO_LOOK = { pack: null, mirror: true };
let shared: File[][] = [];
let clicked: string[] = [];

function phone(share: (data: ShareData) => Promise<void>) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(pointer: coarse)", media: q }));
  Object.assign(navigator, {
    canShare: (data: ShareData) => (data.files ?? []).length > 0,
    share: async (data: ShareData) => {
      shared.push([...(data.files ?? [])]);
      return share(data);
    },
  });
}

beforeEach(() => {
  shared = [];
  clicked = [];
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "image/png" }),
    blob: async () => new Blob(["png"], { type: "image/png" }),
  }));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:card");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
});

describe("downloadCard on a phone that can share files (SA-20)", () => {
  it("hands the PNG to the share sheet as a file, so iOS can save it to Photos", async () => {
    phone(async () => {});
    expect(await downloadCard({ t: "pd3.abc" }, "pokedraft-run.png", NO_LOOK)).toBe("shared");
    expect(shared.map((files) => files.map((f) => [f.name, f.type]))).toEqual([
      [["pokedraft-run.png", "image/png"]],
    ]);
    expect(clicked).toEqual([]);
  });

  it("treats closing the share sheet as a cancel, not a failure", async () => {
    phone(async () => {
      throw new DOMException("closed", "AbortError");
    });
    expect(await downloadCard({ t: "pd3.abc" }, "pokedraft-run.png", NO_LOOK)).toBe("cancelled");
    expect(clicked).toEqual([]);
  });

  it("falls back to the download link when the share sheet is refused (the tap's activation ran out during a slow render)", async () => {
    phone(async () => {
      throw new DOMException("no activation", "NotAllowedError");
    });
    expect(await downloadCard({ t: "pd3.abc" }, "pokedraft-run.png", NO_LOOK)).toBe("saved");
    expect(clicked).toEqual(["pokedraft-run.png"]);
  });
});

describe("downloadCard on a desktop", () => {
  it("downloads through the link even where file sharing exists (desktop Chrome and Safari), so Download stays a download", async () => {
    phone(async () => {});
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    expect(await downloadCard({ t: "pd3.abc" }, "pokedraft-run.png", NO_LOOK)).toBe("saved");
    expect(shared).toEqual([]);
    expect(clicked).toEqual(["pokedraft-run.png"]);
  });
});
