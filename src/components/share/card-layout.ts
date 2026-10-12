import { FORMATIONS, type FormationId } from "@/engine";

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const MARGIN = 14;
const FRAME = 12;
const PITCH_W = 840;

export const OUTER_RECT: Rect = {
  left: MARGIN,
  top: MARGIN,
  width: PITCH_W + 2 * FRAME,
  height: CARD_SIZE.height - 2 * MARGIN,
};

export const PITCH_RECT: Rect = {
  left: OUTER_RECT.left + FRAME,
  top: OUTER_RECT.top + FRAME,
  width: PITCH_W,
  height: OUTER_RECT.height - 2 * FRAME,
};

export const PANEL_RECT: Rect = {
  left: OUTER_RECT.left + OUTER_RECT.width + MARGIN,
  top: MARGIN,
  width: CARD_SIZE.width - (OUTER_RECT.left + OUTER_RECT.width + MARGIN) - MARGIN,
  height: OUTER_RECT.height,
};

// 164 px is the widest name pill: "Walking Wake" is 152 px of Inter 600 at 22 px, plus 6 px each side.
export const TOKEN = {
  image: 120,
  pillHeight: 32,
  pillFont: 22,
  pillPad: 6,
  overlap: 14,
  width: 164,
  height: 138,
} as const;

const INSET = 5;
const GAP = 4;
const SAME_LINE = 10;
const COLUMN_CAPACITY = Math.floor((PITCH_RECT.height - 2 * INSET + GAP) / (TOKEN.height + GAP));

function chunkAtWidestGap(members: readonly number[], depth: (i: number) => number): number[][] {
  if (members.length <= COLUMN_CAPACITY) return [[...members]];
  let cut = 1;
  let widest = -1;
  for (let k = 1; k < members.length; k++) {
    const gap = depth(members[k]!) - depth(members[k - 1]!);
    if (gap > widest) {
      widest = gap;
      cut = k;
    }
  }
  return [
    ...chunkAtWidestGap(members.slice(0, cut), depth),
    ...chunkAtWidestGap(members.slice(cut), depth),
  ];
}

/** Slot indexes grouped into pitch columns, goalkeeper's column first. */
function columnsOf(formation: FormationId): number[][] {
  const slots = FORMATIONS[formation].slots;
  const byDepth = slots.map((_, i) => i).sort((a, b) => slots[a]!.y - slots[b]!.y || a - b);
  const lines: number[][] = [];
  for (const i of byDepth) {
    const last = lines[lines.length - 1];
    if (last !== undefined && slots[i]!.y - slots[last[last.length - 1]!]!.y <= SAME_LINE) {
      last.push(i);
    } else {
      lines.push([i]);
    }
  }
  return lines.flatMap((line) => chunkAtWidestGap(line, (i) => slots[i]!.y));
}

/**
 * Least-squares centres at least `spacing` apart inside [lo, hi], in the given order
 * (pool adjacent violators on the spacing-shifted targets, then clamped to the bounds).
 */
function spreadApart(targets: readonly number[], spacing: number, lo: number, hi: number) {
  const shifted = targets.map((t, i) => t - i * spacing);
  const blocks: { sum: number; count: number }[] = [];
  for (const value of shifted) {
    blocks.push({ sum: value, count: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1]!;
      const a = blocks[blocks.length - 2]!;
      if (a.sum / a.count <= b.sum / b.count) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, count: a.count + b.count });
    }
  }
  const flat = blocks.flatMap((b) => Array<number>(b.count).fill(b.sum / b.count));
  const top = hi - (targets.length - 1) * spacing;
  return flat.map((u, i) => Math.round(Math.min(top, Math.max(lo, u)) + i * spacing));
}

/** Card-pixel boxes for the 11 tokens of a formation, in slot order. */
export function tokenBoxes(formation: FormationId): readonly Rect[] {
  const slots = FORMATIONS[formation].slots;
  const columns = columnsOf(formation);
  const firstX = PITCH_RECT.left + INSET + TOKEN.width / 2;
  const lastX = PITCH_RECT.left + PITCH_RECT.width - INSET - TOKEN.width / 2;
  const firstY = PITCH_RECT.top + INSET + TOKEN.height / 2;
  const lastY = PITCH_RECT.top + PITCH_RECT.height - INSET - TOKEN.height / 2;
  const boxes: Rect[] = new Array<Rect>(slots.length);
  columns.forEach((members, c) => {
    const centreX =
      columns.length === 1 ? firstX : firstX + (c * (lastX - firstX)) / (columns.length - 1);
    const ordered = [...members].sort((a, b) => slots[a]!.x - slots[b]!.x || a - b);
    const centresY = spreadApart(
      ordered.map((i) => firstY + (slots[i]!.x / 100) * (lastY - firstY)),
      TOKEN.height + GAP,
      firstY,
      lastY,
    );
    ordered.forEach((slot, k) => {
      boxes[slot] = {
        left: Math.round(centreX - TOKEN.width / 2),
        top: Math.round(centresY[k]! - TOKEN.height / 2),
        width: TOKEN.width,
        height: TOKEN.height,
      };
    });
  });
  return boxes;
}

/** Where a slot's picture sits on the finished 1200x630 card, in pixels. */
export function tokenImageRect(
  formation: FormationId,
  slotIndex: number,
): { left: number; top: number; size: number } {
  const box = tokenBoxes(formation)[slotIndex]!;
  return {
    left: box.left + (TOKEN.width - TOKEN.image) / 2,
    top: box.top,
    size: TOKEN.image,
  };
}
