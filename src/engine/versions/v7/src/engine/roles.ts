import { COEFFICIENTS } from "../scouting/coefficients";
import { ROLES, type Role } from "../scouting/types";
import { LINES, type Line } from "./types";

// Lives apart from species.ts so that FORMATIONS can load without the species data.
export const ROLE_LINE: Readonly<Record<Role, Line>> = Object.fromEntries(
  ROLES.map((role) => [role, LINES[COEFFICIENTS.roleLine[role]]]),
) as Record<Role, Line>;
