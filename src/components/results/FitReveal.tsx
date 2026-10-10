import { FORMATIONS, speciesById, type FormationId, type TeamRating } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { SCOUTING } from "@/scouting/scouting-data";
import { tagLabel } from "@/ui/labels";
import s from "./FitReveal.module.css";

const RATIONALE = new Map(SCOUTING.map((r) => [r.id, r.rationale]));

export function FitReveal({ formation, rating }: { formation: FormationId; rating: TeamRating }) {
  const slots = FORMATIONS[formation].slots;
  return (
    <ol className={s.list} aria-label="Fit per slot">
      {rating.slots.map((r, i) => {
        const species = speciesById(r.species);
        const weak = rating.weakest.includes(r.slot);
        const rationale = RATIONALE.get(species.id);
        return (
          <li
            key={r.slot}
            className={s.row}
            data-weak={weak || undefined}
            data-testid={`fit-${r.slot}`}
          >
            <div className={s.top}>
              <span className={s.slot}>{slots[i]!.label}</span>
              <PlayerImage dexId={species.id} size={36} alt={species.name} />
              <span className={s.name}>
                {species.name}
                {r.familiarity < 1 ? <span className={s.oop}>Out of position</span> : null}
                {weak ? <span className={s.weakTag}>Weak spot</span> : null}
              </span>
              <span className={s.fit} aria-label={`Fit ${r.fit}`}>
                {r.fit}
              </span>
            </div>
            <div className={s.tags}>
              {species.strengths.map((t) => (
                <span key={t} className={s.plus}>
                  + {tagLabel(t)}
                </span>
              ))}
              {species.weaknesses.map((t) => (
                <span key={t} className={s.minus}>
                  - {tagLabel(t)}
                </span>
              ))}
            </div>
            {rationale !== undefined ? (
              <details className={s.why}>
                <summary>Scouting notes</summary>
                <p>{rationale}</p>
              </details>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
