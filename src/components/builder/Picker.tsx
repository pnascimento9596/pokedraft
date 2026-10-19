"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { TYPES } from "@/data/pokedex";
import {
  FORMATIONS,
  applyAction,
  SPECIES,
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
import { ScoutingDossier } from "@/components/scouting/ScoutingDossier";
import { TypeChip } from "@/components/TypeChip";
import { genLabel, SUITABILITY_LABEL, typeLabel } from "@/ui/labels";
import { ALL_REFS, valueAt } from "@/ui/lineup";
import { ratingFor } from "@/ui/rating";
import { getSlotSuitability } from "@/ui/suitability";
import { StatusNote } from "@/components/ui/primitives";
import s from "./Picker.module.css";

export const PICKER_LIMIT = 120;

export type PickerSort = "dex" | "rating" | "fit" | "pac" | "sho" | "pas" | "def" | "phy";

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
  const [sortBy, setSortBy] = useState<PickerSort>("dex");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [inspectId, setInspectId] = useState<SpeciesId | null>(null);

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
      (gen === null || sp.gen === gen) &&
      (!recommendedOnly ||
        (role !== null
          ? sp.bestRoles.includes(role)
          : getSlotSuitability(sp, lineup.formation, slot) === "recommended"));
  }, [query, type, gen, recommendedOnly, role, lineup.formation, slot]);
  const matches = useMemo(() => {
    const list = candidates.filter(filter);
    if (sortBy === "dex") return list;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "rating": {
          const scoreA = ratingFor(a, role, slotLabel).score;
          const scoreB = ratingFor(b, role, slotLabel).score;
          return scoreB - scoreA || a.id - b.id;
        }
        case "fit": {
          const fitA =
            role !== null ? a.fits[role] : Math.max(...a.bestRoles.map((r) => a.fits[r]));
          const fitB =
            role !== null ? b.fits[role] : Math.max(...b.bestRoles.map((r) => b.fits[r]));
          return fitB - fitA || a.id - b.id;
        }
        case "pac":
          return b.attrs.PAC - a.attrs.PAC || a.id - b.id;
        case "sho":
          return b.attrs.SHO - a.attrs.SHO || a.id - b.id;
        case "pas":
          return b.attrs.PAS - a.attrs.PAS || a.id - b.id;
        case "def":
          return b.attrs.DEF - a.attrs.DEF || a.id - b.id;
        case "phy":
          return b.attrs.PHY - a.attrs.PHY || a.id - b.id;
      }
    });
  }, [candidates, filter, sortBy, role, slotLabel]);
  // The builder pool only drops species by generation or by the Legendaries switch.
  const hiddenBySettings = matches.length === 0 && SPECIES.some(filter);

  const [typesExpanded, setTypesExpanded] = useState(false);
  const [extraPages, setExtraPages] = useState(0);
  const filterKey = `${query}|${type ?? ""}|${gen ?? ""}|${sortBy}|${recommendedOnly}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setExtraPages(0);
  }

  const displayLimit = PICKER_LIMIT + extraPages * PICKER_LIMIT;
  const shown = matches.slice(0, displayLimit);

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
                aria-label="Clear slot"
                onClick={() => leave(onClear)}
              >
                <span className={s.wideOnly}>Clear slot</span>
                <span className={s.narrowOnly}>Clear</span>
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
          <div className={s.typesHeader}>
            <button
              type="button"
              className={`btn btn--ghost btn--sm ${s.typesToggle}`}
              aria-expanded={typesExpanded}
              onClick={() => setTypesExpanded((v) => !v)}
            >
              {type !== null ? (
                `Type: ${typeLabel(type)}`
              ) : (
                <>
                  <span className={s.wideOnly}>Filter by type (18)</span>
                  <span className={s.narrowOnly}>Type (18)</span>
                </>
              )}
              <span aria-hidden="true">{typesExpanded ? " ▲" : " ▼"}</span>
            </button>
            <div className={s.sortControls}>
              {role !== null ? (
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm ${s.recToggle}`}
                  data-testid="picker-recommended"
                  aria-pressed={recommendedOnly}
                  aria-label={`Best for ${role}`}
                  onClick={() => setRecommendedOnly((v) => !v)}
                >
                  <span className={s.wideOnly}>★ Best for {role}</span>
                  <span className={s.narrowOnly}>★</span>
                </button>
              ) : null}
              <label className={s.sortSelect}>
                <span className="visually-hidden">Sort players</span>
                <select
                  data-testid="picker-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as PickerSort)}
                >
                  <option value="dex">Sort: #Dex</option>
                  {showRatings ? (
                    <>
                      <option value="rating">Sort: role rating</option>
                      <option value="fit">Sort: raw fit</option>
                      <option value="pac">Sort: Pace (PAC)</option>
                      <option value="sho">Sort: Shooting (SHO)</option>
                      <option value="pas">Sort: Passing (PAS)</option>
                      <option value="def">Sort: Defense (DEF)</option>
                      <option value="phy">Sort: Physical (PHY)</option>
                    </>
                  ) : null}
                </select>
              </label>
              {type !== null && (
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm ${s.clearType}`}
                  onClick={() => setType(null)}
                >
                  Clear type
                </button>
              )}
            </div>
          </div>
          <div
            className={s.types}
            role="group"
            aria-label="Filter by type"
            data-expanded={typesExpanded}
          >
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

        <div className={s.countBar}>
          <p className={s.count} aria-live="polite">
            {matches.length === 0
              ? hiddenBySettings
                ? "No matches. Your Generations or Legendaries setting hides some Pokémon."
                : "No matches"
              : matches.length > displayLimit
                ? `Showing ${displayLimit} of ${matches.length}.`
                : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
          </p>
          {(query !== "" || type !== null || gen !== null || recommendedOnly) && (
            <button
              type="button"
              className={`btn btn--ghost btn--sm ${s.clearFilters}`}
              onClick={() => {
                setQuery("");
                setType(null);
                setGen(null);
                setRecommendedOnly(false);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

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
            const source =
              at !== undefined ? ALL_REFS.find((ref) => valueAt(lineup, ref) === sp.id) : undefined;
            const swapFit =
              source && current !== null && current !== sp.id
                ? `${sp.name} to ${slotLabel}: ${SUITABILITY_LABEL[getSlotSuitability(sp, lineup.formation, slot)]} fit. ${speciesById(current).name} to ${at}: ${SUITABILITY_LABEL[getSlotSuitability(speciesById(current), lineup.formation, source)]} fit.`
                : null;
            const here = current === sp.id;
            const rating = showRatings ? ratingFor(sp, role, slotLabel) : null;
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
                  <PlayerImage dexId={sp.id} size={44} alt={sp.name} />
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
                <div className={s.rowActions}>
                  {swapFit ? (
                    <p className={s.swapFit} aria-label={`Swap suitability for ${sp.name}`}>
                      {swapFit}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className={`btn btn--ghost btn--sm ${s.scoutBtn}`}
                    data-testid={`inspect-${sp.id}`}
                    aria-label={`Scout ${sp.name}`}
                    onClick={() => setInspectId(sp.id)}
                  >
                    Scout {sp.name}
                  </button>
                </div>
              </li>
            );
          })}
          {matches.length > displayLimit ? (
            <li className={s.loadMoreWrap}>
              <button
                type="button"
                className={`btn btn--ghost ${s.loadMore}`}
                onClick={() => setExtraPages((p) => p + 1)}
              >
                Load more ({matches.length - displayLimit} remaining)
              </button>
            </li>
          ) : null}
        </ul>
      </div>
      {inspectId !== null ? (
        <ScoutingDossier
          speciesId={inspectId}
          compareTo={current !== null && current !== inspectId ? speciesById(current) : undefined}
          showRatings={showRatings}
          slotContext={{
            slot,
            lineup,
            candidateLineup: applyAction(state, { type: "place", species: inspectId, slot }).lineup,
          }}
          onClose={() => setInspectId(null)}
        />
      ) : null}
    </dialog>
  );
}
