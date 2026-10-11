"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DOWNLOAD_FAILED,
  downloadStatus,
  useCardDownload,
} from "@/components/share/useCardDownload";
import s from "./ResultsView.module.css";

export function ShareActions({
  token,
  variant,
  onNewRun,
}: {
  token: string;
  variant: "live" | "shared";
  onNewRun?: () => void;
}) {
  const [copied, setCopied] = useState("");
  const card = useCardDownload();

  const share = async () => {
    const url = `${location.origin}/r/${token}`;
    card.reset();
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Link copied");
    } catch {
      setCopied("Could not copy the link");
    }
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
        <Link href="/" className="btn btn--ghost">
          Play your own
        </Link>
      ) : null}
      <span className={s.status}>
        <span role="status" aria-live="polite">
          {downloadStatus(card.state) || copied}
        </span>
        <span role="alert">{card.state.kind === "failed" ? DOWNLOAD_FAILED : ""}</span>
      </span>
    </div>
  );
}
