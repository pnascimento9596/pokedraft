"use client";

import { useId, useState } from "react";
import { FORMATIONS, speciesById } from "@/engine";
import {
  TACTICS,
  type BenchIndex,
  type FormationId,
  type StarterIndex,
  type Tactic,
} from "@/engine/types";
import { MAX_SUBS, type Decision, type Touchline as TouchlineState } from "@/ui/manager/touchline";
import { TACTIC_HINT } from "@/components/results/format";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import s from "./Touchline.module.css";

export const TAKEOVER_COPY =
  "You have the touchline. Your assistant stops making changes this match.";

export function Touchline({
  line,
  formation,
  onDecide,
  error,
  busy = false,
}: {
  readonly line: TouchlineState;
  readonly formation: FormationId;
  /** Records a decision at the touchline's minute. */
  readonly onDecide: (d: Decision) => void;
  readonly error: string | null;
  readonly busy?: boolean;
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
    <section className={s.touchline} aria-label="Touchline" data-testid="touchline">
      <header className={s.head}>
        <h3 className={s.title}>Touchline</h3>
        <span className={s.meta} data-testid="touchline-minute">
          {line.minute === 0 ? "Before kickoff" : `${line.minute}'`}
        </span>
        <span className={s.meta} data-testid="subs-count">
          Subs {line.subsUsed} of {MAX_SUBS}
        </span>
      </header>

      {line.managed ? (
        <p className={s.takeover} role="status" data-testid="takeover">
          {TAKEOVER_COPY}
        </p>
      ) : null}

      <div className={s.tactics} role="group" aria-label="Tactic">
        {TACTICS.map((t: Tactic) => (
          <button
            key={t}
            type="button"
            className={s.tactic}
            aria-pressed={line.tactic === t}
            disabled={closed}
            data-testid={`tactic-${t}`}
            onClick={() => {
              if (line.tactic !== t) onDecide({ kind: "tactic", tactic: t });
            }}
          >
            <span className={s.tacticName}>{TACTIC_LABEL[t]}</span>
            <span className={s.tacticHint}>{TACTIC_HINT[t]}</span>
          </button>
        ))}
      </div>

      <div className={s.sub}>
        <div className={s.field}>
          <label htmlFor={offId}>Take off</label>
          <span className={s.select}>
            <select
              id={offId}
              value={takeOff ?? ""}
              disabled={closed || !subsLeft || onPitch.length === 0}
              data-testid="sub-off"
              onChange={(e) => setOff(Number(e.target.value) as StarterIndex)}
            >
              {onPitch.map(({ slot, id }) => (
                <option key={slot} value={slot}>
                  {slots[slot]!.label} {speciesById(id).name}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className={s.field}>
          <label htmlFor={onId}>Bring on</label>
          <span className={s.select}>
            <select
              id={onId}
              value={bringOn ?? ""}
              disabled={closed || !subsLeft || bench.length === 0}
              data-testid="sub-on"
              onChange={(e) => setOn(Number(e.target.value) as BenchIndex)}
            >
              {bench.length === 0 ? <option value="">Nobody left</option> : null}
              {bench.map((b) => (
                <option key={b.index} value={b.index}>
                  {speciesById(b.species).name}
                </option>
              ))}
            </select>
          </span>
        </div>
        <button
          type="button"
          className="btn"
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

      {error !== null ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      <ul className={s.energy} aria-label="Energy">
        {line.onPitch.map((id, slot) => {
          const energy = line.energy[slot];
          return (
            <li key={slot} className={s.energyRow} data-empty={id === null || undefined}>
              <span className={s.energyRole}>{slots[slot]!.label}</span>
              <span className={s.energyName}>{id === null ? "Empty" : speciesById(id).name}</span>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
