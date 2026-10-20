"use client";

import Link from "next/link";
import { GENS, type CupResult, type DraftState } from "@/engine/types";
import { builderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";
import { challengeHref, versusHref } from "@/ui/challenge-href";
import { exhibitionHref, squadFromToken } from "@/ui/exhibition-route";
import { challengeText } from "@/ui/versus";
import { runHref } from "@/ui/run-link";
import { ManualLink } from "@/components/share/ManualLink";
import { SHARE_TITLE, runShareText } from "@/components/share/shareLink";
import { useLinkShare } from "@/components/share/useLinkShare";
import {
  DOWNLOAD_FAILED,
  downloadStatus,
  useCardDownload,
} from "@/components/share/useCardDownload";
import s from "./ResultsView.module.css";

export function ShareActions({
  token,
  variant,
  draft,
  cup,
  onNewRun,
}: {
  token: string;
  variant: "live" | "shared";
  draft: DraftState;
  cup: CupResult;
  onNewRun?: () => void;
}) {
  const card = useCardDownload({ t: token });
  const link = useLinkShare();
  const settings = draft.settings;
  const path = runHref(token);
  const text = runShareText({
    wins: cup.wins,
    draws: cup.draws,
    losses: cup.losses,
    score: cup.rating.score,
    friendly: settings.mode === "builder",
  });
  const builderHref = `/?b=${builderToken(
    { mode: "builder", formation: draft.lineup.formation, gens: GENS, legendaries: true },
    draft.lineup,
    BUILDER_URL_SEED,
  )}`;
  const sameSeed = variant === "shared" ? challengeHref(token) : null;
  const dare = variant === "live" ? versusHref(token) : null;
  const exhibition =
    variant === "shared" && squadFromToken(token) !== null ? exhibitionHref({ away: token }) : null;

  const share = () => {
    card.reset();
    void link.share({ title: SHARE_TITLE, text, path });
  };

  const challenge = (path: string) => {
    card.reset();
    void link.share({ title: SHARE_TITLE, text: challengeText(cup), path });
  };

  const download = () => {
    link.clear();
    void card.start({ t: token }, "pokedraft-run.png", { path, text });
  };

  return (
    <div className={s.actions}>
      <button type="button" className="btn btn--primary" onClick={share}>
        Share
      </button>
      <button
        type="button"
        className="btn"
        onClick={download}
        disabled={card.state.kind === "busy"}
      >
        Download image
      </button>
      {dare !== null ? (
        <button type="button" className="btn" onClick={() => challenge(dare)}>
          Challenge a friend
        </button>
      ) : null}
      {variant === "live" && onNewRun ? (
        <button type="button" className="btn btn--ghost" onClick={onNewRun}>
          New run
        </button>
      ) : null}
      {variant === "shared" ? (
        <>
          <Link href="/" className="btn btn--ghost">
            Play your own
          </Link>
          {sameSeed !== null ? (
            <Link href={sameSeed} className="btn" data-testid="challenge-seed">
              Challenge this Seed
            </Link>
          ) : null}
          <Link href={builderHref} className="btn" data-testid="open-in-builder">
            Open in Builder
          </Link>
          {exhibition !== null ? (
            <Link href={exhibition} className="btn" data-testid="play-exhibition">
              Exhibition vs this squad
            </Link>
          ) : null}
        </>
      ) : null}
      <span className={s.status}>
        <span role="status" aria-live="polite">
          {downloadStatus(card.state) || link.said}
        </span>
        <span role="alert">{card.state.kind === "failed" ? DOWNLOAD_FAILED : ""}</span>
      </span>
      <ManualLink url={link.manual} />
    </div>
  );
}
