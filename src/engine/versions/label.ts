// Client-safe: the label only formats a version string and imports no retained bundle.
export function engineLabel(engine: string): string {
  const n = /^pokedraft-engine-(\d+)$/.exec(engine)?.[1];
  return n === undefined ? engine : `v${n}`;
}
