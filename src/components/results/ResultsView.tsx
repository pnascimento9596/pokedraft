"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Contribution, CupResult, DraftState, PlayerLine } from "@/engine";
import { speciesById } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { Pitch } from "@/components/pitch/Pitch";
import {
  FINISH_LABEL,
  FRIENDLY_LABEL,
  LADDER_SHAPE,
  MODE_LABEL,
  STYLE_LABEL,
  record,
} from "@/ui/labels";
import { recordRun, toRecord } from "@/ui/runs";
import { contributionLine } from "./format";
import { FitReveal } from "./FitReveal";
import { MatchList } from "./MatchList";
import { ShareActions } from "./ShareActions";
import s from "./ResultsView.module.css";

export interface ResultsViewProps {
  /** The run token: `encodeToken` output that `replay` accepts. */
  readonly token: string;
  /** Both from `replay(token)`. The view never recomputes them. */
  readonly draft: DraftState;
  readonly cup: CupResult;
  /** `live` right after a run (records it locally, offers New run); `shared` on /r/[token]. */
  readonly variant: "live" | "shared";
  readonly onNewRun?: () => void;
  /** Leaderboard submit panel; rendered for `live` runs only. */
  readonly submit?: ReactNode;
}

function modeLine(draft: DraftState): string {
  const st = draft.settings;
  if (st.mode === "cup8") return `${MODE_LABEL.cup8}, ${STYLE_LABEL[st.style]}`;
  if (st.mode === "builder") return "Builder squad";
  return MODE_LABEL[st.mode];
}

export function ResultsView({ token, draft, cup, variant, onNewRun, submit }: ResultsViewProps) {
  const recorded = useRef(false);
  useEffect(() => {
    if (variant !== "live" || recorded.current) return;
    recorded.current = true;
    recordRun(toRecord(token, draft.settings, cup, new Date().toISOString()));
  }, [variant, token, draft.settings, cup]);

  const friendly = draft.settings.mode === "builder";
  const formation = draft.settings.formation;

  return (
    <section className={s.results} data-testid="results" aria-label="Run results">
      <header className={s.hero} data-flawless={cup.flawless || undefined}>
        <div className={s.heroTop}>
          <h1 className="kicker">{modeLine(draft)}</h1>
          <span className={s.formation}>{formation}</span>
          {friendly ? <span className={s.friendly}>{FRIENDLY_LABEL}</span> : null}
        </div>
        <div className={s.heroMain}>
          <div className={s.recordBlock}>
            <span className={s.recordLabel}>Record W-D-L</span>
            <span className={s.record} data-testid="results-record">
              {record(cup.wins, cup.draws, cup.losses)}
            </span>
            <span className={s.finish} data-finish={cup.finish}>
              {FINISH_LABEL[cup.finish]}
            </span>
          </div>
          <div className={`scorebug ${s.scorebug}`}>
            <span className="scorebug__label">Team Score</span>
            <span className="scorebug__value" data-testid="results-score">
              {cup.rating.score}
            </span>
          </div>
        </div>
        {cup.flawless ? (
          <p className={s.flawless}>
            <span className={s.flawlessMark}>8-0</span> Flawless. Every match won, cup lifted.
          </p>
        ) : null}
      </header>

      <ShareActions token={token} variant={variant} onNewRun={onNewRun} />
      {variant === "live" ? submit : null}

      <div className={s.columns}>
        <section className={s.block} aria-labelledby="matches-h">
          <h2 id="matches-h" className={s.h2}>
            The cup
          </h2>
          <MatchList cup={cup} />
        </section>

        <section className={s.block} aria-labelledby="group-h">
          <h2 id="group-h" className={s.h2}>
            Group table
          </h2>
          {/* It scrolls sideways on a narrow phone, so a keyboard user can focus it to scroll. */}
          <div
            className={s.tableWrap}
            role="region"
            aria-label="Group table, scrollable"
            tabIndex={0}
          >
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col" className={s.teamCol}>
                    Team
                  </th>
                  <th scope="col">P</th>
                  <th scope="col">W</th>
                  <th scope="col">D</th>
                  <th scope="col">L</th>
                  <th scope="col">GF</th>
                  <th scope="col">GA</th>
                  <th scope="col">Pts</th>
                </tr>
              </thead>
              <tbody>
                {cup.group.map((row, i) => (
                  <tr key={row.team} data-user={row.team === "user" || undefined}>
                    <th scope="row" className={s.teamCol}>
                      <span className={s.pos}>{i + 1}</span>
                      {row.team === "user" ? "Your team" : row.name}
                    </th>
                    <td>{row.played}</td>
                    <td>{row.won}</td>
                    <td>{row.drawn}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalsFor}</td>
                    <td>{row.goalsAgainst}</td>
                    <td className={s.pts}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.note}>Top two go through to the Round of 32.</p>

          <h2 className={s.h2}>Awards</h2>
          <div className={s.awards}>
            <Award title="Golden Boot" line={cup.awards.goldenBoot} stat="goals" empty="No goals" />
            <Award
              title="Top assister"
              line={cup.awards.topAssister}
              stat="assists"
              empty="No assists"
            />
            <Award
              title="Player of the tournament"
              line={cup.awards.playerOfTournament}
              stat="apps"
              empty=""
              contribution={cup.awards.potContribution}
            />
          </div>
        </section>
      </div>

      <section className={s.block} aria-labelledby="fits-h">
        <h2 id="fits-h" className={s.h2}>
          How the eleven fit
        </h2>
        <div className={s.fitGrid}>
          <div className={s.pitchCol}>
            <Pitch
              formation={formation}
              lineup={draft.lineup}
              edges={cup.rating.edges}
              weakest={cup.rating.weakest}
              label="Your lineup"
            />
            <ul className={s.legend} aria-label="Pitch legend">
              <li>
                <span className={s.legendSynergy} aria-hidden="true" /> Synergy link between
                neighbours
              </li>
              <li>
                <span className={s.legendWeak} aria-hidden="true" /> Weak spot: one of the 3 lowest
                ratings
              </li>
            </ul>
          </div>
          <FitReveal formation={formation} rating={cup.rating} />
        </div>
      </section>

      <details className={s.details}>
        <summary>Season details: how grading works</summary>
        <div className={s.detailsBody}>
          <p>
            Team Score blends a few things. The biggest is how well each player fits the slot they
            play, and a player away from their usual position fits worse. Each player&apos;s rating
            is a score from 0 to 100 against every other Pokémon for that job, and the three lowest
            are flagged as weak spots. Each line, from goalkeeper to attack, is weighed on its own,
            and the weak spots drag the score down, so one bad hole costs more than you might
            expect.
          </p>
          <p>
            Neighbours on the pitch can link up. A link forms when they share a type, come from the
            same evolution line, come from the same generation, or cover each other&apos;s type
            weaknesses. The bench adds a little depth on top.
          </p>
          <p>
            Matches are simulated from your Team Score against a ladder of opponents. {LADDER_SHAPE}{" "}
            If a player misses a match, the bench steps in and that match uses the Team Score of the
            side that actually played.
          </p>
          <p>
            Every roll in the draft comes from the run&apos;s seed, so a run link replays exactly
            the same draft and the same cup for anyone who opens it.
          </p>
        </div>
      </details>
    </section>
  );
}

function Award({
  title,
  line,
  stat,
  empty,
  contribution = null,
}: {
  title: string;
  line: PlayerLine | null;
  stat: "goals" | "assists" | "apps";
  empty: string;
  contribution?: Contribution | null;
}) {
  const species = line === null ? null : speciesById(line.species);
  const value =
    line === null
      ? null
      : stat === "goals"
        ? `${line.goals} ${line.goals === 1 ? "goal" : "goals"}`
        : stat === "assists"
          ? `${line.assists} ${line.assists === 1 ? "assist" : "assists"}`
          : `${line.goals} G, ${line.assists} A, ${line.appearances} apps`;
  return (
    <div className={s.award}>
      <span className="kicker">{title}</span>
      {species === null ? (
        <span className={s.awardEmpty}>{empty}</span>
      ) : (
        <div className={s.awardBody}>
          <PlayerImage dexId={species.id} size={44} alt={species.name} />
          <div>
            <div className={s.awardName}>{species.name}</div>
            <div className={s.awardStat}>{value}</div>
            {contribution !== null ? (
              <div className={s.awardStat} data-testid="pot-contribution">
                {contributionLine(contribution)}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
