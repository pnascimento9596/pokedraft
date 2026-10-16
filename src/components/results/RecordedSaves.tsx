"use client";

import { useState } from "react";
import { speciesById, type SaveEvent } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { saveLine } from "./format";
import s from "./RecordedSaves.module.css";

export function RecordedSaves({
  saves,
  illustrate = false,
}: {
  readonly saves: readonly SaveEvent[] | undefined;
  readonly illustrate?: boolean;
}) {
  const [selected, setSelected] = useState<SaveEvent | null>(null);
  if (saves === undefined) return null;
  return (
    <details className={s.saves} data-testid="recorded-saves">
      <summary>Recorded saves ({saves.length})</summary>
      {saves.length === 0 ? (
        <p>No saved attempts recorded in this match.</p>
      ) : (
        <ol className={s.list} aria-label="Recorded saves">
          {saves.map((event, index) => (
            <li key={index} data-side={event.side}>
              <span>
                {event.side === "user" ? "Your XI" : "Opponent"}: {saveLine(event)}
              </span>
              {illustrate ? (
                <button type="button" className="btn btn--sm" onClick={() => setSelected(event)}>
                  {`Illustrate save at ${event.minute}'`}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {selected !== null ? (
        <figure className={s.illustration} data-testid="save-illustration">
          <PlayerImage
            dexId={selected.attacker}
            size={48}
            alt={speciesById(selected.attacker).name}
          />
          <span aria-hidden="true">⚽ → 🧤</span>
          <PlayerImage dexId={selected.keeper} size={64} alt={speciesById(selected.keeper).name} />
          <figcaption>Illustration of recorded save. {saveLine(selected)}.</figcaption>
        </figure>
      ) : null}
    </details>
  );
}
