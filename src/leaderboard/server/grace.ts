import type { IsoDate } from "@/engine";

type IsoDateTime = `${number}-${number}-${number}T${number}:${number}:${number}Z`;

/**
 * The window after an engine change in which runs played on the retired engine still rank. The
 * token prefix, not the page, says which engine played a run: a page that reloaded onto the new
 * bundle still sends the retired engine's token.
 */
export interface Grace {
  readonly version: number;
  readonly engine: string;
  /** The window closes at this instant. */
  readonly until: IsoDateTime;
  /** The New York date the change landed. Its Daily belongs to the new engine only. */
  readonly flipDate: IsoDate;
}

export const GRACE: Grace | null = {
  version: 6,
  engine: "pokedraft-engine-6",
  until: "2026-10-23T04:00:00Z",
  flipDate: "2026-10-21" as IsoDate,
};

export function openGrace(grace: Grace | null, token: string, now: Date): Grace | null {
  if (grace === null || !token.startsWith(`pd${grace.version}.`)) return null;
  return now.getTime() < Date.parse(grace.until) ? grace : null;
}
