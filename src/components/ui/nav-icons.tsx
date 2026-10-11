import { BookOpen, CalendarDays, Gamepad2, History, Trophy } from "lucide-react";
import { IconTile } from "./primitives";

export const NAV_ICONS = {
  play: { icon: Gamepad2, color: "var(--viz-1)", href: "/play", label: "Play" },
  daily: { icon: CalendarDays, color: "var(--viz-2)", href: "/daily", label: "Daily" },
  leaderboard: { icon: Trophy, color: "var(--viz-4)", href: "/leaderboard", label: "Leaderboard" },
  history: { icon: History, color: "var(--viz-6)", href: "/history", label: "History" },
  help: { icon: BookOpen, color: "var(--viz-7)", href: "/how-to-play", label: "How to play" },
} as const;

export type NavFamily = keyof typeof NAV_ICONS;

export function NavIcon({ family }: { readonly family: NavFamily }) {
  const entry = NAV_ICONS[family];
  return <IconTile icon={entry.icon} color={entry.color} />;
}
