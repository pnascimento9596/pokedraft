import type { ReactNode } from "react";
import { CARD_THEME } from "@/design/card-tokens";
import type { CupFinish, FormationId } from "@/engine";
import { ACHIEVEMENT_LABEL } from "@/ui/achievements";
import { FINISH_LABEL, FRIENDLY_LABEL } from "@/ui/labels";
import type { CardHeadline } from "./card";
import { PANEL_RECT } from "./card-layout";

const PAD = 22;

function Chip({
  children,
  bg = CARD_THEME.sunken,
  fg = CARD_THEME.ink,
}: {
  children: ReactNode;
  bg?: string;
  fg?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        padding: "5px 12px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1.5px solid ${CARD_THEME.border}`,
        fontSize: 19,
        fontWeight: 600,
      }}
    >
      {children}
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

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        borderRadius: CARD_THEME.radiusLg,
        background: `linear-gradient(160deg, ${CARD_THEME.frameHi}, ${CARD_THEME.frameLo})`,
        color: CARD_THEME.accentFg,
      }}
    >
      <div style={{ display: "flex", fontSize: 17, fontWeight: 700, letterSpacing: 3 }}>
        TEAM SCORE
      </div>
      <div style={{ display: "flex", fontSize: 100, fontWeight: 700, lineHeight: 1.05 }}>
        <TabularFigure value={String(score)} />
      </div>
    </div>
  );
}

function StatTile({
  letter,
  value,
  bg,
  fg,
}: {
  letter: string;
  value: number;
  bg: string;
  fg: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexGrow: 1,
        flexBasis: 0,
        padding: "8px 0 4px",
        borderRadius: CARD_THEME.radiusMd,
        background: bg,
        color: fg,
        border: `1.5px solid ${CARD_THEME.border}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ display: "flex", fontSize: 21, fontWeight: 700, letterSpacing: 2 }}>
        {letter}
      </div>
    </div>
  );
}

function Trophy() {
  return (
    <svg width={46} height={46} viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 5 H33 V19 C33 26 28.5 30 23 30 C17.5 30 13 26 13 19 Z"
        fill={CARD_THEME.goldInk}
      />
      <path
        d="M13 9 H6 C6 17 9 21 14 22 M33 9 H40 C40 17 37 21 32 22"
        stroke={CARD_THEME.goldInk}
        strokeWidth={3}
        fill="none"
      />
      <rect x={21} y={29} width={4} height={8} fill={CARD_THEME.goldInk} />
      <rect x={14} y={37} width={18} height={5} rx={2} fill={CARD_THEME.goldInk} />
    </svg>
  );
}

function FinishBadge({ finish }: { finish: CupFinish }) {
  if (finish === "champion") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "14px 0",
          borderRadius: CARD_THEME.radiusLg,
          background: `linear-gradient(160deg, ${CARD_THEME.goldHi}, ${CARD_THEME.goldLo})`,
          border: `2.5px solid ${CARD_THEME.goldEdge}`,
          color: CARD_THEME.goldInk,
        }}
      >
        <Trophy />
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>
          {FINISH_LABEL.champion}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 4px",
        borderRadius: CARD_THEME.radiusLg,
        background: CARD_THEME.sunken,
        border: `2px solid ${CARD_THEME.border}`,
        color: CARD_THEME.ink,
        fontSize: 20,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {FINISH_LABEL[finish]}
    </div>
  );
}

function ProgressBlock({ placed }: { placed: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flexGrow: 1,
        marginTop: 18,
        padding: "0 18px",
        borderRadius: CARD_THEME.radiusLg,
        background: CARD_THEME.sunken,
        border: `2px dashed ${CARD_THEME.border}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
        Lineup in progress
      </div>
      <div
        style={{ display: "flex", alignItems: "baseline", marginTop: 14, color: CARD_THEME.accent }}
      >
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, lineHeight: 1 }}>
          {placed}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: CARD_THEME.soft }}>
          /11
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontSize: 22,
          fontWeight: 600,
          color: CARD_THEME.soft,
        }}
      >
        starters picked
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
        {Array.from({ length: 11 }, (_, k) => (
          <div
            key={k}
            style={{
              display: "flex",
              flexGrow: 1,
              height: 14,
              borderRadius: 4,
              background: k < placed ? CARD_THEME.accent : CARD_THEME.border,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ResultPanel({
  headline,
  formation,
  placed,
}: {
  headline: CardHeadline;
  formation: FormationId;
  placed: number;
}) {
  const run = headline.kind === "run" ? headline : null;
  return (
    <div
      style={{
        position: "absolute",
        left: PANEL_RECT.left,
        top: PANEL_RECT.top,
        width: PANEL_RECT.width,
        height: PANEL_RECT.height,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        borderRadius: 22,
        background: `linear-gradient(180deg, ${CARD_THEME.emphasis}, ${CARD_THEME.surface})`,
        border: `2px solid ${CARD_THEME.border}`,
        boxShadow: `0 10px 26px ${CARD_THEME.panelShadow}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: 1 }}>
        <span>POKE</span>
        <span style={{ color: CARD_THEME.accent }}>DRAFT</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {run === null ? (
          <Chip>Builder lineup</Chip>
        ) : run.friendly ? (
          <Chip bg={CARD_THEME.okBg} fg={CARD_THEME.ok}>
            {FRIENDLY_LABEL}
          </Chip>
        ) : (
          <Chip>{run.mode}</Chip>
        )}
        <Chip>{formation}</Chip>
        {run?.coached ? (
          <Chip bg={CARD_THEME.accent} fg={CARD_THEME.accentFg}>
            Coached
          </Chip>
        ) : null}
        {run?.achievement ? (
          <Chip bg={CARD_THEME.goldHi} fg={CARD_THEME.goldInk}>
            {ACHIEVEMENT_LABEL[run.achievement]}
          </Chip>
        ) : null}
      </div>
      {headline.score === null ? (
        <ProgressBlock placed={placed} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginTop: 18 }}>
          <ScoreBadge score={headline.score} />
        </div>
      )}
      {run === null && headline.score !== null ? (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "16px 4px",
              borderRadius: CARD_THEME.radiusLg,
              background: CARD_THEME.okBg,
              border: `2px solid ${CARD_THEME.border}`,
              color: CARD_THEME.ok,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Lineup complete
          </div>
        </div>
      ) : null}
      {run === null ? null : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <StatTile letter="W" value={run.wins} bg={CARD_THEME.winBg} fg={CARD_THEME.ok} />
            <StatTile letter="D" value={run.draws} bg={CARD_THEME.drawBg} fg={CARD_THEME.soft} />
            <StatTile letter="L" value={run.losses} bg={CARD_THEME.lossBg} fg={CARD_THEME.loss} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
            <FinishBadge finish={run.finish} />
          </div>
        </div>
      )}
    </div>
  );
}
