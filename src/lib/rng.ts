// Seeded PRNG ported from wcdraft packages/core/src/rng.ts (cyrb128 hash plus sfc32,
// bryc's public-domain PRNG collection). All arithmetic is 32-bit, so a seed yields the
// same stream on every engine. This is the only randomness source in the repo.

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  // The folds are sequential: each XORs against the already-updated h1.
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function next(): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const [a, b, c, d] = cyrb128(typeof seed === "number" ? seed.toString() : seed);
  const next = sfc32(a, b, c, d);
  return {
    next,
    int(maxExclusive) {
      if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`int() requires a positive safe integer, got ${maxExclusive}`);
      }
      return Math.floor(next() * maxExclusive);
    },
    pick(arr) {
      if (arr.length === 0) throw new RangeError("pick() requires a non-empty array");
      return arr[Math.floor(next() * arr.length)]!;
    },
  };
}

export function compareCodePointStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
