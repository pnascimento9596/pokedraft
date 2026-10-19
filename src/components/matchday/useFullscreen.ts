"use client";

import { useSyncExternalStore, type RefObject } from "react";

// Safari before 16.4 ships the API under a webkit prefix.
type FullscreenDocument = Document & {
  readonly webkitFullscreenEnabled?: boolean;
  readonly webkitFullscreenElement?: Element | null;
  readonly webkitExitFullscreen?: () => void;
};
type FullscreenElement = HTMLElement & { readonly webkitRequestFullscreen?: () => void };

const EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const;

function doc(): FullscreenDocument | null {
  return typeof document === "undefined" ? null : document;
}

// iPhone Safari sets neither flag: it only takes a video full screen, so the button stays hidden.
function enabled(): boolean {
  const d = doc();
  return d !== null && (d.fullscreenEnabled === true || d.webkitFullscreenEnabled === true);
}

function shown(): Element | null {
  const d = doc();
  return d?.fullscreenElement ?? d?.webkitFullscreenElement ?? null;
}

function subscribe(onChange: () => void): () => void {
  for (const e of EVENTS) document.addEventListener(e, onChange);
  return () => {
    for (const e of EVENTS) document.removeEventListener(e, onChange);
  };
}

const fixed = () => () => {};

/** Leaves full screen, whatever element holds it. */
export function exitFullscreen(): void {
  const d = document as FullscreenDocument;
  if (shown() === null) return;
  if (typeof d.exitFullscreen === "function") void d.exitFullscreen().catch(() => {});
  else d.webkitExitFullscreen?.();
}

/** Shows `el` full screen, or leaves full screen if something already is. */
export function toggleFullscreen(el: HTMLElement | null): void {
  if (shown() !== null) return exitFullscreen();
  const target = el as FullscreenElement | null;
  if (target === null) return;
  if (typeof target.requestFullscreen === "function")
    void target.requestFullscreen().catch(() => {});
  else target.webkitRequestFullscreen?.();
}

/** Whether the browser can show `target` full screen, and whether it is. */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const supported = useSyncExternalStore(fixed, enabled, () => false);
  const active = useSyncExternalStore(
    subscribe,
    () => target.current !== null && shown() === target.current,
    () => false,
  );
  return { supported, active };
}
