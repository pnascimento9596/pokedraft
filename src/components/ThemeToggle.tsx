"use client";

import { useEffect, useSyncExternalStore } from "react";
import { readJson, writeJson } from "@/ui/storage";
import { THEME_KEY, applyTheme, bootTheme, type Theme } from "@/ui/theme";

const NEXT: Readonly<Record<Theme, Theme>> = { system: "dark", dark: "light", light: "system" };
const LABEL: Readonly<Record<Theme, string>> = {
  system: "Auto",
  dark: "Night",
  light: "Day",
};

const listeners = new Set<() => void>();
// The last choice made in this tab, so the toggle still moves when storage is blocked.
let chosen: Theme = "system";

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storedChoice(): Theme {
  const saved = readJson<unknown>(THEME_KEY, chosen);
  return typeof saved === "string" && saved in NEXT ? (saved as Theme) : "system";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, storedChoice, () => "system" as const);

  useEffect(() => {
    if (document.documentElement.hasAttribute("data-theme")) return;
    return bootTheme(storedChoice);
  }, []);

  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      aria-label={`Theme: ${LABEL[theme].toLowerCase()}. Change theme`}
      onClick={() => {
        const next = NEXT[theme];
        chosen = next;
        writeJson(THEME_KEY, next);
        applyTheme(next);
        for (const notify of listeners) notify();
      }}
    >
      {LABEL[theme]}
    </button>
  );
}
