import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const roots: string[] = [];

function fixture(canonical: string) {
  const rootContext = mkdtempSync(path.join(tmpdir(), "retained-json-"));
  roots.push(rootContext);
  mkdirSync(path.join(rootContext, "src/data"), { recursive: true });
  writeFileSync(path.join(rootContext, "src/data/pokedex.json"), canonical);
  const dependencies: string[] = [];
  return {
    rootContext,
    resourcePath: path.join(rootContext, "src/engine/versions/v1/src/data/pokedex.json"),
    addDependency: (file: string) => dependencies.push(file),
    dependencies,
  };
}

function retainedFixture(live: string, retained: Record<string, string>, own: string) {
  const rootContext = mkdtempSync(path.join(tmpdir(), "retained-json-"));
  roots.push(rootContext);
  const dataDir = (version: string) =>
    path.join(rootContext, "src/engine/versions", version, "src/data");
  mkdirSync(path.join(rootContext, "src/data"), { recursive: true });
  writeFileSync(path.join(rootContext, "src/data/scouting.json"), live);
  for (const [version, text] of Object.entries({ ...retained, [own]: retained[own] ?? "null" })) {
    mkdirSync(dataDir(version), { recursive: true });
    writeFileSync(path.join(dataDir(version), "scouting.json"), text);
  }
  const dependencies: string[] = [];
  return {
    rootContext,
    resourcePath: path.join(dataDir(own), "scouting.json"),
    addDependency: (file: string) => dependencies.push(file),
    dependencies,
  };
}

function load(context: ReturnType<typeof fixture>, source: string): string {
  return require("./retained-json-loader.cjs").call(context, Buffer.from(source));
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true })));

describe("retained JSON build deduplication", () => {
  it("re-exports byte-identical data and tracks canonical changes for cache invalidation", () => {
    const context = fixture('[{"id":1}]');
    expect(load(context, '[{"id":1}]')).toBe(
      'export { default } from "../../../../../data/pokedex.json";\n',
    );
    expect(context.dependencies).toEqual([path.join(context.rootContext, "src/data/pokedex.json")]);
    writeFileSync(path.join(context.rootContext, "src/data/pokedex.json"), '[{"id":2}]');
    const afterLiveChange = load(context, '[{"id":1}]');
    expect(afterLiveChange).not.toContain("from ");
    expect(runInNewContext(afterLiveChange.replace("export default ", ""))).toEqual([{ id: 1 }]);
  });

  it("preserves distinct retained data when the live artifact changes", () => {
    const output = load(fixture('[{"id":2}]'), '[{"id":1}]');
    expect(runInNewContext(output.replace("export default ", ""))).toEqual([{ id: 1 }]);
    expect(output).not.toContain("from ");
  });

  it("requires identical bytes even when parsed JSON is equivalent", () => {
    const output = load(fixture('[{"id":1}]'), '[ {"id":1} ]');
    expect(output).not.toContain("from ");
    expect(runInNewContext(output.replace("export default ", ""))).toEqual([{ id: 1 }]);
  });

  it("re-exports the earliest byte-identical retained copy when the live artifact moved on", () => {
    const context = retainedFixture("[0]", { v1: "[1]", v2: "[2]", v3: "[2]" }, "v4");
    expect(load(context, "[2]")).toBe(
      'export { default } from "../../../v2/src/data/scouting.json";\n',
    );
    expect(context.dependencies).toEqual([
      path.join(context.rootContext, "src/data/scouting.json"),
      path.join(context.rootContext, "src/engine/versions/v1/src/data/scouting.json"),
      path.join(context.rootContext, "src/engine/versions/v2/src/data/scouting.json"),
    ]);
  });

  it("orders retained versions numerically so v10 never shadows v9", () => {
    const context = retainedFixture("[0]", { v9: "[2]", v10: "[2]" }, "v11");
    expect(load(context, "[2]")).toBe(
      'export { default } from "../../../v9/src/data/scouting.json";\n',
    );
  });

  it("inlines the earliest copy of a retained payload instead of pointing at itself", () => {
    const output = load(retainedFixture("[0]", { v1: "[1]", v2: "[2]" }, "v2"), "[2]");
    expect(output).toBe('export default JSON.parse("[2]");\n');
  });

  it("rejects invalid retained JSON instead of hiding it behind a live module", () => {
    expect(() => load(fixture("broken"), "broken")).toThrow();
  });
});
