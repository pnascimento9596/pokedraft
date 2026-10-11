"use client";

import { useState } from "react";
import { downloadCard, type CardSource } from "./download";

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

// One download at a time: callers disable the button while busy, and a rejection always lands in
// the failed state instead of escaping as an unhandled promise.
export function useCardDownload() {
  const [state, setState] = useState<CardDownload>({ kind: "idle" });

  const start = async (source: CardSource, filename: string) => {
    setState({ kind: "busy" });
    try {
      const how = await downloadCard(source, filename);
      setState(how === "cancelled" ? { kind: "idle" } : { kind: "done", text: DONE_TEXT[how] });
    } catch {
      setState({ kind: "failed" });
    }
  };

  const reset = () => setState({ kind: "idle" });

  return { state, start, reset };
}
