import { useId } from "react";
import { FORMATIONS, speciesById } from "@/engine";
import type { FormationId, SetPiece, SpeciesId, StarterIndex } from "@/engine/types";
import s from "./SetPieceTakers.module.css";

const LABEL: Readonly<Record<SetPiece, string>> = { penalty: "Penalties", freeKick: "Free kicks" };
const AUTO = "auto";

/**
 * Who takes penalties and free kicks: a player on the pitch, or the automatic choice. Shared by
 * the pre-match card and the touchline's expanded view, in manager mode only.
 */
export function SetPieceTakers({
  formation,
  onPitch,
  value,
  disabled = false,
  onPick,
}: {
  readonly formation: FormationId;
  /** Who plays in each formation slot; null for an empty slot, which nobody can be picked from. */
  readonly onPitch: readonly (SpeciesId | null)[];
  readonly value: Readonly<Record<SetPiece, StarterIndex | null>>;
  readonly disabled?: boolean;
  readonly onPick: (set: SetPiece, slot: StarterIndex | null) => void;
}) {
  const id = useId();
  const slots = FORMATIONS[formation].slots;
  const players = onPitch.flatMap((species, slot) =>
    species === null ? [] : [{ slot: slot as StarterIndex, species }],
  );
  return (
    <fieldset className={s.takers} data-testid="set-pieces" disabled={disabled}>
      <legend className={s.legend}>Set pieces</legend>
      {(["penalty", "freeKick"] as const).map((set) => (
        <div key={set} className={s.field}>
          <label className={s.label} htmlFor={`${id}-${set}`}>
            {LABEL[set]}
          </label>
          <select
            id={`${id}-${set}`}
            className={s.select}
            data-testid={`taker-${set}`}
            value={value[set] === null ? AUTO : String(value[set])}
            onChange={(event) =>
              onPick(
                set,
                event.target.value === AUTO ? null : (Number(event.target.value) as StarterIndex),
              )
            }
          >
            <option value={AUTO}>Auto (best shooter)</option>
            {players.map((p) => (
              <option key={p.slot} value={p.slot}>
                {speciesById(p.species).name} ({slots[p.slot]!.label})
              </option>
            ))}
          </select>
        </div>
      ))}
    </fieldset>
  );
}
