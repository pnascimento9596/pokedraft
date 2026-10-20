import { cyrb128 } from "@/lib/rng";
import { readSession, writeSession } from "./storage";

const hex = (n: number) => n.toString(16).padStart(8, "0");

function revealKey(token: string): string {
  const [a, b] = cyrb128(token);
  return `pokedraft:revealed:${hex(a)}${hex(b)}`;
}

/** Whether this tab has already shown this run's results. */
export function wasRevealed(token: string): boolean {
  return readSession(revealKey(token)) !== null;
}

export function markRevealed(token: string): void {
  writeSession(revealKey(token), "1");
}
