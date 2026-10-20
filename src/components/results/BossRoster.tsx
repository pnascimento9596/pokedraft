import { FORMATIONS, speciesById, type Opponent } from "@/engine";
import { clubRegion } from "@/ui/club-identity";
import { PlayerImage } from "@/components/PlayerImage";
import { opponentRefLabel } from "./format";
import s from "./BossRoster.module.css";

/** `eager` loads the pictures even while the list is closed, so the match that follows has them. */
export function BossRoster({
  opponent,
  eager = false,
}: {
  readonly opponent: Opponent;
  readonly eager?: boolean;
}) {
  const region = clubRegion(opponent.id);
  const pokemon = opponent.roster.flatMap((ref) =>
    ref.kind === "species" ? [speciesById(ref.id)] : [],
  );
  const hasPokemonXI = pokemon.length === 11 && pokemon.length === opponent.roster.length;
  const formation = opponent.formation === undefined ? undefined : FORMATIONS[opponent.formation];
  const sharedTypes = hasPokemonXI
    ? pokemon[0]!.types.filter((type) => pokemon.every((species) => species.types.includes(type)))
    : [];
  return (
    <details className={s.roster}>
      <summary>{hasPokemonXI ? "Boss XI" : "Opponent shirts"}</summary>
      {region !== undefined ? <p className={s.identity}>{region} region</p> : null}
      {hasPokemonXI ? (
        <p className={s.identity}>
          {formation !== undefined ? <span>{formation.id}</span> : null}
          {opponent.tacticalStyle !== undefined ? (
            <span>
              {opponent.tacticalStyle[0]!.toUpperCase() + opponent.tacticalStyle.slice(1)} style
            </span>
          ) : null}
          {opponent.captain !== undefined ? (
            <span>Captain: {opponentRefLabel(opponent.captain)}</span>
          ) : null}
          {sharedTypes.map((type) => (
            <span key={type}>{type[0]!.toUpperCase() + type.slice(1)} theme</span>
          ))}
        </p>
      ) : (
        <p className={s.retained}>
          Retained run: this engine recorded shirt numbers, without Pokémon identities or a
          formation.
        </p>
      )}
      <ol className={s.players} aria-label={`${opponent.name} starting eleven`}>
        {opponent.roster.map((ref, index) => (
          <li key={index} className={s.player}>
            {hasPokemonXI && formation !== undefined ? (
              <span className={s.role}>{formation.slots[index]!.label}</span>
            ) : null}
            {ref.kind === "species" ? (
              <PlayerImage dexId={ref.id} size={36} alt="" eager={eager} />
            ) : null}
            <span className={s.name}>{opponentRefLabel(ref)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
