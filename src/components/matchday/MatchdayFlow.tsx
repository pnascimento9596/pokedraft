"use client";

import { useEffect, useState } from "react";
import { FORMATIONS, speciesById } from "@/engine";
import type { CupResult, FullLineup, ManagerAction, MatchResult } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { BossRoster } from "@/components/results/BossRoster";
import { finalScore } from "@/components/results/format";
import { ROUND_LABEL } from "@/ui/labels";
import type { MatchView } from "@/ui/settings";
import { decide, fieldedFor, type CupContext, type Decision } from "@/ui/manager/touchline";
import { focusHeading } from "@/ui/focus";
import { MatchPlayer } from "./MatchPlayer";
import s from "./MatchdayFlow.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

const STYLE_LABEL = {
  balanced: "Balanced",
  pressing: "Pressing",
  possession: "Possession",
  direct: "Direct",
} as const;

function nextPlayed(cup: CupResult, after: number): number | null {
  for (let i = after + 1; i < cup.matches.length; i++) {
    if (cup.matches[i]!.status === "played") return i;
  }
  return null;
}

function resultWord(m: PlayedMatch): string {
  if (m.outcome === "W") return "Win";
  if (m.outcome === "L") return "Defeat";
  return "Draw";
}

/**
 * The cup played match by match after the draft. In manager mode the player coaches each match
 * from the touchline; every decision replays the cup through the engine, so what is shown is
 * always what the token will replay.
 */
export function MatchdayFlow({
  ctx,
  initialCup,
  view,
  managerMode,
  onFinish,
}: {
  readonly ctx: CupContext;
  readonly initialCup: CupResult;
  readonly view: MatchView;
  readonly managerMode: boolean;
  readonly onFinish: (manager: readonly ManagerAction[]) => void;
}) {
  const [actions, setActions] = useState<readonly ManagerAction[]>([]);
  const [cup, setCup] = useState(initialCup);
  const [index, setIndex] = useState<number | null>(() => nextPlayed(initialCup, -1));
  const [phase, setPhase] = useState<"pre" | "play">("pre");

  useEffect(() => {
    focusHeading();
  }, [index, phase]);

  useEffect(() => {
    if (index === null) onFinish(actions);
  }, [index, actions, onFinish]);

  if (index === null) return null;
  const match = cup.matches[index] as PlayedMatch;
  const number = cup.matches.slice(0, index + 1).filter((m) => m.status === "played").length;
  const next = nextPlayed(cup, index);

  const onDecide = (minute: number, d: Decision): string | null => {
    const verdict = decide(ctx, cup, actions, index, minute, d);
    if (!verdict.ok) return verdict.reason;
    setActions(verdict.actions);
    setCup(verdict.cup);
    return null;
  };

  const advance = () => {
    window.scrollTo({ top: 0 });
    setPhase("pre");
    setIndex(next);
  };

  return (
    <section className={s.flow} data-testid="matchday" data-match={index}>
      <header className={s.head}>
        <p className={s.kicker}>
          Match {number}
          {managerMode ? " · Manager mode" : ""}
        </p>
        <h1 className={s.title} data-testid="matchday-title">
          {ROUND_LABEL[match.round]}: {match.opponent.name}
        </h1>
      </header>

      {phase === "pre" ? (
        <PreMatch match={match} lineup={ctx.lineup} onGo={() => setPhase("play")} />
      ) : (
        <MatchPlayer
          key={index}
          match={match}
          matchIndex={index}
          seed={ctx.seed}
          lineup={ctx.lineup}
          view={view}
          manager={managerMode ? { actions, decide: onDecide } : undefined}
          autoStart
          footer={
            <div className={s.fulltime} data-testid="fulltime">
              <p className={s.ftLine}>
                Full time. {resultWord(match)}, {finalScore(match).user} - {finalScore(match).opp}
                {match.extraTime !== null ? " after extra time" : ""}
                {match.shootout !== null
                  ? `, ${match.shootout.user} - ${match.shootout.opp} on penalties`
                  : ""}
                .
              </p>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="fulltime-next"
                onClick={advance}
              >
                {next === null ? "See results" : "Next match"}
              </button>
            </div>
          }
        />
      )}
    </section>
  );
}

function PreMatch({
  match,
  lineup,
  onGo,
}: {
  readonly match: PlayedMatch;
  readonly lineup: FullLineup;
  readonly onGo: () => void;
}) {
  const fielded = fieldedFor(lineup, match);
  const slots = FORMATIONS[lineup.formation].slots;
  const absence = match.absences[0];
  return (
    <div className={s.pre} data-testid="prematch">
      <dl className={s.facts}>
        <div>
          <dt>Opponent</dt>
          <dd>{match.opponent.name}</dd>
        </div>
        {match.opponent.tacticalStyle !== undefined ? (
          <div>
            <dt>Style</dt>
            <dd>{STYLE_LABEL[match.opponent.tacticalStyle]}</dd>
          </div>
        ) : null}
        <div>
          <dt>Your shape</dt>
          <dd>{lineup.formation}</dd>
        </div>
      </dl>
      {absence !== undefined ? (
        <p className={s.absence}>
          {speciesById(absence.out).name} misses this match
          {absence.in !== null ? `. ${speciesById(absence.in).name} starts instead.` : "."}
        </p>
      ) : null}
      <ol className={s.xi} aria-label="Your starting eleven">
        {fielded.starters.map((id, slot) => (
          <li key={slot}>
            <span className={s.role}>{slots[slot]!.label}</span>
            <PlayerImage dexId={id} size={32} alt="" />
            <span className={s.name}>{speciesById(id).name}</span>
          </li>
        ))}
      </ol>
      <BossRoster opponent={match.opponent} />
      <button type="button" className="btn btn--primary" data-testid="prematch-go" onClick={onGo}>
        Go to the match
      </button>
    </div>
  );
}
