import type { ReactNode } from "react";
import { FORMATIONS } from "@/engine/formations";
import type { FormationId, SynergyEdge } from "@/engine/types";
import { pitchPoints } from "@/design/stadium";
import s from "./Pitch.module.css";

export function Pitch3DStage({
  formation,
  edges,
  label,
  children,
}: {
  readonly formation: FormationId;
  readonly edges: readonly SynergyEdge[];
  readonly label: string;
  readonly children: ReactNode;
}) {
  const slots = FORMATIONS[formation].slots;
  const points = pitchPoints(slots);
  const at = new Map(slots.map((slot, i) => [slot.id, points[i]]));
  return (
    <div className={s.perspective}>
      <div className={s.field} role="group" aria-label={label} data-testid="pitch-stage">
        <svg
          className={s.lines}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="5" y="5" width="90" height="90" />
          <line x1="5" y1="50" x2="95" y2="50" />
          <g data-testid="pitch-pokeball-mark">
            <circle cx="50" cy="50" r="14" />
            <path d="M36 50 A14 14 0 0 1 64 50 Z" className={s.pokeballTop} />
            <circle cx="50" cy="50" r="4.5" className={s.pokeballRing} />
            <circle cx="50" cy="50" r="2" className={s.spot} />
          </g>
          <rect x="30" y="5" width="40" height="14" />
          <rect x="30" y="81" width="40" height="14" />
        </svg>
        <svg
          className={`${s.lines} ${s.chemistry}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g className={s.edges}>
            {edges.map((edge) => {
              const a = at.get(edge.a);
              const b = at.get(edge.b);
              return a && b ? (
                <line
                  key={`${edge.a}-${edge.b}`}
                  data-chemistry={`${edge.a}-${edge.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  style={{ strokeOpacity: 0.35 + 0.6 * Math.min(1, edge.value) }}
                />
              ) : null;
            })}
          </g>
        </svg>
        {children}
      </div>
    </div>
  );
}
