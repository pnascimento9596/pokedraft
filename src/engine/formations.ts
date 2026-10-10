import { compareCodePointStrings } from "./rng";
import { ROLE_LINE } from "./species";
import {
  FORMATION_IDS,
  LINES,
  type Channel,
  type Eleven,
  type Formation,
  type FormationId,
  type Role,
  type Slot,
  type SlotId,
} from "./types";

type SlotRow = readonly [label: string, role: Role, channel: Channel, x: number, y: number];

const CHANNEL_ADJACENT: Readonly<Record<Channel, readonly Channel[]>> = {
  L: ["L", "C"],
  C: ["L", "C", "R"],
  R: ["R", "C"],
};
const CHANNEL_ORDER: Readonly<Record<Channel, number>> = { L: 0, C: 1, R: 2 };

type Edge = readonly [SlotId, SlotId];

export function deriveAdjacency(slots: readonly Slot[]): readonly Edge[] {
  const byLine = LINES.map((line) =>
    slots
      .map((slot, declared) => ({ slot, declared }))
      .filter(({ slot }) => slot.line === line)
      .sort(
        (a, b) =>
          CHANNEL_ORDER[a.slot.channel] - CHANNEL_ORDER[b.slot.channel] || a.declared - b.declared,
      )
      .map(({ slot }) => slot),
  );
  const edges = new Map<string, Edge>();
  const link = (a: Slot, b: Slot): void => {
    const [lo, hi] = compareCodePointStrings(a.id, b.id) < 0 ? [a.id, b.id] : [b.id, a.id];
    edges.set(`${lo} ${hi}`, [lo, hi]);
  };
  for (const line of byLine) {
    for (let i = 0; i < line.length; i++) {
      for (let j = i + 1; j < line.length; j++) {
        if (line[i]!.channel === line[j]!.channel) link(line[i]!, line[j]!);
      }
      if (i > 0 && line[i - 1]!.channel !== line[i]!.channel) link(line[i - 1]!, line[i]!);
    }
  }
  for (let li = 1; li < byLine.length; li++) {
    for (const a of byLine[li - 1]!) {
      for (const b of byLine[li]!) {
        if (CHANNEL_ADJACENT[a.channel].includes(b.channel)) link(a, b);
      }
    }
  }
  return [...edges.values()].sort(
    (p, q) => compareCodePointStrings(p[0], q[0]) || compareCodePointStrings(p[1], q[1]),
  );
}

function makeFormation(id: FormationId, rows: Eleven<SlotRow>): Formation {
  const slots = rows.map(([label, role, channel, x, y]): Slot => ({
    id: `${id}.${label}` as SlotId,
    label,
    role,
    line: ROLE_LINE[role],
    channel,
    x,
    y,
  })) as unknown as Eleven<Slot>;
  return { id, slots, adjacency: deriveAdjacency(slots) };
}

const GK: SlotRow = ["GK", "GK", "C", 50, 5];
const BACK_FOUR = [
  ["LB", "FB", "L", 12, 24],
  ["LCB", "CB", "C", 37, 20],
  ["RCB", "CB", "C", 63, 20],
  ["RB", "FB", "R", 88, 24],
] as const satisfies readonly SlotRow[];
const BACK_THREE = [
  ["LCB", "CB", "C", 28, 22],
  ["CB", "CB", "C", 50, 20],
  ["RCB", "CB", "C", 72, 22],
] as const satisfies readonly SlotRow[];

const TEMPLATES: Readonly<Record<FormationId, Eleven<SlotRow>>> = {
  "4-3-3": [
    GK,
    ...BACK_FOUR,
    ["CDM", "DM", "C", 50, 38],
    ["LCM", "CM", "C", 32, 52],
    ["RCM", "CM", "C", 68, 52],
    ["LW", "W", "L", 15, 78],
    ["ST", "ST", "C", 50, 88],
    ["RW", "W", "R", 85, 78],
  ],
  "4-4-2": [
    GK,
    ...BACK_FOUR,
    ["LM", "WM", "L", 10, 52],
    ["LCM", "CM", "C", 38, 50],
    ["RCM", "CM", "C", 62, 50],
    ["RM", "WM", "R", 90, 52],
    ["LF", "ST", "C", 38, 88],
    ["RF", "ST", "C", 62, 88],
  ],
  "4-2-3-1": [
    GK,
    ...BACK_FOUR,
    ["LDM", "DM", "C", 38, 38],
    ["RDM", "DM", "C", 62, 38],
    ["LAM", "AM", "L", 18, 66],
    ["CAM", "AM", "C", 50, 65],
    ["RAM", "AM", "R", 82, 66],
    ["ST", "ST", "C", 50, 88],
  ],
  "4-1-4-1": [
    GK,
    ...BACK_FOUR,
    ["CDM", "DM", "C", 50, 38],
    ["LM", "WM", "L", 10, 55],
    ["LCM", "CM", "C", 36, 52],
    ["RCM", "CM", "C", 64, 52],
    ["RM", "WM", "R", 90, 55],
    ["ST", "ST", "C", 50, 88],
  ],
  "3-5-2": [
    GK,
    ...BACK_THREE,
    ["LWB", "WB", "L", 8, 44],
    ["LCM", "CM", "C", 30, 50],
    ["CM", "CM", "C", 50, 48],
    ["RCM", "CM", "C", 70, 50],
    ["RWB", "WB", "R", 92, 44],
    ["LF", "ST", "C", 38, 88],
    ["RF", "ST", "C", 62, 88],
  ],
  "3-4-3": [
    GK,
    ...BACK_THREE,
    ["LWB", "WB", "L", 8, 42],
    ["LCM", "CM", "C", 38, 50],
    ["RCM", "CM", "C", 62, 50],
    ["RWB", "WB", "R", 92, 42],
    ["LW", "W", "L", 15, 78],
    ["ST", "ST", "C", 50, 88],
    ["RW", "W", "R", 85, 78],
  ],
  "3-4-2-1": [
    GK,
    ...BACK_THREE,
    ["LM", "WM", "L", 10, 50],
    ["LCM", "CM", "C", 38, 48],
    ["RCM", "CM", "C", 62, 48],
    ["RM", "WM", "R", 90, 50],
    ["LAM", "AM", "L", 36, 68],
    ["RAM", "AM", "R", 64, 68],
    ["ST", "ST", "C", 50, 88],
  ],
  "5-3-2": [
    GK,
    ["LWB", "WB", "L", 8, 35],
    ["LCB", "CB", "C", 30, 22],
    ["CB", "CB", "C", 50, 20],
    ["RCB", "CB", "C", 70, 22],
    ["RWB", "WB", "R", 92, 35],
    ["LCM", "CM", "C", 30, 52],
    ["CM", "CM", "C", 50, 50],
    ["RCM", "CM", "C", 70, 52],
    ["LF", "ST", "C", 38, 88],
    ["RF", "ST", "C", 62, 88],
  ],
};

export const FORMATIONS: Readonly<Record<FormationId, Formation>> = Object.freeze(
  Object.fromEntries(FORMATION_IDS.map((id) => [id, makeFormation(id, TEMPLATES[id])])) as Record<
    FormationId,
    Formation
  >,
);

export function formationById(id: string): Formation {
  if (!(FORMATION_IDS as readonly string[]).includes(id)) {
    throw new RangeError(`unknown formation ${id}`);
  }
  return FORMATIONS[id as FormationId];
}
