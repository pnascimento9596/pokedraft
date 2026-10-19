import Link from "next/link";
import type { SummaryItem } from "@/ui/settingsSummary";
import s from "./SettingsSummary.module.css";

export function SettingsSummary({
  items,
  editHref,
}: {
  readonly items: readonly SummaryItem[];
  readonly editHref?: string;
}) {
  return (
    <div className={s.wrap}>
      <dl className={s.summary}>
        {items.map(({ label, value }) => (
          <div key={label}>
            <dt className="kicker">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {editHref !== undefined ? (
        <Link
          href={editHref}
          className={`btn btn--ghost btn--sm ${s.edit}`}
          aria-label="Edit settings"
        >
          Edit
        </Link>
      ) : null}
    </div>
  );
}
