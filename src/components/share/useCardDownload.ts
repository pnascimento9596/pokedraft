"use client";

import { useEffect, useRef, useState } from "react";
import { readSettings } from "@/images/settings";
import { cardHref, deliverCard, fetchCard, type CardShare, type CardSource } from "./download";
import { isCoarsePointer } from "./shareLink";

export type CardDownload =
  | { readonly kind: "idle" }
  | { readonly kind: "busy" }
  | { readonly kind: "done"; readonly text: string }
  | { readonly kind: "failed" };

export const DOWNLOAD_FAILED = "Download failed. Try again.";

const DONE_TEXT = { shared: "Image shared", saved: "Image saved" } as const;

/** The status line for busy and done; a failure goes to an alert instead. */
export function downloadStatus(state: CardDownload): string {
  if (state.kind === "busy") return "Preparing image";
  return state.kind === "done" ? state.text : "";
}

interface Prefetched {
  readonly href: string;
  readonly blob: Promise<Blob>;
}

function saveData(): boolean {
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function whenIdle(run: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(run);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 1500);
  return () => clearTimeout(id);
}

// A phone hands the PNG to the share sheet, which needs the tap's activation. Rendering the card
// after the tap can outlive it, so a phone fetches the card ahead. A desktop downloads through a
// link that needs no activation, and a prefetch there would cost a /card render per results view.
function usePrefetch(source: CardSource | undefined) {
  const ready = useRef<Prefetched | null>(null);
  const href = source === undefined ? null : cardHref(source, readSettings());
  useEffect(() => {
    if (href === null || !isCoarsePointer() || saveData()) return;
    return whenIdle(() => {
      const blob = fetchCard(href);
      blob.catch(() => {});
      ready.current = { href, blob };
    });
  }, [href]);
  return ready;
}

// One download at a time: callers disable the button while busy, and a rejection always lands in
// the failed state instead of escaping as an unhandled promise.
export function useCardDownload(prefetch?: CardSource) {
  const [state, setState] = useState<CardDownload>({ kind: "idle" });
  const ready = usePrefetch(prefetch);

  const start = async (source: CardSource, filename: string, share: CardShare) => {
    setState({ kind: "busy" });
    try {
      const href = cardHref(source, readSettings());
      const early = ready.current?.href === href ? ready.current.blob : null;
      const blob = await (early === null ? fetchCard(href) : early.catch(() => fetchCard(href)));
      const how = await deliverCard(blob, filename, share);
      setState(how === "cancelled" ? { kind: "idle" } : { kind: "done", text: DONE_TEXT[how] });
    } catch {
      setState({ kind: "failed" });
    }
  };

  const reset = () => setState({ kind: "idle" });

  return { state, start, reset };
}
