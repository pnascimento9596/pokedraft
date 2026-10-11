import { CARD_THEME } from "@/design/card-tokens";
import {
  FORMATIONS,
  rateTeam,
  speciesById,
  type CupResult,
  type DraftState,
  type CupFinish,
  type FormationId,
  type FullLineup,
  type Lineup,
  type SpeciesId,
} from "@/engine";
import { StaticPlayerImage } from "@/components/PlayerPicture";
import { FINISH_LABEL, FRIENDLY_LABEL, MODE_LABEL, STYLE_LABEL, record } from "@/ui/labels";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { filledCount } from "@/ui/lineup";
import type { CardSource } from "./download";

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export type CardHeadline =
  | {
      readonly kind: "run";
      readonly mode: string;
      readonly friendly: boolean;
      readonly score: number;
      readonly record: string;
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
      record: record(cup.wins, cup.draws, cup.losses),
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

const INK = CARD_THEME.ink;
const SOFT = CARD_THEME.soft;
const FLOOD = CARD_THEME.accent;
const CHALK = CARD_THEME.line;
const PITCH_W = 760;
const PITCH_H = 492;
const CARD_PAD_X = 40;
const CARD_PAD_Y = (CARD_SIZE.height - PITCH_H) / 2;
const TOKEN_W = 120;
const TOKEN_IMAGE = 52;

export interface CardSlot {
  readonly x: number;
  readonly y: number;
}

/** Where a slot's picture sits on the finished 1200x630 card, in pixels. */
export function tokenImageRect(slot: CardSlot): { left: number; top: number; size: number } {
  return {
    left: Math.round(
      CARD_PAD_X + 20 + (slot.y / 100) * (PITCH_W - 40) - TOKEN_W / 2 + (TOKEN_W - TOKEN_IMAGE) / 2,
    ),
    top: Math.round(CARD_PAD_Y + 16 + (slot.x / 100) * (PITCH_H - 32) - 40),
    size: TOKEN_IMAGE,
  };
}

/** Pictures for the species on a card: data URIs by Dex id, null when a pack lacks one. */
export type CardImages = ReadonlyMap<number, string | null>;

function Line(style: Record<string, string | number>) {
  return (
    <div
      style={{ position: "absolute", display: "flex", border: `3px solid ${CHALK}`, ...style }}
    />
  );
}

function Markings() {
  return (
    <>
      {Line({ left: 0, top: 0, width: PITCH_W, height: PITCH_H })}
      {Line({
        left: PITCH_W / 2 - 1.5,
        top: 0,
        width: 0,
        height: PITCH_H,
        borderWidth: "0 0 0 3px",
      })}
      {Line({
        left: PITCH_W / 2 - 66,
        top: PITCH_H / 2 - 66,
        width: 132,
        height: 132,
        borderRadius: 66,
      })}
      {Line({ left: 0, top: PITCH_H * 0.205, width: PITCH_W * 0.157, height: PITCH_H * 0.59 })}
      {Line({
        left: PITCH_W * 0.843,
        top: PITCH_H * 0.205,
        width: PITCH_W * 0.157,
        height: PITCH_H * 0.59,
      })}
      {Line({ left: 0, top: PITCH_H * 0.365, width: PITCH_W * 0.052, height: PITCH_H * 0.27 })}
      {Line({
        left: PITCH_W * 0.948,
        top: PITCH_H * 0.365,
        width: PITCH_W * 0.052,
        height: PITCH_H * 0.27,
      })}
    </>
  );
}

function cardName(name: string): string {
  return name.replace("♀", " F").replace("♂", " M").replace("’", "'");
}

function Token({
  id,
  label,
  x,
  y,
  images,
  mirror,
}: {
  id: SpeciesId | null;
  label: string;
  x: number;
  y: number;
  images: CardImages;
  mirror: boolean;
}) {
  const species = id === null ? null : speciesById(id);
  return (
    <div
      style={{
        position: "absolute",
        left: 20 + (y / 100) * (PITCH_W - 40) - 60,
        top: 16 + (x / 100) * (PITCH_H - 32) - 40,
        width: TOKEN_W,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {species === null ? (
        <div
          style={{
            display: "flex",
            width: 52,
            height: 52,
            borderRadius: 26,
            border: `2px dashed ${CHALK}`,
          }}
        />
      ) : (
        <StaticPlayerImage
          dexId={species.id}
          size={TOKEN_IMAGE}
          alt={species.name}
          src={images.get(species.id) ?? null}
          mirror={mirror && y > 50}
        />
      )}
      <div
        style={{
          display: "flex",
          marginTop: 4,
          padding: "1px 6px",
          borderRadius: CARD_THEME.radiusSm,
          background: CARD_THEME.accent,
          color: CARD_THEME.accentFg,
          fontSize: 15,
          fontWeight: 600,
          maxWidth: 120,
        }}
      >
        {species === null ? label : cardName(species.name)}
      </div>
    </div>
  );
}

function TabularFigure({ value }: { readonly value: string }) {
  return (
    <span style={{ display: "flex" }}>
      {[...value].map((char, index) => (
        <span
          key={index}
          style={{
            display: "flex",
            justifyContent: "center",
            width: /[0-9]/.test(char) ? "0.67em" : "0.4em",
            flexShrink: 0,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
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
  const h = model.headline;
  const score = h.score === null ? null : String(h.score);
  return (
    <div
      style={{
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        background: CARD_THEME.canvas,
        color: INK,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: PITCH_W,
          height: PITCH_H,
          borderRadius: 14,
          background: `repeating-linear-gradient(90deg, ${CARD_THEME.pitch} 0px, ${CARD_THEME.pitch} 69px, ${CARD_THEME.stripe} 69px, ${CARD_THEME.stripe} 138px)`,
          boxShadow: `0 0 0 8px ${CARD_THEME.emphasis}`,
        }}
      >
        <Markings />
        {slots.map((sl, i) => (
          <Token
            key={sl.id}
            id={model.starters[i] ?? null}
            label={sl.label}
            x={sl.x}
            y={sl.y}
            images={images}
            mirror={mirror}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: 36,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: 2 }}>
          <span>POKE</span>
          <span style={{ color: FLOOD }}>DRAFT</span>
        </div>
        {h.kind === "run" && h.friendly ? null : (
          <div style={{ display: "flex", marginTop: 6, fontSize: 22, color: SOFT }}>
            {h.kind === "run" ? h.mode : "Builder lineup"}
          </div>
        )}
        {h.kind === "run" && h.friendly ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 10,
              padding: "4px 12px",
              borderRadius: CARD_THEME.radiusSm,
              background: CARD_THEME.okBg,
              color: CARD_THEME.ok,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {FRIENDLY_LABEL}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 6, marginTop: 18, fontSize: 22, color: SOFT }}>
          Formation <TabularFigure value={model.formation} />
        </div>
        {score === null ? (
          <div style={{ display: "flex", marginTop: 24, fontSize: 34, fontWeight: 600 }}>
            Lineup in progress
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 20, alignItems: "stretch" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                background: CARD_THEME.sunken,
                color: INK,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              TEAM SCORE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                background: CARD_THEME.accent,
                color: CARD_THEME.accentFg,
                fontSize: 52,
                fontWeight: 600,
              }}
            >
              <TabularFigure value={score} />
            </div>
          </div>
        )}
        {h.kind === "run" ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 96,
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              <TabularFigure value={h.record} />
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 6,
                fontSize: 28,
                fontWeight: 600,
                color: h.finish === "champion" ? FLOOD : INK,
              }}
            >
              {FINISH_LABEL[h.finish]}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
