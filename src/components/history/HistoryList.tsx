"use client";

import Link from "next/link";
import { useState } from "react";
import { POKEDEX, pokedexById } from "@/data/pokedex";
import { challengeHref } from "@/ui/challenge-href";
import { exhibitionHref, squadFromToken } from "@/ui/exhibition-route";
import { careerSummary } from "@/ui/career";
import { PlayerImage } from "@/components/PlayerImage";
import { StatusNote } from "@/components/ui/primitives";
import { FINISH_LABEL, record } from "@/ui/labels";
import { BUCKET_LABEL, HISTORY_LIMIT } from "@/ui/runs";
import { useSavedRuns } from "./store";
import s from "./HistoryList.module.css";

function when(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function RowActions({
  challenge,
  exhibition,
  label,
}: {
  readonly challenge: string | null;
  readonly exhibition: string | null;
  readonly label: string;
}) {
  if (challenge === null && exhibition === null) return null;
  return (
    <div className={s.rowActions}>
      {challenge !== null ? (
        <Link
          className={`btn btn--ghost ${s.challenge}`}
          href={challenge}
          aria-label={`Challenge this Seed: ${label}`}
        >
          Challenge this Seed
        </Link>
      ) : null}
      {exhibition !== null ? (
        <Link
          className={`btn btn--ghost ${s.challenge}`}
          href={exhibition}
          aria-label={`Exhibition vs this squad: ${label}`}
        >
          Exhibition vs this squad
        </Link>
      ) : null}
    </div>
  );
}

export function HistoryList() {
  const saved = useSavedRuns();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // Null until the player picks one: the Hall then opens on the drafted species, or on every
  // species when no stored run has a squad, so a new player never lands on an empty grid.
  const [pickedFilter, setSpeciesFilter] = useState<"all" | "drafted" | "champions" | null>(null);
  const [filter, setFilter] = useState<"all" | "champions">("all");

  if (saved === null) return <p className="kicker">Loading your runs</p>;
  const { runs, lifetime } = saved;
  if (runs.length === 0) {
    return (
      <StatusNote className={s.empty} title="No runs yet." data-testid="history-empty">
        <span>Finished runs on this device show up here.</span>
        <Link href="/" className="btn btn--primary">
          Start a run
        </Link>
      </StatusNote>
    );
  }
  const career = careerSummary(runs, lifetime);
  const speciesFilter = pickedFilter ?? (career.species.size > 0 ? "drafted" : "all");
  const matchingSpecies = POKEDEX.filter((pokemon) => {
    const counts = career.species.get(pokemon.id);
    return (
      (pokemon.name.toLowerCase().includes(search.toLowerCase()) ||
        String(pokemon.id) === search) &&
      (speciesFilter === "all" ||
        (speciesFilter === "drafted" ? (counts?.drafted ?? 0) > 0 : (counts?.champion ?? 0) > 0))
    );
  });
  const speciesPage = matchingSpecies.slice(page * 30, (page + 1) * 30);
  const ranked = runs.filter((r) => !r.friendly && r.bucket !== "builder");
  const bestScore = ranked.reduce<number | null>(
    (best, r) => (best === null ? r.score : Math.max(best, r.score)),
    null,
  );
  const metrics = [
    { label: "Total ranked runs", value: ranked.length },
    { label: "Ranked cups won", value: ranked.filter((r) => r.finish === "champion").length },
    { label: "Ranked flawless finishes", value: ranked.filter((r) => r.flawless).length },
    { label: "Best ranked Team Score", value: bestScore ?? "Not yet" },
  ];
  const visible = filter === "champions" ? runs.filter((r) => r.finish === "champion") : runs;
  return (
    <div className={s.history}>
      <section aria-label="Career summary" className={s.career}>
        <h3>Career summary</h3>
        <p className={s.scope}>
          Based only on stored history in this browser on this device, up to {HISTORY_LIMIT} runs.
          Not a lifetime total. Friendlies are excluded from the summary.
        </p>
        <dl className={s.metrics}>
          {metrics.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-label="Win rate by formation" className={s.career}>
        <h3>Win rate by formation</h3>
        <p className={s.scope}>
          Ranked match wins divided by all recorded matches, including draws and losses. Counts
          every ranked run in this browser&apos;s lifetime totals, not only the {HISTORY_LIMIT}{" "}
          stored runs.
        </p>
        {career.formations.length === 0 ? (
          <p>No ranked matches recorded.</p>
        ) : (
          <ul className={s.formationRates}>
            {career.formations.map((entry) => (
              <li key={entry.formation}>
                <strong>{entry.formation}</strong>{" "}
                <span>
                  {entry.winRate === null ? "No matches" : `${(100 * entry.winRate).toFixed(1)}%`}
                </span>
                <span>
                  {entry.wins} wins / {entry.matches} matches in {entry.runs} runs
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Species Hall of Fame" className={s.career}>
        <h3>Species Hall of Fame</h3>
        <p className={s.scope}>
          Browse all {POKEDEX.length.toLocaleString("en-US")} species. Counts cover ranked squads in
          the stored history above, including the bench.
        </p>
        <p className={s.scope}>
          Squad coverage: {career.coveredRuns} of {career.rankedRuns} ranked stored runs. Species
          from older runs without squad metadata are unknown.
        </p>
        <div className={s.speciesControls}>
          <input
            type="search"
            aria-label="Find a Hall of Fame species"
            placeholder="Species name or number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Filter Hall of Fame species"
            value={speciesFilter}
            onChange={(event) => {
              setSpeciesFilter(event.target.value as typeof speciesFilter);
              setPage(0);
            }}
          >
            <option value="all">All species</option>
            <option value="drafted">Drafted species</option>
            <option value="champions">Champion species</option>
          </select>
        </div>
        <ul className={s.speciesList}>
          {speciesPage.map((pokemon) => {
            const counts = career.species.get(pokemon.id);
            return (
              <li key={pokemon.id}>
                <PlayerImage dexId={pokemon.id} size={32} alt="" />
                <span>
                  <strong>
                    #{pokemon.id} {pokemon.name}
                  </strong>
                  <span className={s.scope}>
                    {counts
                      ? `${counts.drafted} drafted squad${counts.drafted === 1 ? "" : "s"}, ${counts.champion} champion squad${counts.champion === 1 ? "" : "s"}`
                      : "No recorded squads"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {matchingSpecies.length === 0 ? (
          <p>No species match these filters.</p>
        ) : (
          <div className={s.filters}>
            <button
              type="button"
              className="btn"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous species
            </button>
            <span className={s.scope}>
              Page {page + 1} of {Math.ceil(matchingSpecies.length / 30)}
            </span>
            <button
              type="button"
              className="btn"
              disabled={(page + 1) * 30 >= matchingSpecies.length}
              onClick={() => setPage(page + 1)}
            >
              Next species
            </button>
          </div>
        )}
      </section>
      <div className={s.filters} role="group" aria-label="Filter run history">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All runs
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "champions"}
          onClick={() => setFilter("champions")}
        >
          Champions only
        </button>
      </div>
      {visible.length === 0 ? (
        <StatusNote title="No champions in stored history yet.">
          Choose All runs to see your other finishes.
        </StatusNote>
      ) : (
        <ol className={s.list} data-testid="history-list">
          {visible.map((r) => (
            <li key={r.token} className={s.row} data-friendly={r.friendly || undefined}>
              <Link href={`/r/${r.token}`} className={s.link}>
                <span className={s.record}>{record(r.wins, r.draws, r.losses)}</span>
                <span className={s.main}>
                  <span className={s.bucket}>{BUCKET_LABEL[r.bucket] ?? r.bucket}</span>
                  <span className={s.meta}>
                    {when(r.at)}, {r.formation}, {FINISH_LABEL[r.finish] ?? r.finish}
                    {r.flawless ? ", flawless" : ""}
                  </span>
                  <span className={s.squad}>
                    {r.squadSpeciesIds ? (
                      r.squadSpeciesIds.map((id) => (
                        <PlayerImage
                          key={id}
                          dexId={id}
                          size={24}
                          alt={pokedexById(id)?.name ?? `#${id}`}
                        />
                      ))
                    ) : (
                      <span className={s.scope}>Squad preview unavailable for this older run.</span>
                    )}
                  </span>
                </span>
                <span className={s.score}>
                  <span className={s.scoreLabel}>Team Score</span>
                  <span className={s.scoreValue}>{r.score}</span>
                </span>
              </Link>
              <RowActions
                challenge={challengeHref(r.token)}
                exhibition={
                  squadFromToken(r.token) === null ? null : exhibitionHref({ away: r.token })
                }
                label={`${when(r.at)}, ${record(r.wins, r.draws, r.losses)}`}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
