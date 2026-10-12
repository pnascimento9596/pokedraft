import { CARD_THEME } from "@/design/card-tokens";
import {
  FORMATIONS,
  rateTeam,
  type CupResult,
  type DraftState,
  type CupFinish,
  type FormationId,
  type FullLineup,
  type Lineup,
  type SpeciesId,
} from "@/engine";
import { MODE_LABEL, STYLE_LABEL } from "@/ui/labels";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { filledCount } from "@/ui/lineup";
import type { CardSource } from "./download";
import { CARD_SIZE, tokenBoxes } from "./card-layout";
import { Pitch } from "./card-pitch";
import { ResultPanel } from "./card-panel";
import { Token, type CardImages } from "./card-token";

export { CARD_SIZE, tokenImageRect } from "./card-layout";
export type { CardImages } from "./card-token";

export type CardHeadline =
  | {
      readonly kind: "run";
      readonly mode: string;
      readonly friendly: boolean;
      readonly score: number;
      readonly wins: number;
      readonly draws: number;
      readonly losses: number;
      readonly finish: CupFinish;
    }
  | { readonly kind: "lineup"; readonly score: number | null };

export interface CardModel {
  readonly formation: FormationId;
  readonly starters: readonly (SpeciesId | null)[];
  readonly headline: CardHeadline;
}

function isFull(lineup: Lineup): lineup is FullLineup {
  return filledCount(lineup) === 16;
}

export interface ReplayedRun {
  readonly draft: DraftState;
  readonly cup: CupResult;
}

export function runCardModel({ draft, cup }: ReplayedRun): CardModel {
  const st = draft.settings;
  return {
    formation: st.formation,
    starters: draft.lineup.starters,
    headline: {
      kind: "run",
      mode:
        st.mode === "cup8" ? `${MODE_LABEL.cup8}, ${STYLE_LABEL[st.style]}` : MODE_LABEL[st.mode],
      friendly: st.mode === "builder",
      score: cup.rating.score,
      wins: cup.wins,
      draws: cup.draws,
      losses: cup.losses,
      finish: cup.finish,
    },
  };
}

export function cardModel(
  source: CardSource,
  replayRun: (token: string) => ReplayedRun,
): CardModel | null {
  if ("t" in source) {
    try {
      return runCardModel(replayRun(source.t));
    } catch {
      return null;
    }
  }
  const draft = draftFromBuilderToken(source.b);
  if (draft === null) return null;
  return {
    formation: draft.settings.formation,
    starters: draft.lineup.starters,
    headline: { kind: "lineup", score: isFull(draft.lineup) ? rateTeam(draft.lineup).score : null },
  };
}

export function Card({
  model,
  images = new Map(),
  mirror = true,
}: {
  model: CardModel;
  images?: CardImages;
  mirror?: boolean;
}) {
  const slots = FORMATIONS[model.formation].slots;
  const boxes = tokenBoxes(model.formation);
  const filled = model.starters.map((id) => id !== null);
  return (
    <div
      style={{
        position: "relative",
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        display: "flex",
        background: `linear-gradient(135deg, ${CARD_THEME.canvasHi}, ${CARD_THEME.canvasLo})`,
        color: CARD_THEME.ink,
        fontFamily: "Inter",
      }}
    >
      <Pitch boxes={boxes} filled={filled} />
      {slots.map((slot, i) => (
        <Token
          key={slot.id}
          box={boxes[i]!}
          id={model.starters[i] ?? null}
          label={slot.label}
          images={images}
          mirror={mirror && slot.y > 50}
        />
      ))}
      <ResultPanel
        headline={model.headline}
        formation={model.formation}
        placed={filled.filter(Boolean).length}
      />
    </div>
  );
}
