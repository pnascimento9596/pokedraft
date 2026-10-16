import "server-only";
import { replay as replayLive } from "../replay";
import {
  ENGINE_VERSION,
  RUN_TOKEN_VERSION,
  RunTokenError,
  type CupResult,
  type DraftState,
} from "../types";
import {
  fromLegacy,
  type LegacyCupResult,
  type LegacyV3CupResult,
} from "./legacy";
export { engineLabel } from "./label";

export interface ReplayedAnyRun {
  readonly engine: string;
  readonly current: boolean;
  /** The retained bundle that replayed the run, or null for the live engine. */
  readonly bundle: string | null;
  readonly draft: DraftState;
  readonly cup: CupResult;
}

interface RetainedBundle {
  readonly ENGINE_VERSION: string;
  readonly BUNDLE_MARKER: string;
  replay(token: string): { readonly draft: unknown; readonly cup: unknown };
  /** Converts the bundle's own result to today's type, with whatever ladder that needs. */
  readonly adapt: (cup: unknown) => CupResult;
}

// Keyed by the token's pd<N>. prefix. A retained bundle is the frozen copy of the engine that
// issued those tokens, so it wins over the live engine even when the versions still match.
const RETAINED: Readonly<Record<number, () => Promise<RetainedBundle>>> = {
  1: async () => {
    const [bundle, { buildLadder }] = await Promise.all([
      import("./v1"),
      import("./v1/src/engine/opponents"),
    ]);
    return { ...bundle, adapt: (cup) => fromLegacy(cup as LegacyCupResult, buildLadder) };
  },
  2: async () => {
    const [bundle, { buildLadder }] = await Promise.all([
      import("./v2"),
      import("./v2/src/engine/opponents"),
    ]);
    return { ...bundle, adapt: (cup) => fromLegacy(cup as LegacyCupResult, buildLadder) };
  },
  3: async () => {
    const [bundle, { buildLadder }] = await Promise.all([
      import("./v3"),
      import("./v3/src/engine/opponents"),
    ]);
    return { ...bundle, adapt: (cup) => fromLegacy(cup as LegacyV3CupResult, buildLadder, 3) };
  },
  // Engine 5 only added the optional saves list, so an engine-4 result is already today's shape.
  4: async () => ({ ...(await import("./v4")), adapt: (cup) => cup as CupResult }),
};

const PREFIX = /^pd(\d+)\./;

export function retainedTokenVersions(): number[] {
  return Object.keys(RETAINED).map(Number);
}

export function tokenVersion(token: string): number {
  const m = PREFIX.exec(token);
  if (m === null) throw new RunTokenError("malformed", "token has no pd<version>. prefix");
  return Number(m[1]);
}

export async function replayAnyVersion(token: string): Promise<ReplayedAnyRun> {
  const version = tokenVersion(token);
  const current = version === RUN_TOKEN_VERSION;
  const loadBundle = RETAINED[version];
  if (loadBundle !== undefined) {
    const bundle = await loadBundle();
    const run = bundle.replay(token);
    // The bundle's output is byte-identical to its engine's (versions.test.ts pins it). The
    // casts only bridge the bundle's own copy of the branded types; fromLegacy makes every
    // shape change to today's result type, type-checked.
    return {
      engine: bundle.ENGINE_VERSION,
      current,
      bundle: bundle.BUNDLE_MARKER,
      draft: run.draft as DraftState,
      cup: bundle.adapt(run.cup),
    };
  }
  if (!current) throw new RunTokenError("unknownVersion", `unknown token version ${version}`);
  return { engine: ENGINE_VERSION, current, bundle: null, ...replayLive(token) };
}
