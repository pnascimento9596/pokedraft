function expNonPositive(x: number): number {
  let halvings = 0;
  let r = -x;
  while (r > 0.5) {
    r /= 2;
    halvings++;
  }
  let term = 1;
  let sum = 1;
  for (let k = 1; k <= 20; k++) {
    term *= -r / k;
    sum += term;
  }
  for (let i = 0; i < halvings; i++) sum *= sum;
  return sum;
}

function cbrt(a: number): number {
  if (a === 0) return 0;
  let x = a > 1 ? a : 1;
  for (let i = 0; i < 200; i++) {
    const next = (2 * x + a / (x * x)) / 3;
    if (next === x) break;
    x = next;
  }
  return x;
}

// Abramowitz and Stegun 7.1.26, absolute error below 1.5e-7.
function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * expNonPositive(-x * x);
}

export function chiSquarePValue(stat: number, df: number): number {
  if (!(df > 0)) throw new RangeError(`df must be positive, got ${df}`);
  if (stat <= 0) return 1;
  const v = 2 / (9 * df);
  const z = (cbrt(stat / df) - (1 - v)) / Math.sqrt(v);
  return 0.5 * erfc(z / Math.SQRT2);
}

export function chiSquareUniform(counts: readonly number[]): {
  stat: number;
  df: number;
  p: number;
} {
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = total / counts.length;
  let stat = 0;
  for (const c of counts) stat += ((c - expected) * (c - expected)) / expected;
  const df = counts.length - 1;
  return { stat, df, p: chiSquarePValue(stat, df) };
}
