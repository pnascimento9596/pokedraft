"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { TYPES } from "@/data/pokedex";
import {
  FORMATIONS,
  eligibleSpecies,
  speciesById,
  type DraftState,
  type Gen,
  type PokemonType,
  type SlotRef,
  type Species,
  type SpeciesId,
} from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { genLabel, typeLabel } from "@/ui/labels";
import { ALL_REFS, valueAt } from "@/ui/lineup";
import s from "./Picker.module.css";

export const PICKER_LIMIT = 120;

export interface PickerProps {
  readonly state: DraftState;
  readonly slot: SlotRef;
  readonly showRatings: boolean;
  readonly onPick: (species: SpeciesId) => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
}

function dex(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

export function Picker({ state, slot, showRatings, onPick, onClear, onClose }: PickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonType | null>(null);
  const [gen, setGen] = useState<Gen | null>(null);

  const { lineup, settings } = state;
  const formation = FORMATIONS[lineup.formation];
  const role = slot.kind === "starter" ? formation.slots[slot.index].role : null;
  const slotLabel =
    slot.kind === "starter" ? formation.slots[slot.index].label : `SUB ${slot.index + 1}`;
  const current = valueAt(lineup, slot);
  const gens = settings.mode === "builder" ? settings.gens : [];

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const onField = useMemo(() => {
    const at = new Map<SpeciesId, string>();
    for (const r of ALL_REFS) {
      const id = valueAt(lineup, r);
      if (id === null) continue;
      at.set(id, r.kind === "starter" ? formation.slots[r.index].label : `SUB ${r.index + 1}`);
    }
    return at;
  }, [lineup, formation]);

  const candidates = useMemo(() => {
    const ids = new Set<SpeciesId>([...eligibleSpecies(state), ...onField.keys()]);
    return [...ids].sort((a, b) => a - b).map(speciesById);
  }, [state, onField]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(
      (sp) =>
        (q === "" || sp.name.toLowerCase().includes(q) || dex(sp.id).includes(q)) &&
        (type === null || (sp.types as readonly PokemonType[]).includes(type)) &&
        (gen === null || sp.gen === gen),
    );
  }, [candidates, query, type, gen]);

  const shown = matches.slice(0, PICKER_LIMIT);

  const fitOf = (sp: Species) => {
    if (role !== null) return { label: `${role} fit`, value: sp.fits[role] };
    const best = sp.bestRoles[0]!;
    return { label: `Best: ${best}`, value: sp.fits[best] };
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={s.sheet}>
        <header className={s.head}>
          <div>
            <p className="kicker">{role === null ? "Bench" : role}</p>
            <h2 id={titleId} className={s.title}>
              Pick for {slotLabel}
            </h2>
          </div>
          <div className={s.headActions}>
            {current !== null ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
                Clear slot
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => ref.current?.close()}
              aria-label="Close picker"
            >
              Close
            </button>
          </div>
        </header>

        <div className={s.filters}>
          <label className={s.search}>
            <span className="visually-hidden">Search by name</span>
            <input
              type="search"
              placeholder="Search by name or #"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className={s.genSelect}>
            <span className="visually-hidden">Filter by generation</span>
            <select
              value={gen ?? ""}
              onChange={(e) =>
                setGen(e.target.value === "" ? null : (Number(e.target.value) as Gen))
              }
            >
              <option value="">All gens</option>
              {gens.map((g) => (
                <option key={g} value={g}>
                  {genLabel(g)}
                </option>
              ))}
            </select>
          </label>
          <div className={s.types} role="group" aria-label="Filter by type">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${s.typeChip}`}
                aria-pressed={type === t}
                style={{ "--chip-type": `var(--type-${t})` } as CSSProperties}
                onClick={() => setType(type === t ? null : t)}
              >
                {typeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <p className={s.count} aria-live="polite">
          {matches.length === 0
            ? "No matches"
            : matches.length > PICKER_LIMIT
              ? `Showing ${PICKER_LIMIT} of ${matches.length}. Refine your search to see more.`
              : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
        </p>

        <ul className={s.list} aria-label="Species">
          {shown.map((sp) => {
            const at = onField.get(sp.id);
            const here = current === sp.id;
            const fit = showRatings ? fitOf(sp) : null;
            return (
              <li key={sp.id}>
                <button
                  type="button"
                  className={s.row}
                  disabled={here}
                  data-testid={`pick-${sp.id}`}
                  onClick={() => onPick(sp.id)}
                >
                  <PlayerImage dexId={sp.id} size={32} alt={sp.name} />
                  <span className={s.rowMain}>
                    <span className={s.rowName}>{sp.name}</span>
                    <span className={s.rowMeta}>
                      <span className="num">{dex(sp.id)}</span>
                      {sp.types.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </span>
                  </span>
                  {at !== undefined ? (
                    <span className={s.rowTag}>{here ? "In this slot" : `Swap with ${at}`}</span>
                  ) : null}
                  {fit !== null ? (
                    <span className={s.rowFit} data-testid={`fit-${sp.id}`}>
                      <span className={s.rowFitLabel}>{fit.label}</span>
                      <span className="num">{fit.value}</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
