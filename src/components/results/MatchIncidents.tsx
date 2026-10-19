import type { Incident } from "@/engine";
import { incidentLine, type ResultsVariant } from "./format";
import s from "./MatchIncidents.module.css";

const MARK: Readonly<Record<Incident["kind"], string>> = {
  injury: "Injury",
  sub: "Sub",
  yellow: "Yellow",
  red: "Red",
  tactic: "Tactic",
};

// Engine 6 logs injuries, substitutions, cards and tactic changes; a retained run has none.
export function MatchIncidents({
  incidents,
  team,
  variant = "live",
}: {
  readonly incidents: readonly Incident[] | undefined;
  readonly team: string;
  readonly variant?: ResultsVariant;
}) {
  if (incidents === undefined || incidents.length === 0) return null;
  return (
    <details className={s.incidents} data-testid="match-incidents">
      <summary>Match events ({incidents.length})</summary>
      <ol className={s.list} aria-label="Match events">
        {incidents.map((i, k) => (
          <li key={k} data-kind={i.kind} data-side={i.side}>
            <span className={s.mark} data-kind={i.kind}>
              {MARK[i.kind]}
            </span>
            <span>{incidentLine(i, team, variant)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
