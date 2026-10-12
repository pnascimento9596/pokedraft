"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { FORMATION_IDS, GENS, type FormationId, type Gen } from "@/engine/types";
import { ORDER_LABEL, STYLE_LABEL, genLabel, record } from "@/ui/labels";
import { BUCKET_LABEL, STAT_BUCKETS, type BucketStats, type StatBucket } from "@/ui/runs";
import type { ChallengeMode, PanelSettings } from "@/ui/settings";
import { ModuleCard, Table } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import { ConfirmPlay } from "./ConfirmPlay";
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
  const [open, setOpen] = useState(true);
  const [confirming, setConfirming] = useState<ChallengeMode | null>(null);
  const moreId = useId();

  const editSettings = () => {
    flushSync(() => {
      setConfirming(null);
      setOpen(true);
    });
    const select = document.getElementById(formationId);
    if (select) {
      const { top, bottom } = select.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) select.scrollIntoView({ block: "center" });
    }
    select?.focus({ preventScroll: true });
  };

  const toggleGen = (g: Gen) => {
    const on = panel.gens.includes(g);
    if (on && panel.gens.length === 1) return;
    set({ gens: GENS.filter((x) => (x === g ? !on : panel.gens.includes(x))) });
  };

  return (
    <aside className={s.panel} aria-label="Control desk">
      <ModuleCard
        eyebrow="Challenges"
        title="Play"
        description="Choose a cup and draft your squad."
        icon={<NavIcon family="play" />}
      >
        <div className={s.section}>
          <div className={s.ctas}>
            <button
              type="button"
              className={`btn btn--primary ${s.cta}`}
              onClick={() => setConfirming("cup8")}
            >
              Play 8-0 Challenge
            </button>
            <button
              type="button"
              className={`btn btn--primary ${s.cta}`}
              onClick={() => setConfirming("kanto151")}
            >
              Play 151 Challenge
            </button>
          </div>
          <p className={s.hint}>
            {panel.showChallengeRatings
              ? "Challenge runs show ratings. Turn them off in Settings to play blind."
              : "Challenge runs keep ratings hidden."}
          </p>
          <button
            type="button"
            className={`btn btn--ghost btn--sm ${s.moreToggle}`}
            aria-expanded={open}
            aria-controls={moreId}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide settings and records" : "Settings and records"}
          </button>
        </div>
      </ModuleCard>

      <div id={moreId} className={s.more} data-open={open}>
        <ModuleCard
          eyebrow="Your game"
          title="Settings and records"
          description="Set up the builder and check your saved results."
        >
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
            <Switch
              label="Show ratings (challenges)"
              hint="Off keeps challenges blind"
              checked={panel.showChallengeRatings}
              onChange={(showChallengeRatings) => set({ showChallengeRatings })}
            />
          </section>

          <section className={s.section}>
            <h2 className={s.heading}>Your records</h2>
            <Table className={s.stats}>
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
                          No saved runs
                        </td>
                      ) : (
                        <>
                          <td className="num">{st.bestScore ?? "Unavailable"}</td>
                          <td className="num">
                            {st.bestRecord === null
                              ? "Unavailable"
                              : record(
                                  st.bestRecord.wins,
                                  st.bestRecord.draws,
                                  st.bestRecord.losses,
                                )}
                          </td>
                          <td className="num">{st.runs}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </section>
        </ModuleCard>
      </div>
      {confirming !== null && (
        <ConfirmPlay
          mode={confirming}
          panel={panel}
          onEdit={editSettings}
          onDone={() => setConfirming(null)}
        />
      )}
    </aside>
  );
}
