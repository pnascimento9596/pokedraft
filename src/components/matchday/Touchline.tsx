"use client";

import { useId, useState } from "react";
import { FORMATIONS, speciesById } from "@/engine";
import type { BenchIndex, FormationId, StarterIndex } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { assistantStatus, type OpponentStyle } from "@/ui/manager/intel";
import { MAX_SUBS, type Decision, type Touchline as TouchlineState } from "@/ui/manager/touchline";
import { SUITABILITY_LABEL } from "@/ui/labels";
import { getSlotSuitability } from "@/ui/suitability";
import { TacticPills } from "./TacticPills";
import s from "./Touchline.module.css";

export const TAKEOVER_COPY =
  "You have the touchline. Your assistant stops making changes this match.";

export function Touchline({
  line,
  formation,
  onDecide,
  error,
  busy = false,
  sheet,
  ratings = false,
  style,
}: {
  readonly line: TouchlineState;
  readonly formation: FormationId;
  /** Records a decision at the touchline's minute. */
  readonly onDecide: (d: Decision) => void;
  readonly error: string | null;
  readonly busy?: boolean;
  /** Below 720px the touchline is a bottom sheet: collapsed to the tactics until it is opened. */
  readonly sheet?: { readonly expanded: boolean; readonly onExpand: (open: boolean) => void };
  /** Ratings are on: bench cards add fit scores and STA. Off, they keep the fit glyph only. */
  readonly ratings?: boolean;
  /** The opponent's style, for the edge badge on each tactic pill. */
  readonly style?: OpponentStyle;
}) {
  const offId = useId();
  const onId = useId();
  const slots = FORMATIONS[formation].slots;
  const onPitch = line.onPitch.flatMap((id, slot) =>
    id === null ? [] : [{ slot: slot as StarterIndex, id }],
  );
  const bench = line.bench.filter((b) => b.available);
  const [off, setOff] = useState<StarterIndex | null>(null);
  const [on, setOn] = useState<BenchIndex | null>(null);
  const takeOff = off !== null && line.onPitch[off] !== null ? off : (onPitch.at(-1)?.slot ?? null);
  const bringOn = on !== null && line.bench[on]?.available ? on : (bench[0]?.index ?? null);
  const subsLeft = line.subsUsed < MAX_SUBS;
  const closed = !line.open || busy;

  return (
    <section
      className={s.touchline}
      aria-label="Touchline"
      data-testid="touchline"
      data-sheet={sheet !== undefined || undefined}
      data-expanded={sheet?.expanded || undefined}
    >
      <header className={s.head}>
        <h2 className={s.title}>Touchline</h2>
        <span className={s.meta} data-testid="touchline-minute">
          {line.minute === 0 ? "Before kickoff" : `${line.minute}'`}
        </span>
        <span className={s.meta} data-testid="subs-count">
          Subs {line.subsUsed} of {MAX_SUBS}
        </span>
        {sheet !== undefined ? (
          <button
            type="button"
            className={`btn btn--sm ${s.toggle}`}
            aria-expanded={sheet.expanded}
            data-testid="sheet-toggle"
            onClick={() => sheet.onExpand(!sheet.expanded)}
          >
            {sheet.expanded ? "Back to the match" : "Bench and energy"}
          </button>
        ) : null}
      </header>

      <p className={s.assistant} data-testid="assistant-status">
        {assistantStatus(line.managed)}
      </p>

      {line.managed ? (
        <p className={`${s.takeover} ${s.extra}`} role="status" data-testid="takeover">
          {TAKEOVER_COPY}
        </p>
      ) : null}

      <TacticPills
        label="Tactic"
        value={line.tactic}
        style={style}
        dense={sheet !== undefined}
        disabled={closed}
        onPick={(t) => {
          if (line.tactic !== t) onDecide({ kind: "tactic", tactic: t });
        }}
      />

      {error !== null ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${s.pick} ${s.extra}`}>
        <h3 className={s.pickTitle} id={offId}>
          Take off
        </h3>
        <ul className={s.energy} aria-labelledby={offId}>
          {line.onPitch.map((id, slot) => {
            const energy = line.energy[slot];
            const canPick = !closed && subsLeft && id !== null;
            const selected = takeOff === slot && id !== null;
            const tired = energy != null && energy < 65;
            return (
              <li key={slot}>
                <button
                  type="button"
                  className={s.energyRow}
                  data-testid={`energy-slot-${slot}`}
                  data-empty={id === null || undefined}
                  data-selected={selected || undefined}
                  data-tired={tired || undefined}
                  aria-pressed={canPick ? selected : undefined}
                  disabled={!canPick}
                  onClick={() => setOff(slot as StarterIndex)}
                >
                  <span className={s.energyRole}>{slots[slot]!.label}</span>
                  <span className={s.energyPlayer}>
                    {id !== null ? <PlayerImage dexId={id} size={22} alt="" /> : null}
                    <span className={s.energyName}>
                      {id === null ? "Empty" : speciesById(id).name}
                    </span>
                    {line.yellow[slot] && id !== null ? (
                      <span className={s.yellow} data-yellow role="img" aria-label="Yellow card" />
                    ) : null}
                  </span>
                  <meter
                    className={s.meter}
                    min={0}
                    max={100}
                    low={45}
                    high={70}
                    optimum={100}
                    value={energy ?? 0}
                    aria-label={`${id === null ? "Empty" : speciesById(id).name} energy`}
                  />
                  <span className={`num ${s.energyValue}`}>{energy ?? "-"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`${s.pick} ${s.extra}`}>
        <h3 className={s.pickTitle} id={onId}>
          Bring on
        </h3>
        {bench.length === 0 ? (
          <p className={s.empty}>Nobody left on the bench.</p>
        ) : (
          <ul className={s.bench} aria-labelledby={onId}>
            {bench.map((b) => {
              const species = speciesById(b.species);
              const fit =
                takeOff === null
                  ? null
                  : getSlotSuitability(species, formation, { kind: "starter", index: takeOff });
              const role = takeOff === null ? null : slots[takeOff]!.role;
              return (
                <li key={b.index}>
                  <button
                    type="button"
                    className={s.benchCard}
                    aria-pressed={bringOn === b.index}
                    disabled={closed || !subsLeft}
                    data-testid={`bench-card-${b.index}`}
                    onClick={() => setOn(b.index)}
                  >
                    <PlayerImage dexId={b.species} size={28} alt="" />
                    <span className={s.benchName}>{species.name}</span>
                    {fit !== null ? (
                      <span className={s.benchFit} data-fit={fit}>
                        {fit === "recommended" ? (
                          <>
                            <span aria-hidden="true">★</span>{" "}
                          </>
                        ) : null}
                        {SUITABILITY_LABEL[fit]}
                      </span>
                    ) : null}
                    {ratings ? (
                      <span className={`num ${s.benchNumbers}`} data-numbers>
                        {role === null ? "" : `Fit ${species.fits[role]}, `}STA {species.attrs.STA}
                      </span>
                    ) : null}
                    <span className={s.benchFresh}>Fresh</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          className={`btn ${s.confirm}`}
          disabled={closed || !subsLeft || takeOff === null || bringOn === null}
          data-testid="sub-confirm"
          onClick={() => {
            if (takeOff !== null && bringOn !== null) {
              onDecide({ kind: "sub", slot: takeOff, bench: bringOn });
              setOff(null);
              setOn(null);
            }
          }}
        >
          Make substitution
        </button>
      </div>
    </section>
  );
}
