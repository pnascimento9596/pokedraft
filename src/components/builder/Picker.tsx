"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { TYPES } from "@/data/pokedex";
import {
  FORMATIONS,
  SPECIES,
  eligibleSpecies,
  speciesById,
  type DraftState,
  type Gen,
  type PokemonType,
  type Role,
  type SlotRef,
  type Species,
  type SpeciesId,
} from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { genLabel, qualityScore, typeLabel, versusLabel } from "@/ui/labels";
import { ALL_REFS, valueAt } from "@/ui/lineup";
import { StatusNote } from "@/components/ui/primitives";
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

// The sheet owns one history entry while it is open, so the browser Back button (and the Android
// back gesture) closes it instead of leaving the page.
const SHEET_ENTRY = "pokedraftSheet";
// A downward drag on the sheet's header longer than this closes it.
const SWIPE_CLOSE_PX = 80;

function onSheetEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && SHEET_ENTRY in state;
}

interface Swipe {
  readonly pointerId: number;
  readonly y0: number;
}

export function Picker({ state, slot, showRatings, onPick, onClear, onClose }: PickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const rawFitId = useId();
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

  const [swipeY, setSwipeY] = useState(0);
  const swipe = useRef<Swipe | null>(null);
  // What to run once Back has removed the sheet's history entry: a pick, a clear or a close.
  const pending = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // On a touch screen the keyboard would open over the list; the search waits for a tap there.
    const fine =
      typeof window.matchMedia !== "function" || window.matchMedia("(pointer: fine)").matches;
    if (fine) searchRef.current?.focus();
    if (!onSheetEntry()) {
      window.history.pushState({ ...window.history.state, [SHEET_ENTRY]: true }, "");
    }
    const onPop = () => {
      const then = pending.current ?? onCloseRef.current;
      pending.current = null;
      then();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Every way out goes through here: drop the sheet's history entry first, then act, so the
  // builder's ?b= write lands on the page's own entry.
  const leave = (then: () => void) => {
    if (pending.current !== null) return;
    if (!onSheetEntry()) {
      then();
      return;
    }
    pending.current = then;
    window.history.back();
  };

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

  const filter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sp: Species) =>
      (q === "" || sp.name.toLowerCase().includes(q) || dex(sp.id).includes(q)) &&
      (type === null || (sp.types as readonly PokemonType[]).includes(type)) &&
      (gen === null || sp.gen === gen);
  }, [query, type, gen]);
  const matches = useMemo(() => candidates.filter(filter), [candidates, filter]);
  // The builder pool only drops species by generation or by the Legendaries switch.
  const hiddenBySettings = matches.length === 0 && SPECIES.some(filter);

  const shown = matches.slice(0, PICKER_LIMIT);

  // What a row shows with Show ratings on: where the player ranks for the slot's role among all
  // Pokémon (0 to 100, the engine's quality), and the raw fit as the row's description. A bench
  // slot has no role, so it rates the player at their best one.
  const ratingOf = (sp: Species) => {
    const rated: Role = role ?? sp.bestRoles[0]!;
    return {
      best: role === null ? rated : null,
      score: qualityScore(sp.quality[rated]),
      versus: versusLabel(rated),
      raw: `Raw fit ${sp.fits[rated]} of 100 for ${role === null ? rated : slotLabel}`,
    };
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      style={swipeY > 0 ? { transform: `translateY(${swipeY}px)` } : undefined}
      onClose={() => leave(onClose)}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={s.sheet}>
        <header
          className={s.head}
          onPointerDown={(e) => {
            if (e.button !== 0 || (e.target as Element).closest("button") !== null) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            swipe.current = { pointerId: e.pointerId, y0: e.clientY };
          }}
          onPointerMove={(e) => {
            if (swipe.current?.pointerId !== e.pointerId) return;
            setSwipeY(Math.max(0, e.clientY - swipe.current.y0));
          }}
          onPointerUp={(e) => {
            if (swipe.current?.pointerId !== e.pointerId) return;
            const moved = e.clientY - swipe.current.y0;
            swipe.current = null;
            if (moved > SWIPE_CLOSE_PX) ref.current?.close();
            else setSwipeY(0);
          }}
          onPointerCancel={() => {
            swipe.current = null;
            setSwipeY(0);
          }}
        >
          <span className={s.handle} data-testid="sheet-handle" aria-hidden="true" />
          <div className={s.titleBlock}>
            <p className="kicker">{role === null ? "Bench" : role}</p>
            <h2 id={titleId} className={s.title}>
              Pick for {slotLabel}
            </h2>
          </div>
          <div className={s.headActions}>
            {current !== null ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => leave(onClear)}
              >
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
              type="text"
              role="searchbox"
              inputMode="search"
              enterKeyHint="search"
              ref={searchRef}
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
                style={
                  {
                    "--chip-type": `var(--type-${t})`,
                    "--chip-ink": `var(--type-${t}-ink)`,
                  } as CSSProperties
                }
                onClick={() => setType(type === t ? null : t)}
              >
                {typeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <p className={s.count} aria-live="polite">
          {matches.length === 0
            ? hiddenBySettings
              ? "No matches. Your Generations or Legendaries setting hides some Pokémon."
              : "No matches"
            : matches.length > PICKER_LIMIT
              ? `Showing ${PICKER_LIMIT} of ${matches.length}. Refine your search to see more.`
              : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
        </p>

        {matches.length === 0 ? (
          <StatusNote title="No players found">
            {hiddenBySettings
              ? "Your Generations or Legendaries setting hides the matching players."
              : "No players match this search. Try another name or clear a filter."}
          </StatusNote>
        ) : null}
        <ul className={s.list} aria-label="Species">
          {shown.map((sp) => {
            const at = onField.get(sp.id);
            const here = current === sp.id;
            const rating = showRatings ? ratingOf(sp) : null;
            return (
              <li key={sp.id}>
                <button
                  type="button"
                  className={s.row}
                  disabled={here}
                  data-testid={`pick-${sp.id}`}
                  aria-describedby={rating !== null ? `${rawFitId}-${sp.id}` : undefined}
                  onClick={() => leave(() => onPick(sp.id))}
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
                  {rating !== null ? (
                    <span className={s.rowFit} data-testid={`fit-${sp.id}`}>
                      {rating.best !== null ? (
                        <>
                          <span className={s.rowFitLabel}>Best: {rating.best}</span>{" "}
                        </>
                      ) : null}
                      <span className="num">{rating.score}</span>{" "}
                      <span className={s.rowFitVs}>{rating.versus}</span>
                    </span>
                  ) : null}
                </button>
                {/* Outside the button, so the raw fit is a description and not part of its name. */}
                {rating !== null ? (
                  <span id={`${rawFitId}-${sp.id}`} className="visually-hidden">
                    {rating.raw}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
