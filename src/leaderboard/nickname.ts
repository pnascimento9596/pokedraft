import { NICKNAME_MAX, NICKNAME_MIN } from "./contract";

const ALLOWED = /^[\p{L}\p{N} _.\-]+$/u;

// A light filter for one friend group, not a moderation system.
const BLOCKED = [
  "fuck",
  "shit",
  "cunt",
  "bitch",
  "whore",
  "slut",
  "nigg",
  "fag",
  "retard",
  "rape",
  "nazi",
  "hitler",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

export type NicknameResult =
  | { readonly ok: true; readonly nickname: string }
  | { readonly ok: false; readonly reason: "length" | "characters" | "blocked" };

export function parseNickname(raw: string): NicknameResult {
  const nickname = raw.trim().replace(/\s+/g, " ");
  const length = [...nickname].length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) return { ok: false, reason: "length" };
  if (!ALLOWED.test(nickname)) return { ok: false, reason: "characters" };
  const folded = [...nickname.toLowerCase()]
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^\p{L}]/gu, "");
  if (BLOCKED.some((w) => folded.includes(w))) return { ok: false, reason: "blocked" };
  return { ok: true, nickname };
}
