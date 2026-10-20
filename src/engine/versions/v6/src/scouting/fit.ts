import { COEFFICIENTS, type ScoutingCoefficients } from "./coefficients";
import { ROLES, type Attr, type Attributes, type Role, type RoleFits } from "./types";

export function roleBlend(
  attrs: Attributes,
  role: Role,
  c: ScoutingCoefficients = COEFFICIENTS,
): number {
  let sum = 0;
  for (const [attr, w] of Object.entries(c.roleWeights[role]) as [Attr, number][]) {
    sum += attrs[attr] * w;
  }
  return sum;
}

export function roleCompat(from: Role, to: Role, c: ScoutingCoefficients = COEFFICIENTS): number {
  if (from === to) return c.compat.sameRole;
  for (const [a, b, v] of c.compat.pairs) {
    if ((a === from && b === to) || (a === to && b === from)) return v;
  }
  const la = c.roleLine[from];
  const lb = c.roleLine[to];
  if (la === 0 || lb === 0) return c.compat.keeperOutfield;
  const gap = Math.abs(la - lb);
  if (gap === 0) return c.compat.sameLine;
  return c.compat.lineGap[gap as 1 | 2];
}

export function familiarity(naturalRoles: readonly Role[], role: Role, c = COEFFICIENTS): number {
  if (naturalRoles.length === 0)
    throw new RangeError("familiarity() needs at least one natural role");
  return Math.max(...naturalRoles.map((n) => roleCompat(n, role, c)));
}

// fit(species, role): role blend of final attributes, scaled by familiarity with the role
// from the species' natural roles (Layer 2 bestRoles). Integer 0..100.
export function fit(
  attrs: Attributes,
  naturalRoles: readonly Role[],
  role: Role,
  c: ScoutingCoefficients = COEFFICIENTS,
): number {
  const v = Math.round(roleBlend(attrs, role, c) * familiarity(naturalRoles, role, c));
  return Math.max(0, Math.min(100, v));
}

export function allFits(
  attrs: Attributes,
  naturalRoles: readonly Role[],
  c = COEFFICIENTS,
): RoleFits {
  return Object.fromEntries(ROLES.map((r) => [r, fit(attrs, naturalRoles, r, c)])) as RoleFits;
}
