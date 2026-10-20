"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function media(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;
}

/** The preference right now, for a one-off choice such as a scroll behaviour. */
export function prefersReducedMotion(): boolean {
  return media()?.matches ?? false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = media();
      mq?.addEventListener("change", onChange);
      return () => mq?.removeEventListener("change", onChange);
    },
    () => media()?.matches ?? false,
    () => false,
  );
}
