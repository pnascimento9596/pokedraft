"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { FORMATION_IDS, GENS, type FormationId, type Gen } from "@/engine/types";
import { ORDER_LABEL, STYLE_LABEL, genLabel, record } from "@/ui/labels";
import { BUCKET_LABEL, STAT_BUCKETS, type BucketStats, type StatBucket } from "@/ui/runs";
import {
  MANAGER_MODE_HINT,
  MANAGER_MODE_LABEL,
  MANAGER_PLAYS_LIVE,
  MATCH_VIEW_LABEL,
  matchdayView,
  type ChallengeMode,
  type PanelSettings,
} from "@/ui/settings";
import { ModuleCard, Table } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import { ConfirmPlay } from "./ConfirmPlay";
import s from "./SidePanel.module.css";

export interface SidePanelProps {
  readonly panel: PanelSettings;
  readonly onChange: (next: PanelSettings) => void;
  readonly filled?: number;
  readonly chemistry?: number | null;
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
  disabled,
  hint,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: Readonly<Record<T, string>>;
  readonly onChange: (next: T) => void;
  readonly disabled?: T;
  readonly hint?: string;
}) {
  const hintId = useId();
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <div
        className={s.segmented}
        role="group"
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
      >
        {(Object.keys(options) as T[]).map((k) => (
          <button
            key={k}
            type="button"
            className={s.segment}
            aria-pressed={value === k}
            disabled={disabled === k}
            onClick={() => onChange(k)}
          >
            {options[k]}
          </button>
        ))}
      </div>
      {hint ? (
        <p className={s.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SidePanel({
  panel,
  onChange,
  stats,
  filled = 0,
  chemistry = null,
}: SidePanelProps) {
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
      <div className={s.hub}>
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={open}
          aria-controls={moreId}
          onClick={() => setOpen(!open)}
        >
          Challenge Hub
        </button>
        <p>
          {STYLE_LABEL[panel.style]} · Draft: {filled}/16 ·{" "}
          {chemistry === null ? "Chemistry after draft" : `${Math.round(chemistry * 100)}% Chem`}
        </p>
      </div>
      <ModuleCard
        eyebrow="Trainer Dugout"
        title="Play"
        description="Choose a cup and draft your squad."
        icon={<NavIcon family="play" />}
      >
        <div className={s.section}>
          <div className={s.challengeGroup}>
            <div className={s.bannerTitle}>Pokémon Challenge</div>
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
          </div>
          <p className={s.hint}>
            {panel.showChallengeRatings
              ? "Challenge runs show scores and ratings."
              : "Challenge runs hide scores and ratings. Position fit hints stay."}
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
              hint="Ratings on"
              checked={panel.showRatings}
              onChange={(showRatings) => set({ showRatings })}
            />
            <Switch
              label="Show ratings (challenges)"
              hint="Off hides scores and ratings during challenges. Position fit hints stay."
              checked={panel.showChallengeRatings}
              onChange={(showChallengeRatings) => set({ showChallengeRatings })}
            />
          </section>

          <section className={s.section}>
            <h2 className={s.heading}>Matchday</h2>
            <Switch
              label={MANAGER_MODE_LABEL}
              hint={MANAGER_MODE_HINT}
              checked={panel.managerMode}
              onChange={(managerMode) => set({ managerMode })}
            />
            <Segmented
              label="Match view"
              value={matchdayView(panel)}
              options={MATCH_VIEW_LABEL}
              onChange={(matchView) => set({ matchView })}
              disabled={panel.managerMode ? "quick" : undefined}
              hint={panel.managerMode ? MANAGER_PLAYS_LIVE : undefined}
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
