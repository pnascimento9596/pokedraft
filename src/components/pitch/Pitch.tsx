"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  FORMATIONS,
  speciesById,
  type FormationId,
  type Lineup,
  type SlotId,
  type SlotRef,
  type SynergyEdge,
} from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { useImageSettings } from "@/images/settings";
import { BENCH_REFS, STARTER_REFS, refFromKey, refKey, sameRef, valueAt } from "@/ui/lineup";
import s from "./Pitch.module.css";

export interface PitchProps {
  readonly formation: FormationId;
  readonly lineup: Lineup;
  readonly onSlotTap?: (ref: SlotRef) => void;
  /** Enables drag-to-swap between filled tokens (pointer events, works on touch). */
  readonly onSwap?: (a: SlotRef, b: SlotRef) => void;
  /** Extra line under a filled token, e.g. a fit number in sighted mode. */
  readonly tokenNote?: (ref: SlotRef) => ReactNode;
  readonly highlight?: SlotRef | null;
  readonly isSlotDisabled?: (ref: SlotRef) => boolean;
  readonly edges?: readonly SynergyEdge[];
  readonly weakest?: readonly SlotId[];
  readonly showBench?: boolean;
  readonly label?: string;
}

const W = 68;
const L = 105;
const HORIZONTAL = "matrix(0 1 -1 0 105 0)";

function vx(x: number): number {
  return (x / 100) * W;
}
function vy(y: number): number {
  return L - (y / 100) * L;
}

function Markings({ formation, edges }: { formation: FormationId; edges: readonly SynergyEdge[] }) {
  const slots = FORMATIONS[formation].slots;
  const at = new Map(slots.map((sl) => [sl.id, sl]));
  const box = (top: boolean) => {
    const y0 = top ? 0 : L;
    const dir = top ? 1 : -1;
    return (
      <g key={top ? "t" : "b"}>
        <rect x={(W - 40.32) / 2} y={top ? 0 : L - 16.5} width={40.32} height={16.5} />
        <rect x={(W - 18.32) / 2} y={top ? 0 : L - 5.5} width={18.32} height={5.5} />
        <circle cx={W / 2} cy={y0 + dir * 11} r={0.45} className={s.spot} />
        <path
          d={`M ${W / 2 - 7.3} ${y0 + dir * 16.5} A 9.15 9.15 0 0 ${top ? 0 : 1} ${W / 2 + 7.3} ${y0 + dir * 16.5}`}
        />
        <rect x={(W - 7.32) / 2} y={top ? -2.2 : L} width={7.32} height={2.2} className={s.goal} />
      </g>
    );
  };
  return (
    <>
      <rect x={0} y={0} width={W} height={L} />
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} />
      <circle cx={W / 2} cy={L / 2} r={9.15} />
      <circle cx={W / 2} cy={L / 2} r={0.45} className={s.spot} />
      {box(true)}
      {box(false)}
      <g className={s.edges}>
        {edges.map((e) => {
          const a = at.get(e.a);
          const b = at.get(e.b);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.a}-${e.b}`}
              x1={vx(a.x)}
              y1={vy(a.y)}
              x2={vx(b.x)}
              y2={vy(b.y)}
              style={{ strokeOpacity: 0.35 + 0.6 * Math.min(1, e.value) }}
            />
          );
        })}
      </g>
    </>
  );
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
  onSlotTap,
  onSwap,
  tokenNote,
  highlight = null,
  isSlotDisabled,
  edges = [],
  weakest = [],
  showBench = true,
  label = "Pitch",
}: PitchProps) {
  const slots = FORMATIONS[formation].slots;
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
    const species = id === null ? null : speciesById(id);
    const key = refKey(ref);
    const disabled = isSlotDisabled?.(ref) ?? false;
    const slotId = ref.kind === "starter" ? slots[ref.index]!.id : null;
    const weak = slotId !== null && weakest.includes(slotId);
    const dragging = drag !== null && sameRef(drag.from, ref) && drag.moved;
    const draggable = onSwap !== undefined && species !== null && !disabled;
    const name = species === null ? `Empty ${slotLabel} slot` : `${species.name}, ${slotLabel}`;
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
        data-weak={weak || undefined}
        data-drop={dropKey === key || undefined}
        data-dragging={dragging || undefined}
        disabled={disabled || (onSlotTap === undefined && onSwap === undefined)}
        aria-label={name}
        style={{
          ...style,
          ...(dragging ? { translate: `${drag.dx}px ${drag.dy}px` } : null),
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onSlotTap?.(ref);
        }}
        onPointerDown={(e) => {
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
        <span className={s.tokenImage}>
          {species === null ? (
            <span className={s.tokenEmpty} aria-hidden="true">
              +
            </span>
          ) : (
            <PlayerImage dexId={species.id} size={36} alt={species.name} />
          )}
        </span>
        <span className={s.tokenSlot}>{slotLabel}</span>
        {species !== null ? <span className={s.tokenName}>{species.name}</span> : null}
        {species !== null && tokenNote ? (
          <span className={s.tokenNote}>{tokenNote(ref)}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className={s.wrap} data-testid="pitch" data-mirror={mirror ? "on" : "off"}>
      <div className={s.field} role="group" aria-label={label}>
        <svg className={`${s.lines} ${s.vertical}`} viewBox={`0 0 ${W} ${L}`} aria-hidden="true">
          <Markings formation={formation} edges={edges} />
        </svg>
        <svg className={`${s.lines} ${s.horizontal}`} viewBox={`0 0 ${L} ${W}`} aria-hidden="true">
          <g transform={HORIZONTAL}>
            <Markings formation={formation} edges={edges} />
          </g>
        </svg>
        {STARTER_REFS.map((ref, i) => {
          const sl = slots[i]!;
          return token(ref, sl.label, { "--x": sl.x, "--y": sl.y } as CSSProperties, sl);
        })}
      </div>
      {showBench ? (
        <div className={s.bench} role="group" aria-label="Bench">
          <span className={`kicker ${s.benchLabel}`}>Bench</span>
          <div className={s.benchRow}>{BENCH_REFS.map((ref, i) => token(ref, `SUB ${i + 1}`))}</div>
        </div>
      ) : null}
    </div>
  );
}
