import { Fragment, type ReactNode } from "react";
import type { Species } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeIcon } from "@/components/TypeIcon";
import { SUITABILITY_LABEL, typeLabel } from "@/ui/labels";
import s from "./Pitch.module.css";

export function PitchCard({
  species,
  slotLabel,
  role,
  note,
  suitability,
  id,
}: {
  readonly species: Species | null;
  readonly slotLabel: string;
  readonly role: string;
  readonly note?: ReactNode;
  readonly suitability?: "recommended" | "ok" | "bad" | null;
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
      <span id={`${id}-slot`} className={species === null ? s.tokenSlot : s.filledSlot}>
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
        <span
          id={`${id}-prompt`}
          className={s.emptyPrompt}
          data-suitability={suitability ?? undefined}
        >
          {suitability === "recommended" ? (
            <>
              <span aria-hidden="true">★</span>{" "}
            </>
          ) : null}
          {suitability ? SUITABILITY_LABEL[suitability] : "Tap to draft"}
        </span>
      ) : (
        <>
          <span id={`${id}-name`} className={s.tokenName}>
            {species.name}
          </span>{" "}
          <span id={`${id}-types`} className={s.cardTypes}>
            {species.types.map((type) => (
              <Fragment key={type}>
                <TypeIcon type={type} size={15} decorative />
                <span className="visually-hidden">{typeLabel(type)}</span>{" "}
              </Fragment>
            ))}
          </span>
        </>
      )}
    </>
  );
}
