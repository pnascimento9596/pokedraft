// Client-safe: the label only formats a version string and imports no retained bundle.
export function engineLabel(engine: string): string {
  const n = /^pokedraft-engine-(\d+)$/.exec(engine)?.[1];
  return n === undefined ? engine : `v${n}`;
}

// Token versions with a retained bundle under src/engine/versions/. Kept here, free of bundle
// imports, so the proxy can let their share links through; versions.test.ts pins it to the
// dispatcher's table.
export const RETAINED_TOKEN_VERSIONS: readonly number[] = [1];
