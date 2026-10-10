import {
  FORMATIONS,
  rateTeam,
  replay,
  speciesById,
  type CupFinish,
  type FormationId,
  type FullLineup,
  type Lineup,
  type SpeciesId,
} from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { FINISH_LABEL, FRIENDLY_LABEL, MODE_LABEL, STYLE_LABEL, record } from "@/ui/labels";
import { draftFromBuilderToken, filledCount } from "@/ui/lineup";
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

export function cardModel(source: CardSource): CardModel | null {
  if ("t" in source) {
    let run: ReturnType<typeof replay>;
    try {
      run = replay(source.t);
    } catch {
      return null;
    }
    const { draft, cup } = run;
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
  const draft = draftFromBuilderToken(source.b);
  if (draft === null) return null;
  return {
    formation: draft.settings.formation,
    starters: draft.lineup.starters,
    headline: { kind: "lineup", score: isFull(draft.lineup) ? rateTeam(draft.lineup).score : null },
  };
}

const INK = "#eef6f0";
const SOFT = "#a9bcb0";
const FLOOD = "#ffd23f";
const CHALK = "rgba(255,255,255,0.8)";
const PITCH_W = 760;
const PITCH_H = 492;

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

// Satori fetches glyphs it lacks from the network, so names are kept to the default font.
function cardName(name: string): string {
  return name.replace("♀", " F").replace("♂", " M").replace("’", "'");
}

function Token({ id, label, x, y }: { id: SpeciesId | null; label: string; x: number; y: number }) {
  const species = id === null ? null : speciesById(id);
  return (
    <div
      style={{
        position: "absolute",
        left: 20 + (y / 100) * (PITCH_W - 40) - 60,
        top: 16 + (x / 100) * (PITCH_H - 32) - 40,
        width: 120,
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
        <PlayerImage dexId={species.id} size={52} alt={species.name} />
      )}
      <div
        style={{
          display: "flex",
          marginTop: 4,
          padding: "1px 6px",
          borderRadius: 4,
          background: "rgba(5,11,8,0.82)",
          color: INK,
          fontSize: 15,
          fontWeight: 700,
          maxWidth: 120,
        }}
      >
        {species === null ? label : cardName(species.name)}
      </div>
    </div>
  );
}

export function Card({ model }: { model: CardModel }) {
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
        background: "linear-gradient(135deg, #0e1d16 0%, #060d0a 100%)",
        color: INK,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: PITCH_W,
          height: PITCH_H,
          borderRadius: 14,
          background:
            "repeating-linear-gradient(90deg, #0f5a32 0px, #0f5a32 69px, #0c4f2b 69px, #0c4f2b 138px)",
          boxShadow: "0 0 0 8px #093d21",
        }}
      >
        <Markings />
        {slots.map((sl, i) => (
          <Token key={sl.id} id={model.starters[i] ?? null} label={sl.label} x={sl.x} y={sl.y} />
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
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>
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
              borderRadius: 4,
              background: "#ffffff",
              color: "#0b1f14",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {FRIENDLY_LABEL}
          </div>
        ) : null}
        <div style={{ display: "flex", marginTop: 18, fontSize: 22, color: SOFT }}>
          {`Formation ${model.formation}`}
        </div>
        {score === null ? (
          <div style={{ display: "flex", marginTop: 24, fontSize: 34, fontWeight: 800 }}>
            Lineup in progress
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 20, alignItems: "stretch" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                background: INK,
                color: "#08130e",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              TEAM SCORE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                background: FLOOD,
                color: "#1d1600",
                fontSize: 52,
                fontWeight: 800,
              }}
            >
              {score}
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
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {h.record}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 6,
                fontSize: 28,
                fontWeight: 700,
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
