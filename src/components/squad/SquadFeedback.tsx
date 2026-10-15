import type { Lineup, Species, SpeciesId } from "@/engine/types";
import type { PartialLineRating } from "@/ui/partial-rating";
import { ALL_REFS, refKey, slotLabel, valueAt } from "@/ui/lineup";
import s from "./SquadFeedback.module.css";

export function SquadFeedback({
  lineup,
  speciesOf,
  lines,
  onScout,
}: {
  readonly lineup: Lineup;
  readonly speciesOf: (id: SpeciesId) => Species;
  readonly lines?: readonly PartialLineRating[];
  readonly onScout: (id: SpeciesId) => void;
}) {
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
