"use client";

import Link from "next/link";
import { useState } from "react";
import { downloadCard } from "@/components/share/download";
import s from "./ResultsView.module.css";

type Status = { kind: "idle" } | { kind: "busy" } | { kind: "message"; text: string };

export function ShareActions({
  token,
  variant,
  onNewRun,
}: {
  token: string;
  variant: "live" | "shared";
  onNewRun?: () => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const share = async () => {
    const url = `${location.origin}/r/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ kind: "message", text: "Link copied" });
    } catch {
      setStatus({ kind: "message", text: "Could not copy the link" });
    }
  };

  const download = async () => {
    setStatus({ kind: "busy" });
    try {
      await downloadCard({ t: token }, "pokedraft-run.png");
      setStatus({ kind: "message", text: "Image saved" });
    } catch {
      setStatus({ kind: "message", text: "Download failed" });
    }
  };

  return (
    <div className={s.actions}>
      <button type="button" className="btn btn--primary" onClick={share}>
        Share
      </button>
      <button type="button" className="btn" onClick={download} disabled={status.kind === "busy"}>
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
      <span className={s.status} role="status" aria-live="polite">
        {status.kind === "message" ? status.text : status.kind === "busy" ? "Preparing image" : ""}
      </span>
    </div>
  );
}
