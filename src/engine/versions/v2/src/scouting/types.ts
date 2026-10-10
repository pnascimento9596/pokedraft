export const OUTFIELD_ATTRS = [
  "PAC",
  "ACC",
  "SHO",
  "PAS",
  "VIS",
  "DRI",
  "TEC",
  "DEF",
  "TAK",
  "AER",
  "PHY",
  "STA",
] as const;
export const GK_ATTRS = ["DIV", "HAN", "REF", "GKP", "KIC"] as const;
export const ATTRS = [...OUTFIELD_ATTRS, ...GK_ATTRS] as const;

export type OutfieldAttr = (typeof OUTFIELD_ATTRS)[number];
export type GkAttr = (typeof GK_ATTRS)[number];
export type Attr = (typeof ATTRS)[number];
export type Attributes = Record<Attr, number>;

export const ROLES = ["GK", "CB", "FB", "WB", "DM", "CM", "AM", "WM", "W", "ST"] as const;
export type Role = (typeof ROLES)[number];
export const OUTFIELD_ROLES = ROLES.filter((r) => r !== "GK");

export type RoleFits = Record<Role, number>;
