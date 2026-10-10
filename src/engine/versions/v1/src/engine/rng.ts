import { compareCodePointStrings, cyrb128, sfc32 } from "../lib/rng";
import type { IsoDate, Seed } from "./types";

export { compareCodePointStrings } from "../lib/rng";

export interface EngineRng {
  next(): number;
  uint32(): number;
  int(n: number): number;
  pick<T>(arr: readonly T[]): T;
  sample<T>(arr: readonly T[], k: number): T[];
}

const TWO_32 = 4294967296;

export function rngFromUint32(uint32: () => number): EngineRng {
  function int(n: number): number {
    if (!Number.isSafeInteger(n) || n < 1 || n > TWO_32) {
      throw new RangeError(`int() requires an integer in [1, 2^32], got ${n}`);
    }
    const limit = TWO_32 - (TWO_32 % n);
    let u = uint32();
    while (u >= limit) u = uint32();
    return u % n;
  }
  return {
    next: () => uint32() / TWO_32,
    uint32,
    int,
    pick(arr) {
      if (arr.length === 0) throw new RangeError("pick() requires a non-empty array");
      return arr[int(arr.length)]!;
    },
    sample(arr, k) {
      if (!Number.isSafeInteger(k) || k < 0 || k > arr.length) {
        throw new RangeError(`sample() needs 0 <= k <= ${arr.length}, got ${k}`);
      }
      const pool = arr.slice();
      for (let i = 0; i < k; i++) {
        const j = i + int(pool.length - i);
        const tmp = pool[i]!;
        pool[i] = pool[j]!;
        pool[j] = tmp;
      }
      return pool.slice(0, k);
    },
  };
}

export function createEngineRng(seed: string): EngineRng {
  const [a, b, c, d] = cyrb128(seed);
  const next = sfc32(a, b, c, d);
  return rngFromUint32(() => (next() * TWO_32) >>> 0);
}

export const SUBSTREAMS = [
  "draft_roll",
  "daily",
  "match_sim",
  "event_gen",
  "opponent_selection",
  "availability",
  "group_table",
] as const;
export type Substream = (typeof SUBSTREAMS)[number];

const SUBSEED_VERSION = "v1";
const SUBSEED_DOMAIN = "pokedraft-subseed-v1";

function isSubstream(name: string): name is Substream {
  return (SUBSTREAMS as readonly string[]).includes(name);
}

export function deriveSubseed(runSeed: string, substream: Substream, scopeId?: string): Seed {
  if (typeof runSeed !== "string" || runSeed.trim().length === 0) {
    throw new RangeError("deriveSubseed requires a non-empty runSeed");
  }
  if (!isSubstream(substream)) {
    throw new RangeError(`deriveSubseed received unknown substream: ${String(substream)}`);
  }
  if (scopeId !== undefined && (typeof scopeId !== "string" || scopeId.trim().length === 0)) {
    throw new RangeError("deriveSubseed scopeId, when provided, must be non-empty");
  }
  // A JSON tuple cannot collide when a seed or scope itself contains a separator.
  const material = JSON.stringify([SUBSEED_DOMAIN, runSeed, substream, scopeId ?? null]);
  const rng = createEngineRng(material);
  let hex = "";
  for (let i = 0; i < 4; i++) hex += rng.uint32().toString(16).padStart(8, "0");
  return `pokedraft:${substream}:${SUBSEED_VERSION}:${hex}` as Seed;
}

export type CanonicalSortKey = string | number;

export function canonicalSortBy<T>(
  items: readonly T[],
  keyParts: (item: T) => readonly CanonicalSortKey[],
): T[] {
  const keyed = items.map((item, idx) => ({ item, idx, key: keyParts(item) }));
  keyed.sort((a, b) => {
    const ak = a.key;
    const bk = b.key;
    const len = Math.min(ak.length, bk.length);
    for (let i = 0; i < len; i++) {
      const av = ak[i]!;
      const bv = bk[i]!;
      const aIsNum = typeof av === "number";
      const bIsNum = typeof bv === "number";
      if (aIsNum && bIsNum) {
        if (av < bv) return -1;
        if (av > bv) return 1;
        continue;
      }
      if (aIsNum !== bIsNum) return aIsNum ? -1 : 1;
      const cmp = compareCodePointStrings(av as string, bv as string);
      if (cmp !== 0) return cmp;
    }
    if (ak.length !== bk.length) return ak.length - bk.length;
    return a.idx - b.idx;
  });
  return keyed.map((entry) => entry.item);
}

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function toIsoDate(s: string): IsoDate {
  const m = ISO_DATE.exec(s);
  if (!m) throw new RangeError(`expected a YYYY-MM-DD date, got ${JSON.stringify(s)}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]!;
  if (day > maxDay) throw new RangeError(`${s} is not a calendar date`);
  return s as IsoDate;
}

export function dailySeed(date: IsoDate): Seed {
  return deriveSubseed("pokedraft-daily", "daily", toIsoDate(date));
}
