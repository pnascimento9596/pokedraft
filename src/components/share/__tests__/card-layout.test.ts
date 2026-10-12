import { describe, expect, it } from "vitest";
import { FORMATION_IDS } from "@/engine/types";
import { PITCH_RECT, TOKEN, tokenBoxes, tokenImageRect } from "../card-layout";

describe("share card token layout", () => {
  it("draws every sprite at least 104 px so icons stay readable in a phone chat preview", () => {
    expect(tokenImageRect("4-3-3", 9).size).toBeGreaterThanOrEqual(104);
    expect(TOKEN.pillFont).toBeGreaterThanOrEqual(22);
  });

  it("gives the pitch at least 800 px of the 1200 px card", () => {
    expect(PITCH_RECT.width).toBeGreaterThanOrEqual(800);
    expect(PITCH_RECT.height).toBeGreaterThanOrEqual(560);
  });

  it.each(FORMATION_IDS)(
    "%s keeps all 11 token boxes inside the touchlines and apart from each other, so no icon or name is clipped or covered",
    (formation) => {
      const boxes = tokenBoxes(formation);
      expect(boxes).toHaveLength(11);
      for (const b of boxes) {
        expect(b.left).toBeGreaterThanOrEqual(PITCH_RECT.left + 4);
        expect(b.top).toBeGreaterThanOrEqual(PITCH_RECT.top + 4);
        expect(b.left + b.width).toBeLessThanOrEqual(PITCH_RECT.left + PITCH_RECT.width - 4);
        expect(b.top + b.height).toBeLessThanOrEqual(PITCH_RECT.top + PITCH_RECT.height - 4);
      }
      const collisions: string[] = [];
      boxes.forEach((a, i) => {
        boxes.forEach((b, j) => {
          if (j <= i) return;
          const apartX = a.left + a.width + 2 <= b.left || b.left + b.width + 2 <= a.left;
          const apartY = a.top + a.height + 2 <= b.top || b.top + b.height + 2 <= a.top;
          if (!apartX && !apartY) collisions.push(`${i}/${j}`);
        });
      });
      expect(collisions).toEqual([]);
    },
  );

  it("places each slot's picture inside its own token box", () => {
    for (const formation of FORMATION_IDS) {
      const boxes = tokenBoxes(formation);
      boxes.forEach((box, i) => {
        const r = tokenImageRect(formation, i);
        expect(r.left).toBeGreaterThanOrEqual(box.left);
        expect(r.top).toBeGreaterThanOrEqual(box.top);
        expect(r.left + r.size).toBeLessThanOrEqual(box.left + box.width);
        expect(r.top + r.size).toBeLessThanOrEqual(box.top + box.height);
      });
    }
  });
});
