import type { Metadata } from "next";
import { CARD_SIZE } from "@/components/share/card";
import { rateTeam, type DraftState, type FullLineup } from "@/engine";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { filledCount } from "@/ui/lineup";

export function builderTokenFromUrl(url: Pick<URL, "pathname" | "searchParams">): string | null {
  if (url.pathname !== "/") return null;
  const payloads = url.searchParams.getAll("b");
  if (payloads.length !== 1 || !payloads[0]) return null;
  return payloads[0];
}

export function builderTitle(draft: DraftState | null): string {
  if (draft === null) return "pokedraft";
  const full = filledCount(draft.lineup) === 16;
  const formation = draft.settings.formation;
  if (full) {
    const score = rateTeam(draft.lineup as FullLineup).score;
    return `pokedraft squad: ${formation}, Team Score ${score}`;
  }
  const placed = draft.lineup.starters.filter((id) => id !== null).length;
  return `pokedraft squad: ${formation} (${placed}/11 placed)`;
}

export function builderMetadata(token: string, draft?: DraftState | null): Metadata {
  const resolved = draft === undefined ? draftFromBuilderToken(token) : draft;
  if (resolved === null) return { title: "pokedraft" };

  const full = filledCount(resolved.lineup) === 16;
  const formation = resolved.settings.formation;
  const placed = resolved.lineup.starters.filter((id) => id !== null).length;
  const score = full ? rateTeam(resolved.lineup as FullLineup).score : null;

  const title =
    score !== null
      ? `pokedraft squad: ${formation}, Team Score ${score}`
      : `pokedraft squad: ${formation} (${placed}/11 placed)`;
  const description =
    score !== null
      ? `${formation} squad with Team Score ${score}. Build your own XI on pokedraft.`
      : `${formation} lineup with ${placed} of 11 starters. Build your own XI on pokedraft.`;
  const alt =
    score !== null
      ? `pokedraft squad card: ${formation}, Team Score ${score}`
      : `pokedraft squad card: ${formation} (${placed}/11 placed)`;

  const image = {
    url: `/card?b=${encodeURIComponent(token)}`,
    ...CARD_SIZE,
    alt,
  };

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
