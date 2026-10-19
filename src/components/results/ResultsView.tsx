"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  Contribution,
  CupResult,
  CupRound,
  DraftState,
  PlayerLine,
  SpeciesId,
} from "@/engine";
import { speciesById } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { Pitch } from "@/components/pitch/Pitch";
import { ScoutingDossier } from "@/components/scouting/ScoutingDossier";
import { valueAt } from "@/ui/lineup";
import {
  FINISH_LABEL,
  FRIENDLY_LABEL,
  LADDER_SHAPE,
  MODE_LABEL,
  STYLE_LABEL,
  record,
} from "@/ui/labels";
import { recordCompletedRun } from "@/ui/lifetime";
import { isCoached } from "@/ui/manager/coached";
import { goalHref, watchIndex } from "@/ui/run-link";
import { toRecord } from "@/ui/runs";
import { contributionLine, dragLabel } from "./format";
import { FitReveal } from "./FitReveal";
import { MatchHighlights } from "./MatchHighlights";
import { MatchList } from "./MatchList";
import { ShareActions } from "./ShareActions";
import s from "./ResultsView.module.css";
import { ModuleCard, Pill, Table } from "@/components/ui/primitives";
import { NavIcon, type NavFamily } from "@/components/ui/nav-icons";
import { SoundToggle } from "@/components/wheel/SoundToggle";

// Watch live loads the match player and its broadcast only when a match is opened.
const MatchReplay = dynamic(() => import("./MatchReplay").then((m) => m.MatchReplay), {
  ssr: false,
  loading: () => (
    <p className="kicker" data-testid="match-replay-loading">
      Loading the broadcast
    </p>
  ),
});

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
  readonly navFamily?: NavFamily;
  /** A goal link's replay: the match to open and the goal's minute. */
  readonly watch?: { readonly matchIndex: number; readonly minute: number } | null;
}

function modeLine(draft: DraftState): string {
  const st = draft.settings;
  if (st.mode === "cup8") return `${MODE_LABEL.cup8}, ${STYLE_LABEL[st.style]}`;
  if (st.mode === "builder") return "Builder squad";
  return MODE_LABEL[st.mode];
}

export function ResultsView({
  token,
  draft,
  cup,
  variant,
  onNewRun,
  submit,
  navFamily = "play",
  watch = null,
}: ResultsViewProps) {
  const recorded = useRef(false);
  useEffect(() => {
    if (variant !== "live" || recorded.current) return;
    recorded.current = true;
    recordCompletedRun(
      toRecord(token, draft.settings, cup, new Date().toISOString(), draft.lineup),
    );
  }, [variant, token, draft.settings, draft.lineup, cup]);

  const friendly = draft.settings.mode === "builder";
  const formation = draft.settings.formation;
  const [selectedHighlightRound, setSelectedHighlightRound] = useState<CupRound | "mvp" | null>(
    null,
  );
  const [watching, setWatching] = useState<{ matchIndex: number; goal?: number } | null>(
    watch === null ? null : { matchIndex: watch.matchIndex, goal: watch.minute },
  );
  const goalLink = (matchIndex: number, minute: number) =>
    goalHref(token, watchIndex(cup, matchIndex), minute);
  const [inspectId, setInspectId] = useState<SpeciesId | null>(null);

  return (
    <section className={s.results} data-testid="results" aria-label="Run results">
      <ModuleCard
        className={s.hero}
        eyebrow="Run results"
        title={modeLine(draft)}
        headingLevel={1}
        description="Your record, Team Score and cup finish."
        icon={<NavIcon family={navFamily} />}
        meta={
          <div className={s.heroMain}>
            <div className={s.recordBlock}>
              <span className={s.recordLabel}>Record W-D-L</span>
              <span className={s.record} data-testid="results-record">
                {record(cup.wins, cup.draws, cup.losses)}
              </span>
            </div>
            <div className={s.recordBlock}>
              <span className={s.recordLabel}>Team Score</span>
              <span className={s.record} data-testid="results-score">
                {cup.rating.score}
              </span>
            </div>
          </div>
        }
      >
        <div className={s.heroTop}>
          <Pill className={s.formation}>{formation}</Pill>
          {friendly ? <Pill tone="info">{FRIENDLY_LABEL}</Pill> : null}
          {isCoached(token) ? (
            <Pill tone="info" data-testid="coached-pill">
              Coached
            </Pill>
          ) : null}
          <span className={s.finish} data-finish={cup.finish}>
            {FINISH_LABEL[cup.finish]}
          </span>
        </div>
        {cup.flawless ? (
          <p className={s.flawless}>
            <span className={s.flawlessMark}>8-0</span> Flawless. Every match won, cup lifted.
          </p>
        ) : null}
      </ModuleCard>

      <ShareActions token={token} draft={draft} variant={variant} onNewRun={onNewRun} />
      {variant === "live" ? submit : null}

      <div className={s.actions}>
        <SoundToggle />
      </div>
      {watching !== null ? (
        <MatchReplay
          cup={cup}
          draft={draft}
          matchIndex={watching.matchIndex}
          goal={watching.goal}
          shareGoal={(minute) => goalLink(watching.matchIndex, minute)}
          onClose={() => setWatching(null)}
        />
      ) : null}

      <MatchHighlights
        cup={cup}
        draft={draft}
        selectedRound={selectedHighlightRound}
        onSelectRound={setSelectedHighlightRound}
      />

      <div className={s.columns}>
        <ModuleCard
          className={s.block}
          eyebrow="Matches"
          title="The cup"
          description="Every match, with the opponents from this run."
        >
          <MatchList
            cup={cup}
            draft={draft}
            onSelectStar={(round) => setSelectedHighlightRound(round)}
            onWatch={(matchIndex) => setWatching({ matchIndex })}
            goalHref={goalLink}
          />
        </ModuleCard>

        <div className={s.block}>
          <ModuleCard
            eyebrow="Standings"
            title="Group table"
            description="The group stage, ranked by points."
          >
            {/* It scrolls sideways on a narrow phone, so a keyboard user can focus it to scroll. */}
            <div
              className={s.tableWrap}
              role="region"
              aria-label="Group table, scrollable"
              tabIndex={0}
            >
              <Table className={s.table}>
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
              </Table>
            </div>
            <p className={s.note}>Top two go through to the Round of 32.</p>
          </ModuleCard>
          <ModuleCard
            eyebrow="Standout players"
            title="Awards"
            description="The performances recorded in this cup."
          >
            <div className={s.awards}>
              <Award
                title="Golden Boot"
                line={cup.awards.goldenBoot}
                stat="goals"
                empty="No goals"
              />
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
                empty="No appearances recorded"
                contribution={cup.awards.potContribution}
              />
            </div>
          </ModuleCard>
        </div>
      </div>

      <ModuleCard
        className={s.block}
        variant="emphasis"
        eyebrow="Your squad"
        title="How the eleven fit"
        description="Your lineup, Synergy links and ratings for each role."
      >
        <div
          className={s.breakdownBar}
          data-testid="score-breakdown"
          aria-label="Squad rating breakdown"
        >
          <div className={s.breakdownItem}>
            <span className="kicker">GK</span>
            <span className="num">{Math.round(cup.rating.lines.GK)}</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">DEF</span>
            <span className="num">{Math.round(cup.rating.lines.DEF)}</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">MID</span>
            <span className="num">{Math.round(cup.rating.lines.MID)}</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">ATT</span>
            <span className="num">{Math.round(cup.rating.lines.ATT)}</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">Synergy</span>
            <span className="num">{Math.round(cup.rating.synergy * 100)}%</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">Bench</span>
            <span className="num">{Math.round(cup.rating.bench * 100)}</span>
          </div>
          <div className={s.breakdownItem}>
            <span className="kicker">Weak-spot drag</span>
            <span className="num">{dragLabel(cup.rating.drag)}</span>
          </div>
        </div>
        <div className={s.fitGrid}>
          <div className={s.pitchCol}>
            <Pitch
              formation={formation}
              lineup={draft.lineup}
              speciesOf={speciesById}
              edges={cup.rating.edges}
              weakest={cup.rating.weakest}
              label="Your lineup"
              onSlotTap={(ref) => {
                const id = valueAt(draft.lineup, ref);
                if (id !== null) setInspectId(id);
              }}
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
          <FitReveal
            formation={formation}
            rating={cup.rating}
            bench={draft.lineup.bench.filter((id): id is SpeciesId => id !== null)}
            onScout={setInspectId}
          />
        </div>
      </ModuleCard>

      {inspectId !== null ? (
        <ScoutingDossier
          speciesId={inspectId}
          showRatings={true}
          onClose={() => setInspectId(null)}
        />
      ) : null}

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
