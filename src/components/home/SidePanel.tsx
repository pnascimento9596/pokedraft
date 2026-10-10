"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FORMATION_IDS, GENS, type FormationId, type Gen } from "@/engine";
import { ORDER_LABEL, STYLE_LABEL, genLabel, record } from "@/ui/labels";
import { BUCKET_LABEL, STAT_BUCKETS, type BucketStats, type StatBucket } from "@/ui/runs";
import { playHref, type PanelSettings } from "@/ui/settings";
import s from "./SidePanel.module.css";

export interface SidePanelProps {
  readonly panel: PanelSettings;
  readonly onChange: (next: PanelSettings) => void;
  readonly stats: Readonly<Record<StatBucket, BucketStats>> | null;
}

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={s.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={s.switchText}>
        <span className={s.switchLabel}>{label}</span>
        {hint ? <span className={s.hint}>{hint}</span> : null}
      </span>
      <span className={s.switchTrack} aria-hidden="true">
        <span className={s.switchThumb} />
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: Readonly<Record<T, string>>;
  readonly onChange: (next: T) => void;
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <div className={s.segmented} role="group" aria-label={label}>
        {(Object.keys(options) as T[]).map((k) => (
          <button
            key={k}
            type="button"
            className={s.segment}
            aria-pressed={value === k}
            onClick={() => onChange(k)}
          >
            {options[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SidePanel({ panel, onChange, stats }: SidePanelProps) {
  const formationId = useId();
  const set = (patch: Partial<PanelSettings>) => onChange({ ...panel, ...patch });
  const allGens = panel.gens.length === GENS.length;
  const [open, setOpen] = useState(false);
  const moreId = useId();

  const toggleGen = (g: Gen) => {
    const on = panel.gens.includes(g);
    if (on && panel.gens.length === 1) return;
    set({ gens: GENS.filter((x) => (x === g ? !on : panel.gens.includes(x))) });
  };

  return (
    <aside className={`panel ${s.panel}`} aria-label="Control desk">
      <section className={s.section}>
        <h2 className={s.heading}>
          <span className={s.live} aria-hidden="true" />
          Play
        </h2>
        <div className={s.ctas}>
          <Link className={`btn btn--primary ${s.cta}`} href={playHref("cup8", panel)}>
            Play 8-0 Challenge
          </Link>
          <Link className={`btn btn--primary ${s.cta}`} href={playHref("kanto151", panel)}>
            Play 151 Challenge
          </Link>
        </div>
        <p className={s.hint}>Challenge runs keep ratings hidden.</p>
        <button
          type="button"
          className={`btn btn--ghost btn--sm ${s.moreToggle}`}
          aria-expanded={open}
          aria-controls={moreId}
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide settings and records" : "Settings and records"}
        </button>
      </section>

      <div id={moreId} className={s.more} data-open={open}>
        <section className={s.section}>
          <h2 className={s.heading}>Setup</h2>
          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor={formationId}>
              Formation
            </label>
            <select
              id={formationId}
              className={s.select}
              value={panel.formation}
              onChange={(e) => set({ formation: e.target.value as FormationId })}
            >
              {FORMATION_IDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Generations</span>
            <div className={s.chips} role="group" aria-label="Generations">
              <button
                type="button"
                className="chip"
                aria-pressed={allGens}
                onClick={() => set({ gens: GENS })}
              >
                All
              </button>
              {GENS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className="chip"
                  aria-pressed={panel.gens.includes(g)}
                  onClick={() => toggleGen(g)}
                >
                  {genLabel(g)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.heading}>Rules</h2>
          <Segmented
            label="Draft style"
            value={panel.style}
            options={STYLE_LABEL}
            onChange={(style) => set({ style })}
          />
          <Segmented
            label="Order"
            value={panel.order}
            options={ORDER_LABEL}
            onChange={(order) => set({ order })}
          />
          <Switch
            label="Legendaries"
            hint="Builder pool"
            checked={panel.legendaries}
            onChange={(legendaries) => set({ legendaries })}
          />
          <Switch
            label="Show ratings (builder)"
            hint="Casual sighted mode"
            checked={panel.showRatings}
            onChange={(showRatings) => set({ showRatings })}
          />
        </section>

        <section className={s.section}>
          <h2 className={s.heading}>Your records</h2>
          <table className={s.stats}>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">Best score</th>
                <th scope="col">Best record</th>
                <th scope="col">Runs</th>
              </tr>
            </thead>
            <tbody>
              {STAT_BUCKETS.map((b) => {
                const st = stats?.[b];
                const empty = st === undefined || st.runs === 0;
                return (
                  <tr key={b}>
                    <th scope="row">{BUCKET_LABEL[b]}</th>
                    {empty ? (
                      <td colSpan={3} className={s.none}>
                        None yet
                      </td>
                    ) : (
                      <>
                        <td className="num">{st.bestScore ?? "None"}</td>
                        <td className="num">
                          {st.bestRecord === null
                            ? "None"
                            : record(st.bestRecord.wins, st.bestRecord.draws, st.bestRecord.losses)}
                        </td>
                        <td className="num">{st.runs}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </aside>
  );
}
