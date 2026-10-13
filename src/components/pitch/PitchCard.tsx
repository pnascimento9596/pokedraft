import { Fragment, type ReactNode } from "react";
import type { Species } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { typeLabel } from "@/ui/labels";
import { TYPE_PALETTE } from "@/design/stadium";
import s from "./Pitch.module.css";

export function PitchCard({
  species,
  slotLabel,
  role,
  note,
  id,
}: {
  readonly species: Species | null;
  readonly slotLabel: string;
  readonly role: string;
  readonly note?: ReactNode;
  readonly id: string;
}) {
  return (
    <>
      <span className={s.cardHeader}>
        <span id={`${id}-role`} className={s.cardRole}>
          {role}
        </span>{" "}
        {species !== null && note !== undefined ? (
          <span id={`${id}-note`} className={s.tokenNote}>
            {note}
          </span>
        ) : null}
      </span>{" "}
      <span id={`${id}-slot`} className={s.tokenSlot}>
        {slotLabel}
      </span>{" "}
      <span className={s.tokenImage}>
        {species === null ? (
          <span className={s.tokenEmpty} aria-hidden="true">
            +
          </span>
        ) : (
          <PlayerImage dexId={species.id} size={48} alt={species.name} />
        )}
      </span>{" "}
      {species === null ? (
        <span id={`${id}-prompt`} className={s.emptyPrompt}>
          Tap to Draft!
        </span>
      ) : (
        <>
          <span id={`${id}-name`} className={s.tokenName}>
            {species.name}
          </span>{" "}
          <span id={`${id}-types`} className={s.cardTypes}>
            {species.types.map((type) => (
              <Fragment key={type}>
                <span style={{ borderColor: TYPE_PALETTE[type] }}>{typeLabel(type)}</span>{" "}
              </Fragment>
            ))}
          </span>
        </>
      )}
    </>
  );
}
