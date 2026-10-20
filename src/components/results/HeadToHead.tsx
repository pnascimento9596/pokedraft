"use client";

import { CUP_ROUNDS, replay, type CupResult, type CupRound, type DraftState } from "@/engine";
import { ManualLink } from "@/components/share/ManualLink";
import { SHARE_TITLE } from "@/components/share/shareLink";
import { useLinkShare } from "@/components/share/useLinkShare";
import { ModuleCard, Table } from "@/components/ui/primitives";
import { versusHref } from "@/ui/challenge-href";
import { ROUND_LABEL, record } from "@/ui/labels";
import { challengeText, retainedLine, seedVerdict, VERDICT_LINE, type Versus } from "@/ui/versus";
import { finalScore } from "./format";
import r from "./ResultsView.module.css";
import s from "./HeadToHead.module.css";

export interface RunPair {
  readonly draft: DraftState;
  readonly cup: CupResult;
}

export type Opponent =
  ({ readonly kind: "run" } & RunPair) | { readonly kind: "retained"; readonly engine: number };

// The client only carries the live engine, so a retained run is named, never replayed or guessed.
export function opponentOf(versus: Versus): Opponent | null {
  if (versus.kind === "retained") return { kind: "retained", engine: versus.engine };
  try {
    return { kind: "run", ...replay(versus.token) };
  } catch {
    return null;
  }
}

function roundScore(cup: CupResult, round: CupRound): string {
  const m = cup.matches.find((match) => match.round === round);
  if (m === undefined || m.status === "notPlayed") return "Out";
  const { user, opp } = finalScore(m);
  const pens = m.shootout === null ? "" : m.outcome === "W" ? " (won on pens)" : " (lost on pens)";
  return `${user}-${opp}${pens}`;
}

function Side({ who, cup }: { readonly who: "You" | "Them"; readonly cup: CupResult }) {
  return (
    <div className={s.side} data-testid={who === "You" ? "h2h-you" : "h2h-them"}>
      <span className={r.recordLabel}>{who}</span>
      <span className={r.record}>{record(cup.wins, cup.draws, cup.losses)}</span>
      <span className={s.score}>Team Score {cup.rating.score}</span>
    </div>
  );
}

export function HeadToHead({
  token,
  mine,
  theirs,
}: {
  readonly token: string;
  readonly mine: RunPair;
  readonly theirs: Opponent;
}) {
  const link = useLinkShare();
  const back = versusHref(token);
  const rounds =
    theirs.kind === "run"
      ? CUP_ROUNDS.map((round) => ({
          round,
          you: roundScore(mine.cup, round),
          them: roundScore(theirs.cup, round),
        })).filter((row) => row.you !== "Out" || row.them !== "Out")
      : [];

  return (
    <ModuleCard
      className={s.card}
      eyebrow="Challenge"
      title="Head to head"
      description="Your run against theirs on the same seed."
      data-testid="head-to-head"
    >
      {theirs.kind === "retained" ? (
        <p className={s.line} data-testid="h2h-retained">
          {retainedLine(theirs.engine)}
        </p>
      ) : (
        <>
          <p className={s.verdict} data-testid="h2h-verdict">
            {VERDICT_LINE[seedVerdict(mine.cup, theirs.cup)]}
          </p>
          <div className={s.sides}>
            <Side who="You" cup={mine.cup} />
            <Side who="Them" cup={theirs.cup} />
          </div>
          <Table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Round</th>
                <th scope="col">You</th>
                <th scope="col">Them</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((row) => (
                <tr key={row.round}>
                  <th scope="row">{ROUND_LABEL[row.round]}</th>
                  <td>{row.you}</td>
                  <td>{row.them}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      {back !== null ? (
        <div className={r.actions}>
          <button
            type="button"
            className="btn"
            onClick={() =>
              void link.share({ title: SHARE_TITLE, text: challengeText(mine.cup), path: back })
            }
          >
            Send it back
          </button>
          <span className={r.status} role="status" aria-live="polite">
            {link.said}
          </span>
          <ManualLink url={link.manual} />
        </div>
      ) : null}
    </ModuleCard>
  );
}
