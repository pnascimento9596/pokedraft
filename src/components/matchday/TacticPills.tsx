import { TACTICS, type Tactic } from "@/engine/types";
import { TACTIC_HINT } from "@/components/results/format";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import { tacticEdge, type Edge, type OpponentStyle } from "@/ui/manager/intel";
import s from "./TacticPills.module.css";

const EDGE_BADGE: Readonly<Record<Edge, { readonly glyph: string; readonly word: string }>> = {
  favourable: { glyph: "▲", word: "Edge" },
  neutral: { glyph: "=", word: "Even" },
  unfavourable: { glyph: "▼", word: "Avoid" },
};

/** The five tactics as pressable pills, shared by the pre-match card and the touchline. */
export function TacticPills({
  label,
  value,
  style,
  disabled = false,
  dense = false,
  onPick,
}: {
  readonly label: string;
  readonly value: Tactic;
  /** The opponent's style; each pill shows its edge against it, when the style has edges. */
  readonly style?: OpponentStyle;
  readonly disabled?: boolean;
  /** One row of names without hints below 600px, for the collapsed touchline sheet. */
  readonly dense?: boolean;
  readonly onPick: (tactic: Tactic) => void;
}) {
  return (
    <div className={s.tactics} role="group" aria-label={label} data-dense={dense || undefined}>
      {TACTICS.map((t) => {
        const edge = tacticEdge(style, t);
        return (
          <button
            key={t}
            type="button"
            className={s.tactic}
            aria-pressed={value === t}
            disabled={disabled}
            data-testid={`tactic-${t}`}
            onClick={() => onPick(t)}
          >
            <span className={s.tacticName}>{TACTIC_LABEL[t]}</span>
            {edge !== null ? (
              <span className={s.edge} data-edge={edge} data-testid={`edge-${t}`}>
                <span aria-hidden="true">{EDGE_BADGE[edge].glyph}</span>
                <span className={s.edgeWord}>{EDGE_BADGE[edge].word}</span>
              </span>
            ) : null}
            <span className={s.tacticHint}>{TACTIC_HINT[t]}</span>
          </button>
        );
      })}
    </div>
  );
}
