import { useState } from "react";
import { FORMATIONS } from "@/engine/formations";
import { SYNERGY_REASON_LABEL } from "@/ui/partial-rating";
import type { Lineup, Species, SpeciesId, SynergyEdge, SynergyReason } from "@/engine/types";
import type { PartialLineRating } from "@/ui/partial-rating";
import { ALL_REFS, refKey, slotLabel, valueAt } from "@/ui/lineup";
import s from "./SquadFeedback.module.css";

export function SquadFeedback({
  lineup,
  speciesOf,
  lines,
  edges,
  onScout,
}: {
  readonly lineup: Lineup;
  readonly speciesOf: (id: SpeciesId) => Species;
  readonly lines?: readonly PartialLineRating[];
  readonly edges: readonly SynergyEdge[];
  readonly onScout: (id: SpeciesId) => void;
}) {
  const [reason, setReason] = useState<SynergyReason | null>(null);
  const slots = FORMATIONS[lineup.formation].slots;
  const starters = new Map(
    slots.flatMap((slot, index) => {
      const id = lineup.starters[index];
      return id === null ? [] : [[slot.id, { label: slot.label, species: speciesOf(id) }] as const];
    }),
  );
  const links = edges.flatMap((edge) => {
    const a = starters.get(edge.a);
    const b = starters.get(edge.b);
    return a && b ? [{ edge, a, b }] : [];
  });
  const visibleLinks = links.filter(({ edge }) => reason === null || edge.reasons.includes(reason));
  const reasons = Object.keys(SYNERGY_REASON_LABEL) as SynergyReason[];
  const occupied = ALL_REFS.flatMap((ref) => {
    const id = valueAt(lineup, ref);
    return id === null ? [] : [{ ref, species: speciesOf(id) }];
  });
  return (
    <div className={s.feedback}>
      {lines ? (
        <div data-testid="live-lines" aria-label="Current line strength">
          <p className={s.lines}>
            {lines.map(({ line, filled, total, strength }) => (
              <span key={line}>
                {line} {filled}/{total} · {strength === null ? "Unrated" : Math.round(strength)}
              </span>
            ))}
          </p>
          <p className={s.note}>
            Current starters only. Line strength is 0 to 100; empty positions are excluded.
          </p>
        </div>
      ) : null}
      <details>
        <summary>Chemistry links ({links.length})</summary>
        <p className={s.note}>
          Current adjacent starters only. Bench players do not form chemistry links.
        </p>
        {links.length === 0 ? (
          <p className={s.note}>
            No adjacent starters yet. Place players in connected positions to inspect their links.
          </p>
        ) : (
          <>
            <div className={s.filters} role="group" aria-label="Filter chemistry links by reason">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-pressed={reason === null}
                onClick={() => setReason(null)}
              >
                All links
              </button>
              {reasons.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-pressed={reason === item}
                  onClick={() => setReason(item)}
                >
                  {SYNERGY_REASON_LABEL[item]}
                </button>
              ))}
            </div>
            <div aria-live="polite" aria-atomic="true">
              {visibleLinks.length === 0 ? (
                <p className={s.note}>No current links match this reason.</p>
              ) : (
                <ul className={s.links}>
                  {visibleLinks.map(({ edge, a, b }) => (
                    <li key={`${edge.a}:${edge.b}`}>
                      <span>
                        {a.species.name} ({a.label}) + {b.species.name} ({b.label})
                      </span>
                      <span className={s.reasons}>
                        {edge.reasons.length === 0
                          ? "No chemistry bonus"
                          : edge.reasons.map((item) => SYNERGY_REASON_LABEL[item]).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </details>
      {occupied.length > 0 ? (
        <details>
          <summary>Scout squad ({occupied.length})</summary>
          <div className={s.scouts}>
            {occupied.map(({ ref, species }) => (
              <button
                key={refKey(ref)}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onScout(species.id)}
              >
                Scout {species.name} at {slotLabel(lineup, ref)}
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
