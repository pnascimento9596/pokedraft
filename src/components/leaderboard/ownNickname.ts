"use client";

import { useSyncExternalStore } from "react";
import { parseNickname } from "@/leaderboard/nickname";
import { readJson } from "@/ui/storage";

export const NICKNAME_KEY = "pokedraft:nickname";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// The stored nickname as the server would have saved it, so it compares exactly with board rows.
function storedNickname(): string | null {
  const raw = readJson<unknown>(NICKNAME_KEY, null);
  if (typeof raw !== "string") return null;
  const parsed = parseNickname(raw);
  return parsed.ok ? parsed.nickname : null;
}

/** The nickname this browser last submitted under, or null. Null on the server and at hydration. */
export function useOwnNickname(): string | null {
  return useSyncExternalStore(subscribe, storedNickname, () => null);
}
