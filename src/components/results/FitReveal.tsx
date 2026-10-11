import { FORMATIONS, speciesById, type FormationId, type TeamRating } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { SCOUTING } from "@/scouting/scouting-data";
import { ROLE_PLURAL, qualityScore, tagLabel, versusLabel } from "@/ui/labels";
import s from "./FitReveal.module.css";

const RATIONALE = new Map(SCOUTING.map((r) => [r.id, r.rationale]));

// The big number is the engine's quality for the slot's role (where this Pokémon ranks among all
// of them for that job), the same quantity that picks the three Weak spot tags. The raw fit sits
// inside Scouting notes.
export function FitReveal({ formation, rating }: { formation: FormationId; rating: TeamRating }) {
  const slots = FORMATIONS[formation].slots;
  return (
    <ol className={s.list} aria-label="Rating per slot">
      {rating.slots.map((r, i) => {
        const species = speciesById(r.species);
        const slotLabel = slots[i]!.label;
        const weak = rating.weakest.includes(r.slot);
        const rationale = RATIONALE.get(species.id);
        const score = qualityScore(r.quality);
        return (
          <li
            key={r.slot}
            className={s.row}
            data-weak={weak || undefined}
            data-testid={`fit-${r.slot}`}
          >
            <div className={s.top}>
              <span className={s.slot}>{slotLabel}</span>
              <PlayerImage dexId={species.id} size={36} alt={species.name} />
              <span className={s.name}>
                {species.name}
                {r.familiarity < 1 ? <span className={s.oop}>Out of position</span> : null}
                {weak ? <span className={s.weakTag}>Weak spot</span> : null}
              </span>
              <span className={s.fit} aria-hidden="true">
                {score}
              </span>
              <span className={s.fitLabel} aria-hidden="true">
                {versusLabel(r.role)}
              </span>
              <span className="visually-hidden">
                Quality {score}, better than about {score} of every 100 other {ROLE_PLURAL[r.role]}
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
            <details className={s.why}>
              <summary>Scouting notes</summary>
              <p className={s.raw}>
                Raw fit {r.fit} of 100 for {slotLabel}
              </p>
              {rationale !== undefined ? <p>{rationale}</p> : null}
            </details>
          </li>
        );
      })}
    </ol>
  );
}
