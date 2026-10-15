"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FORMATIONS } from "@/engine/formations";
import type {
  FormationId,
  Lineup,
  SlotId,
  SlotRef,
  Species,
  SpeciesId,
  SynergyEdge,
} from "@/engine/types";
import { PitchCard } from "./PitchCard";
import { Pitch3DStage } from "./Pitch3DStage";
import { CARD_ROLE, pitchPoints, typeFrame } from "@/design/stadium";
import { useImageSettings } from "@/images/settings";
import { BENCH_REFS, STARTER_REFS, refFromKey, refKey, sameRef, valueAt } from "@/ui/lineup";
import s from "./Pitch.module.css";

export interface PitchProps {
  readonly formation: FormationId;
  readonly lineup: Lineup;
  /** Looks up a filled slot's species. The pitch never imports the species data itself, so the
   *  builder can draw an empty lineup before that data has loaded. */
  readonly speciesOf: (id: SpeciesId) => Species;
  readonly onSlotTap?: (ref: SlotRef) => void;
  /** Enables drag-to-swap between filled tokens (pointer events, works on touch). */
  readonly onSwap?: (a: SlotRef, b: SlotRef) => void;
  /** Extra line under a filled token, e.g. a fit number in sighted mode. */
  readonly tokenNote?: (ref: SlotRef, id: string) => ReactNode;
  readonly highlight?: SlotRef | null;
  /** The player picked for a tap swap. Passing it (even null) makes filled tokens toggle buttons. */
  readonly selected?: SlotRef | null;
  readonly isSlotDisabled?: (ref: SlotRef) => boolean;
  readonly edges?: readonly SynergyEdge[];
  readonly previewEdges?: readonly SynergyEdge[];
  readonly weakest?: readonly SlotId[];
  readonly showBench?: boolean;
  readonly label?: string;
  /** The draft screen: on phones the field takes the height it is given instead of its own. */
  readonly fit?: boolean;
  readonly compactTags?: boolean;
  readonly suitabilityOf?: (ref: SlotRef) => "recommended" | "ok" | "bad" | null;
  readonly dropTarget?: SlotRef | null;
}

interface DragState {
  readonly from: SlotRef;
  readonly pointerId: number;
  readonly x0: number;
  readonly y0: number;
  readonly dx: number;
  readonly dy: number;
  readonly moved: boolean;
}

const DRAG_THRESHOLD = 6;

export function Pitch({
  formation,
  lineup,
  speciesOf,
  onSlotTap,
  onSwap,
  tokenNote,
  highlight = null,
  selected,
  isSlotDisabled,
  edges = [],
  previewEdges = [],
  weakest = [],
  showBench = true,
  label = "Pitch",
  fit = false,
  compactTags = false,
  suitabilityOf,
  dropTarget = null,
}: PitchProps) {
  const labelId = useId();
  const slots = FORMATIONS[formation].slots;
  const points = pitchPoints(slots);
  const { mirror } = useImageSettings();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const suppressClick = useRef(false);

  const keyUnder = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot-key]");
    return el?.dataset.slotKey ?? null;
  };

  const token = (
    ref: SlotRef,
    slotLabel: string,
    style?: CSSProperties,
    at?: { readonly x: number; readonly y: number },
  ) => {
    const id = valueAt(lineup, ref);
    const species = id === null ? null : speciesOf(id);
    const key = refKey(ref);
    const disabled = isSlotDisabled?.(ref) ?? false;
    const slotId = ref.kind === "starter" ? slots[ref.index]!.id : null;
    const weak = slotId !== null && weakest.includes(slotId);
    const dragging = drag !== null && sameRef(drag.from, ref) && drag.moved;
    const draggable = onSwap !== undefined && species !== null && !disabled;
    const suitability = species === null ? (suitabilityOf?.(ref) ?? null) : null;
    const isDropTarget = dropKey === key || sameRef(dropTarget, ref);
    const name =
      species === null
        ? `Empty ${slotLabel} slot${suitability ? ` (${suitability} fit)` : ""}`
        : `${slotLabel} ${species.name}`;
    return (
      <button
        key={key}
        type="button"
        className={s.token}
        data-slot-key={key}
        // Which half of the field the token sits in, per layout, so CSS can face it to the center.
        data-half-portrait={at !== undefined && at.x > 50 ? "right" : undefined}
        data-half-landscape={at !== undefined && at.y > 50 ? "right" : undefined}
        data-testid={`slot-${key}`}
        data-filled={species !== null}
        data-highlight={sameRef(highlight, ref) || undefined}
        data-suitability={suitability || undefined}
        aria-pressed={
          selected === undefined || species === null ? undefined : sameRef(selected, ref)
        }
        data-weak={weak || undefined}
        data-drop={isDropTarget || undefined}
        data-dragging={dragging || undefined}
        disabled={disabled || (onSlotTap === undefined && onSwap === undefined)}
        id={`${labelId}-${key}`}
        aria-label={name}
        aria-labelledby={
          species === null
            ? `${labelId}-${key} ${labelId}-${key}-role ${labelId}-${key}-slot ${labelId}-${key}-prompt`
            : `${labelId}-${key} ${labelId}-${key}-role ${labelId}-${key}-slot${tokenNote ? ` ${labelId}-${key}-note-score` : ""} ${labelId}-${key}-name ${labelId}-${key}-types`
        }
        aria-describedby={
          species !== null && tokenNote ? `${labelId}-${key}-note-label` : undefined
        }
        style={{
          ...style,
          ...(species ? typeFrame(species.types[0]) : null),
          ...(dragging ? { translate: `${drag.dx}px ${drag.dy}px` } : null),
        }}
        onClick={(e) => {
          // A mouse drag ends with a click on the dragged token, which must not also open it. A
          // touch drag ends with none, so the flag also clears on the next press, and a keyboard
          // click (detail 0) is never a drag's.
          const dragEnd = suppressClick.current && e.detail !== 0;
          suppressClick.current = false;
          if (!dragEnd) onSlotTap?.(ref);
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={(e) => {
          suppressClick.current = false;
          if (!draggable || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({
            from: ref,
            pointerId: e.pointerId,
            x0: e.clientX,
            y0: e.clientY,
            dx: 0,
            dy: 0,
            moved: false,
          });
        }}
        onPointerMove={(e) => {
          if (drag === null || drag.pointerId !== e.pointerId) return;
          const dx = e.clientX - drag.x0;
          const dy = e.clientY - drag.y0;
          const moved = drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD;
          setDrag({ ...drag, dx, dy, moved });
          if (moved) {
            const under = keyUnder(e.clientX, e.clientY);
            setDropKey(under !== null && under !== refKey(drag.from) ? under : null);
          }
        }}
        onPointerUp={(e) => {
          if (drag === null || drag.pointerId !== e.pointerId) return;
          if (drag.moved) {
            suppressClick.current = true;
            const target = refFromKey(keyUnder(e.clientX, e.clientY) ?? "");
            const targetDisabled = target !== null && (isSlotDisabled?.(target) ?? false);
            if (target !== null && !sameRef(target, drag.from) && !targetDisabled) {
              onSwap?.(drag.from, target);
            }
          }
          setDrag(null);
          setDropKey(null);
        }}
        onPointerCancel={() => {
          setDrag(null);
          setDropKey(null);
        }}
      >
        <PitchCard
          species={species}
          slotLabel={slotLabel}
          role={ref.kind === "starter" ? CARD_ROLE[slots[ref.index].role] : "SUB"}
          note={species !== null ? tokenNote?.(ref, `${labelId}-${key}-note`) : undefined}
          suitability={suitability}
          id={`${labelId}-${key}`}
        />
      </button>
    );
  };

  return (
    <div
      className={s.wrap}
      data-testid="pitch"
      data-mirror={mirror ? "on" : "off"}
      data-fit={fit || undefined}
      data-compact-tags={compactTags || undefined}
    >
      <Pitch3DStage formation={formation} edges={edges} previewEdges={previewEdges} label={label}>
        {STARTER_REFS.map((ref, i) => {
          const sl = slots[i]!;
          const point = points[i];
          return token(ref, sl.label, { left: `${point.x}%`, top: `${point.y}%` }, sl);
        })}
      </Pitch3DStage>
      {showBench ? (
        <div className={s.bench} role="group" aria-label="Bench">
          <span className={`kicker ${s.benchLabel}`}>
            Bench ({lineup.bench.filter((id) => id !== null).length}/5)
          </span>
          <div className={s.benchRow}>{BENCH_REFS.map((ref, i) => token(ref, `SUB ${i + 1}`))}</div>
        </div>
      ) : null}
    </div>
  );
}
