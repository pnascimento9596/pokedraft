import "server-only";
import { replay as replayLive } from "../replay";
import {
  ENGINE_VERSION,
  RUN_TOKEN_VERSION,
  RunTokenError,
  type CupResult,
  type DraftState,
} from "../types";
import * as v1 from "./v1";

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
}

// Keyed by the token's pd<N>. prefix. A retained bundle is the frozen copy of the engine that
// issued those tokens, so it wins over the live engine even when the versions still match.
const RETAINED: Readonly<Record<number, RetainedBundle>> = {
  [v1.RUN_TOKEN_VERSION]: v1,
};

const PREFIX = /^pd(\d+)\./;

export function tokenVersion(token: string): number {
  const m = PREFIX.exec(token);
  if (m === null) throw new RunTokenError("malformed", "token has no pd<version>. prefix");
  return Number(m[1]);
}

export function replayAnyVersion(token: string): ReplayedAnyRun {
  const version = tokenVersion(token);
  const current = version === RUN_TOKEN_VERSION;
  const bundle = RETAINED[version];
  if (bundle !== undefined) {
    const run = bundle.replay(token);
    // The bundle's output is byte-identical to its engine's (versions.test.ts pins it); the
    // cast only bridges the bundle's own copy of the branded types.
    return {
      engine: bundle.ENGINE_VERSION,
      current,
      bundle: bundle.BUNDLE_MARKER,
      draft: run.draft as DraftState,
      cup: run.cup as CupResult,
    };
  }
  if (!current) throw new RunTokenError("unknownVersion", `unknown token version ${version}`);
  return { engine: ENGINE_VERSION, current, bundle: null, ...replayLive(token) };
}
