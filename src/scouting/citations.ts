// Mechanical check that a Layer 2 rationale cites only facts present in the shipped data.
// Each finding names the cited text and the value the data actually holds.
import { SHAPES, TYPES, type Species } from "@/data/pokedex";
import type { AttributeBreakdown } from "./attributes";
import { MOVE_TRAITS } from "./move-traits";
import { ATTRS, type Attr, type Attributes } from "./types";

export interface CitedEntry {
  rationale: string;
  baseline: Attributes;
  attrs: Attributes;
  adjustments: Partial<Record<Attr, number>>;
  // Rounded total of what Layer 1 added on top of the stat blend (shape, heavy, baby, moves,
  // abilities, type). Rationales may cite it, as in "Layer 1 already gave AER +15".
  layer1Mods: Record<Attr, number>;
}

type StatWord = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
// Also reads indirect forms such as "ACC at 74" and "STA to 56".
const ATTR_RE = new RegExp(
  `\\b(${ATTRS.join("|")})\\s+(?:(?:at|of|is|to|from|near|around)\\s+)?(?:(?:only|just)\\s+)?([+-]?\\d+)\\b`,
  "g",
);
// Lower or title case only, so the attribute DEF is not read as the stat def.
const STAT_RE = /\b(hp|HP|Hp|atk|Atk|def|Def|spa|Spa|spd|Spd|spe|Spe)\s+(\d+)\b/g;
const SHAPE_ALT = [...SHAPES].sort((a, b) => b.length - a.length).join("|");
const SHAPE_RE = new RegExp(
  `\\bshape\\s+(${SHAPE_ALT})(?![\\w-])|(?<![\\w-])(${SHAPE_ALT})\\s+shape\\b`,
  "gi",
);
const TYPE_RE = new RegExp(
  `(?<!\\b(?:no|not|without|non)[\\s-])\\b(${TYPES.join("|")})(?:/(${TYPES.join("|")}))?(?:\\s+|-)type\\b`,
  "gi",
);
const norm = (v: string) => v.replace(/’/g, "'");

export function layer1ModTotals(breakdown: Record<Attr, AttributeBreakdown>): Record<Attr, number> {
  const out = {} as Record<Attr, number>;
  for (const a of ATTRS) {
    const b = breakdown[a];
    out[a] = Math.round(b.shape + b.heavy + b.frame + b.baby + b.moves + b.abilities + b.type);
  }
  return out;
}

// A kilogram citation may round to the nearest kilogram: "45 kg" for 452 hg.
const kgMatches = (kg: number, hg: number) => Math.abs(kg * 10 - hg) < 10;

export function checkCitations(
  e: CitedEntry,
  s: Species,
  abilityNames: ReadonlyMap<string, string>,
): string[] {
  const out: string[] = [];
  const r = e.rationale;

  for (const m of r.matchAll(STAT_RE)) {
    const stat = m[1]!.toLowerCase() as StatWord;
    if (s[stat] !== Number(m[2])) out.push(`"${m[0]}" but ${stat} is ${s[stat]}`);
  }

  for (const m of r.matchAll(ATTR_RE)) {
    const attr = m[1] as Attr;
    const n = Number(m[2]);
    const adj = e.adjustments[attr];
    const l1 = e.layer1Mods[attr];
    if (/^[+-]/.test(m[2]!)) {
      if (adj !== n && l1 !== n) {
        out.push(`"${m[0]}" but the ${attr} adjustment is ${adj ?? "none"}, Layer 1 mods ${l1}`);
      }
    } else if (![e.baseline[attr], e.attrs[attr], Math.abs(adj ?? NaN), Math.abs(l1)].includes(n)) {
      out.push(
        `"${m[0]}" but ${attr} is ${e.baseline[attr]} baseline, ${e.attrs[attr]} final, Layer 1 mods ${l1}`,
      );
    }
  }

  for (const m of r.matchAll(/\bheight\s+(\d+(?:\.\d+)?)(\s*m\b)?/gi)) {
    const dm = m[2] ? Math.round(Number(m[1]) * 10) : Number(m[1]);
    if (dm !== s.heightDm) out.push(`"${m[0]}" but height is ${s.heightDm} dm`);
  }
  for (const m of r.matchAll(/\b(\d+(?:\.\d+)?)\s*m\b/g)) {
    if (Math.round(Number(m[1]) * 10) !== s.heightDm) {
      out.push(`"${m[0]}" but height is ${s.heightDm / 10} m`);
    }
  }
  for (const m of r.matchAll(/\bweight\s+(?:of\s+)?(\d+(?:\.\d+)?)(\s*(?:hg|kg)\b)?/gi)) {
    const kg = m[2]?.includes("kg");
    if (kg ? !kgMatches(Number(m[1]), s.weightHg) : Number(m[1]) !== s.weightHg) {
      out.push(`"${m[0]}" but weight is ${s.weightHg} hg`);
    }
  }
  for (const m of r.matchAll(/\b(\d+(?:\.\d+)?)\s*(hg|kg)\b/g)) {
    const ok = m[2] === "kg" ? kgMatches(Number(m[1]), s.weightHg) : Number(m[1]) === s.weightHg;
    if (!ok) out.push(`"${m[0]}" but weight is ${s.weightHg} hg`);
  }

  for (const m of r.matchAll(SHAPE_RE)) {
    const shape = (m[1] ?? m[2])!.toLowerCase();
    if (shape !== s.shape) out.push(`"${m[0]}" but shape is ${s.shape}`);
  }

  for (const m of r.matchAll(TYPE_RE)) {
    for (const t of [m[1], m[2]]) {
      if (t && !s.types.includes(t.toLowerCase() as Species["types"][number])) {
        out.push(`"${m[0]}" but types are ${s.types.join("/")}`);
      }
    }
  }

  const genus = /\b[Gg]enus\s+([A-Z][\w'’é.-]*(?:\s+[A-Z][\w'’é.-]*)*)/.exec(r);
  if (genus && !norm(s.genus).startsWith(norm(genus[1]!).replace(/\.$/, "")))
    out.push(`"${genus[0]}" but genus is ${s.genus}`);

  for (const m of r.matchAll(/\b[a-z]+(?:-[a-z]+)+\b/g)) {
    const slug = m[0];
    if (slug in MOVE_TRAITS && !s.kickMoves.includes(slug)) {
      out.push(`"${slug}" is not in kickMoves`);
    }
    if (abilityNames.has(slug) && !s.abilities.some((a) => a.id === slug)) {
      out.push(`"${slug}" is not one of its abilities`);
    }
  }
  for (const m of r.matchAll(/\babilit(?:y|ies)\s+((?:[A-Z][\w'’-]*\s?)+)/g)) {
    const named = norm(m[1]!.trim());
    const matches = (a: { name: string }) =>
      named.startsWith(norm(a.name)) || norm(a.name).startsWith(named);
    if (!s.abilities.some(matches)) {
      out.push(`"${m[0].trim()}" but abilities are ${s.abilities.map((a) => a.name).join(", ")}`);
    }
  }
  return out;
}
