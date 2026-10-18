"use client";

import Link from "next/link";
import { useState } from "react";
import { GENS, type DraftState } from "@/engine/types";
import { builderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";
import { DEFAULT_PANEL, playHref } from "@/ui/settings";
import { runHref } from "@/ui/run-link";
import { copyLink } from "@/components/share/copyLink";
import {
  DOWNLOAD_FAILED,
  downloadStatus,
  useCardDownload,
} from "@/components/share/useCardDownload";
import s from "./ResultsView.module.css";
import { ExhibitionMatchModal } from "./ExhibitionMatchModal";

export function ShareActions({
  token,
  variant,
  draft,
  onNewRun,
}: {
  token: string;
  variant: "live" | "shared";
  draft: DraftState;
  onNewRun?: () => void;
}) {
  const [copied, setCopied] = useState("");
  const [exhibition, setExhibition] = useState(false);
  const card = useCardDownload();
  const settings = draft.settings;
  const builderHref = `/?b=${builderToken(
    { mode: "builder", formation: draft.lineup.formation, gens: GENS, legendaries: true },
    draft.lineup,
    BUILDER_URL_SEED,
  )}`;
  const challengeHref =
    settings.mode === "builder"
      ? null
      : playHref(
          settings.mode,
          {
            ...DEFAULT_PANEL,
            formation: settings.formation,
            order: settings.order,
            ...(settings.mode === "cup8" ? { gens: settings.gens, style: settings.style } : {}),
          },
          draft.seed,
        );

  const share = async () => {
    card.reset();
    setCopied(await copyLink(runHref(token)));
  };

  const download = () => {
    setCopied("");
    void card.start({ t: token }, "pokedraft-run.png");
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
          {challengeHref !== null ? (
            <Link href={challengeHref} className="btn" data-testid="challenge-seed">
              Challenge this Seed
            </Link>
          ) : null}
          <Link href={builderHref} className="btn" data-testid="open-in-builder">
            Open in Builder
          </Link>
          <button
            type="button"
            className="btn"
            data-testid="play-exhibition"
            onClick={() => setExhibition(true)}
          >
            Play Exhibition vs Squad
          </button>
        </>
      ) : null}
      <span className={s.status}>
        <span role="status" aria-live="polite">
          {downloadStatus(card.state) || copied}
        </span>
        <span role="alert">{card.state.kind === "failed" ? DOWNLOAD_FAILED : ""}</span>
      </span>
      {exhibition ? (
        <ExhibitionMatchModal opponent={draft} onClose={() => setExhibition(false)} />
      ) : null}
    </div>
  );
}
