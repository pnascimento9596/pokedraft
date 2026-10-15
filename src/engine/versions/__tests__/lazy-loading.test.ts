import { beforeEach, describe, expect, it, vi } from "vitest";

const loaded: string[] = [];
const bundle = (version: number) => ({
  RUN_TOKEN_VERSION: version,
  ENGINE_VERSION: `pokedraft-engine-${version}`,
  BUNDLE_MARKER: `retained-engine-bundle:v${version}`,
  replay: () => ({ draft: {}, cup: { version } }),
});

beforeEach(() => {
  vi.resetModules();
  loaded.length = 0;
  vi.doMock("../v1", () => {
    loaded.push("v1");
    return bundle(1);
  });
  vi.doMock("../v2", () => {
    loaded.push("v2");
    return bundle(2);
  });
  vi.doMock("../v3", () => {
    loaded.push("v3");
    return bundle(3);
  });
  vi.doMock("../v1/src/engine/opponents", () => {
    loaded.push("ladder1");
    return { buildLadder: vi.fn() };
  });
  vi.doMock("../v2/src/engine/opponents", () => {
    loaded.push("ladder2");
    return { buildLadder: vi.fn() };
  });
  vi.doMock("../v3/src/engine/opponents", () => {
    loaded.push("ladder3");
    return { buildLadder: vi.fn() };
  });
  vi.doMock("../legacy", () => ({ fromLegacy: (cup: unknown) => cup }));
  vi.doMock("../../replay", () => ({ replay: () => ({ draft: {}, cup: {} }) }));
});

describe("retained replay loads only the requested engine", () => {
  it("loads no retained bundle for registry queries, invalid links, or a live replay", async () => {
    const dispatcher = await import("..");
    expect(dispatcher.retainedTokenVersions()).toEqual([1, 2, 3]);
    expect(loaded).toEqual([]);
    await expect(
      Promise.resolve().then(() => dispatcher.replayAnyVersion("pd99.invalid")),
    ).rejects.toMatchObject({ code: "unknownVersion" });
    await expect(
      Promise.resolve().then(() => dispatcher.replayAnyVersion("garbage")),
    ).rejects.toMatchObject({ code: "malformed" });
    const { RUN_TOKEN_VERSION } = await import("../../types");
    await dispatcher.replayAnyVersion(`pd${RUN_TOKEN_VERSION}.live`);
    expect(loaded).toEqual([]);
  });

  it.each([1, 2, 3])("initializes only v%i and its matching ladder", async (version) => {
    const dispatcher = await import("..");
    const run = await dispatcher.replayAnyVersion(`pd${version}.retained`);
    expect(run.engine).toBe(`pokedraft-engine-${version}`);
    expect(loaded.sort()).toEqual([`ladder${version}`, `v${version}`]);
  });
});
