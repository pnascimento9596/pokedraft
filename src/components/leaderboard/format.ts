import { GENS, type DraftOrder, type DraftStyle } from "@/engine";
import { ORDER_LABEL, STYLE_LABEL } from "@/ui/labels";

function isStyle(v: string): v is DraftStyle {
  return Object.hasOwn(STYLE_LABEL, v);
}

function isOrder(v: string): v is DraftOrder {
  return Object.hasOwn(ORDER_LABEL, v);
}

// The server stores cup8 variants as `style.order.g<gens>` and kanto151 variants as `order`.
// Anything else is shown as stored rather than guessed at.
export function variantLabel(variant: string): string {
  const parts = variant.split(".");
  if (parts.length === 1 && isOrder(parts[0])) return ORDER_LABEL[parts[0]];
  if (parts.length === 3 && isStyle(parts[0]) && isOrder(parts[1]) && /^g\d+$/.test(parts[2])) {
    const count = parts[2].length - 1;
    const regions =
      count === GENS.length ? "All regions" : `${count} ${count === 1 ? "region" : "regions"}`;
    return `${STYLE_LABEL[parts[0]]}, ${ORDER_LABEL[parts[1]]}, ${regions}`;
  }
  return variant;
}

export function longDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
