"use client";

import { useState } from "react";
import type { SaveEvent } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { SIDE_COPY, saveLine, type ResultsVariant } from "./format";
import s from "./RecordedSaves.module.css";

export function RecordedSaves({
  saves,
  illustrate = false,
  variant = "live",
}: {
  readonly saves: readonly SaveEvent[] | undefined;
  readonly illustrate?: boolean;
  readonly variant?: ResultsVariant;
}) {
  const [selected, setSelected] = useState<SaveEvent | null>(null);
  if (saves === undefined) return null;
  return (
    <details className={s.saves} data-testid="recorded-saves">
      <summary>Recorded saves ({saves.length})</summary>
      <p className={s.note}>
        Recorded from chances that did not score. Saves never change the result.
      </p>
      {saves.length === 0 ? (
        <p>No saved attempts recorded in this match.</p>
      ) : (
        <ol className={s.list} aria-label="Recorded saves">
          {saves.map((event, index) => (
            <li key={index} data-side={event.side}>
              <span>
                {event.side === "user" ? SIDE_COPY[variant].xi : "Opponent"}: {saveLine(event)}
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
          <PlayerImage dexId={selected.attacker} size={48} alt="" />
          <span aria-hidden="true">⚽ → 🧤</span>
          <PlayerImage dexId={selected.keeper} size={64} alt="" />
          <figcaption>Illustration of recorded save. {saveLine(selected)}.</figcaption>
        </figure>
      ) : null}
    </details>
  );
}
