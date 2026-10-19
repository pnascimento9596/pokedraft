"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { FORMATION_IDS, GENS, type FormationId, type Gen, type IsoDate } from "@/engine/types";
import { dailyDate } from "@/leaderboard/daily";
import { DAILY_RULE, MODE_LABEL, ORDER_LABEL, STYLE_LABEL, genLabel, record } from "@/ui/labels";
import { BUCKET_LABEL, STAT_BUCKETS, type BucketStats, type StatBucket } from "@/ui/runs";
import {
  SPIN_SPEED_LABEL,
  playTarget,
  type ChallengeMode,
  type PanelSettings,
} from "@/ui/settings";
import { RUN_CLEARED, runSlotKey, writeRunCheckpoint, writeSession } from "@/ui/storage";
import { longDate } from "@/components/leaderboard/format";
import { MatchdaySettings } from "@/components/matchday/MatchdaySettings";
import { ModuleCard, Table } from "@/components/ui/primitives";
import s from "./SidePanel.module.css";

const SETTINGS_ID = "settings";

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

const PITCH_ID = "home-pitch";

// Each rule line comes from How to play; the Daily one is the /daily start card's own.
const CHALLENGE_RULE: Readonly<Record<ChallengeMode, string>> = {
  cup8: "Each round rolls a region and a type. Draft one Pokémon that matches both.",
  kanto151:
    "Only the original 151. Each round rolls a single Pokémon and you place it in your squad.",
};

// The date is the one /daily plays, read on the client only, so the server HTML never holds one.
// It is set after mount: a store read (useToday) re-renders home while it hydrates, and that drops
// a formation picked as the page loads.
function DailyCard() {
  const [today, setToday] = useState<IsoDate | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date, see above
    setToday(dailyDate(new Date()));
  }, []);
  return (
    <div className={s.card} data-card>
      <h2 className={s.cardTitle}>Daily</h2>
      <p className={s.rule}>
        {today === null ? "\u00a0" : <time dateTime={today}>{longDate(today)}</time>}
      </p>
      <p className={s.rule}>{DAILY_RULE}</p>
      <Link href="/daily" className={`btn btn--primary ${s.cta}`}>
        Play Daily
      </Link>
    </div>
  );
}

export function SidePanel({ panel, onChange, stats }: SidePanelProps) {
  const formationId = useId();
  const set = (patch: Partial<PanelSettings>) => onChange({ ...panel, ...patch });
  const allGens = panel.gens.length === GENS.length;
  // Unset until the player or the #settings hash decides, so CSS can collapse the settings below
  // 960px without the server knowing the width.
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open === true;
  const router = useRouter();

  // The start card's Edit link lands here. The settings open first, then their heading scrolls into
  // view and takes focus once the open panel has rendered.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash !== `#${SETTINGS_ID}`) return;
      setOpen(true);
      setRevealed((n) => n + 1);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  useEffect(() => {
    if (revealed === 0) return;
    const heading = document.getElementById(SETTINGS_ID)?.querySelector<HTMLElement>("h2");
    if (heading === null || heading === undefined) return;
    heading.setAttribute("tabindex", "-1");
    heading.scrollIntoView({ block: "start" });
    heading.focus({ preventScroll: true });
  }, [revealed]);

  // Play always starts a fresh run, so the slot /play would restore is cleared first.
  const play = (mode: ChallengeMode) => {
    const { href, settings } = playTarget(mode, panel);
    const slot = { settings, seed: null, daily: null };
    writeRunCheckpoint(slot, null);
    writeSession(runSlotKey(slot), RUN_CLEARED);
    router.push(href);
  };
  const prefetch = (mode: ChallengeMode) => router.prefetch(playTarget(mode, panel).href);

  const toggleGen = (g: Gen) => {
    const on = panel.gens.includes(g);
    if (on && panel.gens.length === 1) return;
    set({ gens: GENS.filter((x) => (x === g ? !on : panel.gens.includes(x))) });
  };

  return (
    <>
      <section className={`module-card ${s.hero}`} aria-labelledby={PITCH_ID}>
        <div>
          <h1 id={PITCH_ID} className={s.title}>
            Draft a Pokémon XI and win the cup.
          </h1>
          <p className={s.sub}>Spin for players, fill a formation, then play the cup.</p>
        </div>
        <div className={s.cards}>
          {(["cup8", "kanto151"] as const).map((mode) => (
            <div key={mode} className={s.card} data-card>
              <h2 className={s.cardTitle}>{MODE_LABEL[mode]}</h2>
              <p className={s.rule}>{CHALLENGE_RULE[mode]}</p>
              {mode === "cup8" ? (
                <p className={s.rule}>Draft style: {STYLE_LABEL[panel.style]}</p>
              ) : null}
              <button
                type="button"
                className={`btn btn--primary ${s.cta}`}
                onClick={() => play(mode)}
                onPointerEnter={() => prefetch(mode)}
                onFocus={() => prefetch(mode)}
              >
                Play {MODE_LABEL[mode]}
              </button>
            </div>
          ))}
          <DailyCard />
        </div>
        <p className={s.hint}>
          {panel.showChallengeRatings
            ? "Challenge runs show scores and ratings."
            : "Challenge runs hide scores and ratings. Position fit hints stay."}
        </p>
        <MatchdaySettings
          value={{ managerMode: panel.managerMode, matchView: panel.matchView }}
          onChange={(next) => set(next)}
        />
      </section>

      <aside className={s.panel} aria-label="Control desk">
        <button
          type="button"
          className={`btn btn--ghost btn--sm ${s.moreToggle}`}
          aria-expanded={expanded}
          aria-controls={SETTINGS_ID}
          onClick={() => setOpen(!expanded)}
        >
          {expanded ? "Hide settings and records" : "Settings and records"}
        </button>
        <div id={SETTINGS_ID} className={s.more} data-open={open ?? undefined}>
          <ModuleCard
            eyebrow="Your game"
            title="Settings and records"
            description="Set up the builder and check your saved results."
          >
            <section className={s.section}>
              <h3 className={s.heading}>Setup</h3>
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
              <Segmented
                label="Spin speed"
                value={panel.spinSpeed}
                options={SPIN_SPEED_LABEL}
                onChange={(spinSpeed) => set({ spinSpeed })}
              />
            </section>

            <section className={s.section}>
              <h3 className={s.heading}>Rules</h3>
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
              <h3 className={s.heading}>Your records</h3>
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
      </aside>
    </>
  );
}
