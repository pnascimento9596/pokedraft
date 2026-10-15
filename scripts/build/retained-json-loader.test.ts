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

  it("rejects invalid retained JSON instead of hiding it behind a live module", () => {
    expect(() => load(fixture("broken"), "broken")).toThrow();
  });
});
