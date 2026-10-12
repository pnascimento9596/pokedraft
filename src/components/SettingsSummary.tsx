import type { SummaryItem } from "@/ui/settingsSummary";
import s from "./SettingsSummary.module.css";

export function SettingsSummary({
  items,
  stacked = false,
}: {
  readonly items: readonly SummaryItem[];
  readonly stacked?: boolean;
}) {
  return (
    <dl className={s.summary} data-stacked={stacked}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="kicker">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
