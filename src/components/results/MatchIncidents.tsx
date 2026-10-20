import type { Incident } from "@/engine";
import { incidentLine, listedIncidents, type ResultsVariant } from "./format";
import s from "./MatchIncidents.module.css";

const MARK: Readonly<Record<Incident["kind"], string>> = {
  injury: "Injury",
  sub: "Sub",
  yellow: "Yellow",
  red: "Red",
  tactic: "Tactic",
  penalty: "Penalty",
  rotate: "Rested",
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
  const listed = listedIncidents(incidents);
  return (
    <details className={s.incidents} data-testid="match-incidents">
      <summary>Match events ({listed.length})</summary>
      <ol className={s.list} aria-label="Match events">
        {listed.map((i, k) => (
          <li key={k} data-kind={i.kind} data-side={i.side}>
            <span className={s.mark} data-kind={i.kind}>
              {MARK[i.kind]}
            </span>
            <span>{incidentLine(i, team, variant, incidents)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
