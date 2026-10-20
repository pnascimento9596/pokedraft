"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import { ACHIEVEMENT_LABEL, chipAchievement, runAchievements } from "@/ui/achievements";
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
import { markRevealed, wasRevealed } from "@/ui/reveal";
import { goalHref, watchIndex } from "@/ui/run-link";
import { toRecord } from "@/ui/runs";
import { contributionLine, dragLabel, SIDE_COPY, type ResultsVariant } from "./format";
import { FitReveal } from "./FitReveal";
import { MatchHighlights } from "./MatchHighlights";
import { MatchList } from "./MatchList";
import { ShareActions } from "./ShareActions";
import { SeedBoard } from "@/components/leaderboard/SeedBoard";
import { Trophy } from "./Trophy";
import s from "./ResultsView.module.css";
import { ModuleCard, Pill, Table } from "@/components/ui/primitives";
import { NavIcon, type NavFamily } from "@/components/ui/nav-icons";
import { SoundToggle } from "@/components/wheel/SoundToggle";
import { prefersReducedMotion } from "@/components/wheel/useReducedMotion";

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
  readonly variant: ResultsVariant;
  readonly onNewRun?: () => void;
  /** Leaderboard submit panel; rendered for `live` runs only. */
  readonly submit?: ReactNode;
  /** How many times `submit` saved this run; each change refetches the seed table. */
  readonly submissions?: number;
  /** A challenge's comparison with the run it dared you to beat, right after the hero. */
  readonly versus?: ReactNode;
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
  submissions = 0,
  versus,
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

  // The count-up is the payoff of a cup just played: a shared link or a revisit shows the numbers.
  // Live results mount only on the client, after the run, so reading the tab's storage here is safe.
  const [staged] = useState(
    () => variant === "live" && !prefersReducedMotion() && !wasRevealed(token),
  );
  useEffect(() => {
    if (variant === "live") markRevealed(token);
  }, [variant, token]);

  const friendly = draft.settings.mode === "builder";
  const formation = draft.settings.formation;
  const achievement = chipAchievement(runAchievements(draft, cup));
  const [selectedHighlightRound, setSelectedHighlightRound] = useState<CupRound | "mvp" | null>(
    null,
  );
  const [watching, setWatching] = useState<{ matchIndex: number; goal?: number } | null>(
    watch === null ? null : { matchIndex: watch.matchIndex, goal: watch.minute },
  );
  const goalLink = (matchIndex: number, minute: number) =>
    goalHref(token, watchIndex(cup, matchIndex), minute);
  const [inspectId, setInspectId] = useState<SpeciesId | null>(null);
  const [starTaps, setStarTaps] = useState(0);

  // Watch live hands focus and scroll back to whatever opened it. A goal link opens the replay
  // with no opener, so its close lands on that match's own Watch live button.
  const results = useRef<HTMLElement>(null);
  const openedFrom = useRef<{ opener: Element | null; scrollY: number } | null>(null);
  const closed = useRef<number | null>(null);
  const openWatch = (matchIndex: number) => {
    openedFrom.current = { opener: document.activeElement, scrollY: window.scrollY };
    setWatching({ matchIndex });
  };
  const closeWatch = () => {
    closed.current = watching?.matchIndex ?? null;
    setWatching(null);
  };
  useLayoutEffect(() => {
    if (watching !== null || closed.current === null) return;
    const round = cup.matches[closed.current]?.round;
    const from = openedFrom.current;
    closed.current = null;
    openedFrom.current = null;
    const opener = from?.opener;
    const target =
      opener instanceof HTMLElement && opener.isConnected && opener !== document.body
        ? opener
        : results.current?.querySelector<HTMLElement>(
            `[data-testid="match-${round}"] [data-testid="watch-live"]`,
          );
    target?.focus({ preventScroll: from !== null });
    if (from !== null) window.scrollTo({ top: from.scrollY });
  }, [watching, cup]);

  return (
    <section ref={results} className={s.results} data-testid="results" aria-label="Run results">
      <ModuleCard
        className={s.hero}
        data-reveal={staged ? "staged" : undefined}
        eyebrow="Run results"
        title={modeLine(draft)}
        headingLevel={1}
        description={SIDE_COPY[variant].summary}
        icon={<NavIcon family={navFamily} />}
        meta={
          <div className={s.heroMain}>
            <div className={s.recordBlock}>
              <span className={s.recordLabel}>Record W-D-L</span>
              <span className={`${s.record} ${s.flip}`} data-testid="results-record">
                {record(cup.wins, cup.draws, cup.losses)}
              </span>
            </div>
            <div className={s.recordBlock}>
              <span className={s.recordLabel}>Team Score</span>
              <span
                className={`${s.record} ${s.count}`}
                data-testid="results-score"
                style={{ "--score": cup.rating.score } as CSSProperties}
              >
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
            {cup.finish === "champion" ? <Trophy className={s.trophy} /> : null}
            {FINISH_LABEL[cup.finish]}
          </span>
          {achievement !== null ? (
            <span className={s.achievement} data-testid="results-achievement">
              <span className="visually-hidden">Achievement: </span>
              {ACHIEVEMENT_LABEL[achievement]}
            </span>
          ) : null}
        </div>
        {cup.flawless ? (
          <p className={s.flawless} data-testid="results-flawless">
            <span className={s.flawlessMark}>8-0</span> Flawless. Every match won, cup lifted.
          </p>
        ) : null}
        <MvpCard line={cup.awards.playerOfTournament} contribution={cup.awards.potContribution} />
      </ModuleCard>
      {versus}

      <ShareActions token={token} draft={draft} cup={cup} variant={variant} onNewRun={onNewRun} />
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
          variant={variant}
          onClose={closeWatch}
        />
      ) : null}

      <MatchHighlights
        cup={cup}
        draft={draft}
        selectedRound={selectedHighlightRound}
        onSelectRound={setSelectedHighlightRound}
        focusStage={starTaps}
        variant={variant}
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
            onSelectStar={(round) => {
              setSelectedHighlightRound(round);
              setStarTaps((n) => n + 1);
            }}
            onWatch={openWatch}
            goalHref={goalLink}
            variant={variant}
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
                        {row.team === "user" ? SIDE_COPY[variant].team : row.name}
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
            </div>
          </ModuleCard>
        </div>
      </div>

      <ModuleCard
        className={s.block}
        variant="emphasis"
        eyebrow={SIDE_COPY[variant].squad}
        title="How the eleven fit"
        description={SIDE_COPY[variant].squadSummary}
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
              label={SIDE_COPY[variant].lineup}
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

      <SeedBoard token={token} refresh={submissions} />

      {inspectId !== null ? (
        <ScoutingDossier
          speciesId={inspectId}
          showRatings={true}
          lineup={draft.lineup}
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
            Matches are simulated from the Team Score against a ladder of opponents. {LADDER_SHAPE}{" "}
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

function MvpCard({ line, contribution }: { line: PlayerLine; contribution: Contribution | null }) {
  const species = speciesById(line.species);
  return (
    <div className={s.mvp} data-testid="results-mvp">
      <PlayerImage dexId={species.id} size={56} alt="" />
      <div>
        <span className={`kicker ${s.mvpLabel}`}>Player of the tournament</span>
        <div className={s.mvpName}>{species.name}</div>
        {contribution !== null ? (
          <div className={s.awardStat} data-testid="pot-contribution">
            {contributionLine(contribution)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Award({
  title,
  line,
  stat,
  empty,
}: {
  title: string;
  line: PlayerLine | null;
  stat: "goals" | "assists";
  empty: string;
}) {
  const species = line === null ? null : speciesById(line.species);
  const value =
    line === null
      ? null
      : stat === "goals"
        ? `${line.goals} ${line.goals === 1 ? "goal" : "goals"}`
        : `${line.assists} ${line.assists === 1 ? "assist" : "assists"}`;
  return (
    <div className={s.award}>
      <span className="kicker">{title}</span>
      {species === null ? (
        <span className={s.awardEmpty}>{empty}</span>
      ) : (
        <div className={s.awardBody}>
          <PlayerImage dexId={species.id} size={44} alt="" />
          <div>
            <div className={s.awardName}>{species.name}</div>
            <div className={s.awardStat}>{value}</div>
          </div>
        </div>
      )}
    </div>
  );
}
