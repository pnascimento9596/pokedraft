import { TACTICS, type Tactic } from "@/engine/types";
import { TACTIC_HINT } from "@/components/results/format";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import s from "./TacticPills.module.css";

/** The five tactics as pressable pills, shared by the pre-match card and the touchline. */
export function TacticPills({
  label,
  value,
  disabled = false,
  dense = false,
  onPick,
}: {
  readonly label: string;
  readonly value: Tactic;
  readonly disabled?: boolean;
  /** One row of names without hints below 600px, for the collapsed touchline sheet. */
  readonly dense?: boolean;
  readonly onPick: (tactic: Tactic) => void;
}) {
  return (
    <div className={s.tactics} role="group" aria-label={label} data-dense={dense || undefined}>
      {TACTICS.map((t) => (
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
          <span className={s.tacticHint}>{TACTIC_HINT[t]}</span>
        </button>
      ))}
    </div>
  );
}
