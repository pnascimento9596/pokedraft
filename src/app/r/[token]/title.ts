import type { Metadata } from "next";
import { CARD_SIZE, type ReplayedRun } from "@/components/share/card";
import { FINISH_LABEL, FRIENDLY_LABEL, record } from "@/ui/labels";

const BROKEN = "pokedraft: broken run link";

export function runTitle(run: ReplayedRun | null): string {
  if (run === null) return BROKEN;
  const { draft, cup } = run;
  const line = `${record(cup.wins, cup.draws, cup.losses)}, Team Score ${cup.rating.score}`;
  if (draft.settings.mode === "builder") return `pokedraft ${FRIENDLY_LABEL}: ${line}`;
  return `pokedraft run: ${line}`;
}

/**
 * A run link's preview: title, description and the run card with an alt that carries the result.
 * The `/r` page and the passcode gate (where gated preview bots land) both send it.
 */
export function runMetadata(token: string, run: ReplayedRun | null): Metadata {
  const title = runTitle(run);
  const image = {
    url: `/r/${encodeURIComponent(token)}/opengraph-image`,
    ...CARD_SIZE,
    alt:
      run === null
        ? BROKEN
        : `pokedraft run card: ${record(run.cup.wins, run.cup.draws, run.cup.losses)}, Team Score ${run.cup.rating.score}`,
  };
  const description =
    run === null
      ? undefined
      : `${FINISH_LABEL[run.cup.finish]} with ${run.draft.settings.formation}. Draft your own XI on pokedraft.`;
  const about = description === undefined ? {} : { description };
  return {
    title,
    ...about,
    openGraph: { title, ...about, images: [image] },
    twitter: { card: "summary_large_image", title, ...about, images: [image] },
  };
}
