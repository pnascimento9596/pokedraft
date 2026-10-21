"use client";

import { useEffect, useState } from "react";
import { FORMATIONS, speciesById } from "@/engine";
import type {
  CupResult,
  FullLineup,
  ManagerAction,
  MatchResult,
  SetPiece,
  StarterIndex,
  Tactic,
} from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { BossRoster } from "@/components/results/BossRoster";
import { unlockAudio, useAudioLocked } from "@/components/wheel/sound";
import { finalScore } from "@/components/results/format";
import { ROUND_LABEL } from "@/ui/labels";
import { matchdayView, type MatchView } from "@/ui/settings";
import {
  decideAll,
  fieldedFor,
  touchlineAt,
  type CupContext,
  type Decision,
} from "@/ui/manager/touchline";
import { focusHeading } from "@/ui/focus";
import { scoutLine } from "@/ui/manager/intel";
import { storySource } from "@/ui/matchday/river";
import { MatchPlayer } from "./MatchPlayer";
import { SetPieceTakers } from "./SetPieceTakers";
import { TacticPills } from "./TacticPills";
import { YourCalls } from "./YourCalls";
import s from "./MatchdayFlow.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

const STYLE_LABEL = {
  balanced: "Balanced",
  pressing: "Pressing",
  possession: "Possession",
  direct: "Direct",
} as const;

type Takers = Readonly<Record<SetPiece, StarterIndex | null>>;

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
  initialActions = [],
  initialMatch = 0,
  view,
  managerMode,
  showRatings = false,
  onProgress,
  onFinish,
}: {
  readonly ctx: CupContext;
  /** The cup as `initialActions` play it. */
  readonly initialCup: CupResult;
  readonly initialActions?: readonly ManagerAction[];
  /** The match to open on; a restored matchday resumes where it was. */
  readonly initialMatch?: number;
  readonly view: MatchView;
  readonly managerMode: boolean;
  /** The ratings setting for this run; off hides the touchline's fit scores and STA. */
  readonly showRatings?: boolean;
  /** Called with the decisions so far whenever they or the current match change. */
  readonly onProgress?: (manager: readonly ManagerAction[], match: number) => void;
  readonly onFinish: (manager: readonly ManagerAction[]) => void;
}) {
  const [actions, setActions] = useState<readonly ManagerAction[]>(initialActions);
  const [cup, setCup] = useState(initialCup);
  const [index, setIndex] = useState<number | null>(() =>
    initialCup.matches[initialMatch]?.status === "played"
      ? initialMatch
      : nextPlayed(initialCup, initialMatch),
  );
  const [phase, setPhase] = useState<"pre" | "play">("pre");
  const locked = useAudioLocked();

  // Kick off hands the focus to the match player's play toggle instead.
  useEffect(() => {
    if (phase === "pre") focusHeading();
  }, [index, phase]);

  useEffect(() => {
    if (index === null) onFinish(actions);
    else onProgress?.(actions, index);
  }, [index, actions, onFinish, onProgress]);

  if (index === null) return null;
  const match = cup.matches[index] as PlayedMatch;
  const number = cup.matches.slice(0, index + 1).filter((m) => m.status === "played").length;
  const next = nextPlayed(cup, index);

  const onDecide = (minute: number, d: Decision | readonly Decision[]): string | null => {
    const verdict = decideAll(ctx, cup, actions, index, minute, "kind" in d ? [d] : d);
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
    // A touch pointerdown alone does not count as a gesture for audio; the pointerup does.
    <section
      className={s.flow}
      data-testid="matchday"
      data-match={index}
      onPointerDown={locked ? unlockAudio : undefined}
      onPointerUp={locked ? unlockAudio : undefined}
    >
      <header className={s.head}>
        <p className={s.kicker}>
          Match {number}
          {managerMode ? " · Manager mode" : ""}
        </p>
        <h1 className={s.title} data-testid="matchday-title">
          {ROUND_LABEL[match.round]}: {match.opponent.name}
        </h1>
        {locked ? (
          <button
            type="button"
            className={`btn btn--sm ${s.soundChip}`}
            data-testid="tap-for-sound"
            onClick={unlockAudio}
          >
            Tap for sound
          </button>
        ) : null}
      </header>

      {phase === "pre" ? (
        <PreMatch
          key={index}
          match={match}
          lineup={ctx.lineup}
          start={managerMode ? touchlineAt(match, index, ctx.lineup, actions, 0) : undefined}
          onKickOff={(decisions) => {
            const why = decisions.length === 0 ? null : onDecide(0, decisions);
            if (why === null) setPhase("play");
            return why;
          }}
        />
      ) : (
        <MatchPlayer
          key={index}
          match={match}
          matchIndex={index}
          seed={ctx.seed}
          lineup={ctx.lineup}
          view={matchdayView({ managerMode, matchView: view })}
          manager={managerMode ? { actions, decide: onDecide } : undefined}
          story={storySource(cup, actions)}
          ratings={showRatings}
          autoStart
          takeFocus
          footer={
            <div className={s.fulltime} data-testid="fulltime">
              <p className={s.ftLine}>
                Full time. {resultWord(match)}, {finalScore(match).user}-{finalScore(match).opp}
                {match.extraTime !== null ? " after extra time" : ""}
                {match.shootout !== null
                  ? `, ${match.shootout.user}-${match.shootout.opp} on penalties`
                  : ""}
                .
              </p>
              <YourCalls ctx={ctx} cup={cup} actions={actions} matchIndex={index} />
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
  start,
  onKickOff,
}: {
  readonly match: PlayedMatch;
  readonly lineup: FullLineup;
  /** The tactic and set-piece takers the side starts with, present in manager mode only. */
  readonly start: { readonly tactic: Tactic; readonly takers: Takers } | undefined;
  /** Kicks off with the decisions to record, none to record nothing; returns why it was refused. */
  readonly onKickOff: (decisions: readonly Decision[]) => string | null;
}) {
  const [tactic, setTactic] = useState(start?.tactic);
  const [takers, setTakers] = useState(start?.takers);
  const [error, setError] = useState<string | null>(null);
  const fielded = fieldedFor(lineup, match);
  const slots = FORMATIONS[lineup.formation].slots;
  // At most one absence per match is pinned in src/engine/__tests__/cup.test.ts.
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
      {tactic !== undefined ? (
        <>
          <p className={s.scout} data-testid="scout-line">
            {scoutLine(match.opponent.tacticalStyle)}
          </p>
          <TacticPills
            label="Starting tactic"
            value={tactic}
            style={match.opponent.tacticalStyle}
            onPick={setTactic}
          />
          {takers !== undefined ? (
            <SetPieceTakers
              formation={lineup.formation}
              onPitch={fielded.starters}
              value={takers}
              onPick={(set, slot) => setTakers({ ...takers, [set]: slot })}
            />
          ) : null}
        </>
      ) : null}
      {error !== null ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <ol className={s.xi} aria-label="Your starting eleven">
        {fielded.starters.map((id, slot) => (
          <li key={slot}>
            <span className={s.role}>{slots[slot]!.label}</span>
            <PlayerImage dexId={id} size={32} alt="" eager />
            <span className={s.name}>{speciesById(id).name}</span>
          </li>
        ))}
      </ol>
      {/* Both elevens load here, so every sprite is drawn when the match kicks off. */}
      <BossRoster opponent={match.opponent} eager />
      <button
        type="button"
        className="btn btn--primary"
        data-testid="prematch-go"
        onClick={() => {
          unlockAudio();
          // Any recorded tactic hands the match to the player and switches the assistant off, so
          // keeping the starting tactic records nothing; an unchanged taker records nothing either.
          if (start === undefined) {
            setError(onKickOff([]));
            return;
          }
          const decisions: Decision[] = [];
          if (tactic !== undefined && tactic !== start.tactic) {
            decisions.push({ kind: "tactic", tactic });
          }
          for (const set of ["penalty", "freeKick"] as const) {
            const slot = takers?.[set] ?? null;
            if (slot !== start.takers[set]) decisions.push({ kind: "taker", set, slot });
          }
          setError(onKickOff(decisions));
        }}
      >
        Kick off
      </button>
    </div>
  );
}
