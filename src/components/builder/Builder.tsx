"use client";

import { useEffect, useRef, useState } from "react";
import {
  FORMATIONS,
  applyAction,
  createDraft,
  eligibleSpecies,
  rateTeam,
  replay,
  speciesById,
  type CupResult,
  type DraftState,
  type Lineup,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
import { Pitch } from "@/components/pitch/Pitch";
import { downloadCard } from "@/components/share/download";
import { FRIENDLY_LABEL } from "@/ui/labels";
import { BUILDER_URL_SEED, builderToken, filledCount, valueAt } from "@/ui/lineup";
import { freshSeed } from "@/ui/settings";
import { CASCADE_TOTAL_MS, cascadeFrame, fullLineup, randomDraft } from "./model";
import { Picker } from "./Picker";
import s from "./Builder.module.css";

export interface Friendly {
  readonly token: string;
  readonly draft: DraftState;
  readonly cup: CupResult;
}

export interface BuilderProps {
  readonly draft: DraftState;
  readonly onChange: (next: DraftState) => void;
  readonly showRatings: boolean;
  readonly onReset: () => void;
  readonly onFriendly: (friendly: Friendly) => void;
}

interface Cascade {
  readonly target: Lineup;
  readonly pool: readonly SpeciesId[];
  readonly t0: number;
}

const SQUAD = 16;

export function Builder({ draft, onChange, showRatings, onReset, onFriendly }: BuilderProps) {
  const [picking, setPicking] = useState<SlotRef | null>(null);
  const [cascade, setCascade] = useState<Cascade | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("");
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (cascade === null) return;
    let raf = 0;
    const tick = (now: number) => {
      const e = now - cascade.t0;
      if (e >= CASCADE_TOTAL_MS) {
        setCascade(null);
        return;
      }
      setElapsed(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cascade]);

  useEffect(() => () => clearTimeout(statusTimer.current), []);

  const { settings, lineup } = draft;
  const slots = FORMATIONS[lineup.formation].slots;
  const token = builderToken(settings, lineup, BUILDER_URL_SEED);
  const filled = filledCount(lineup);
  const full = fullLineup(lineup);
  const animating = cascade !== null;
  const score = full === null || animating ? null : rateTeam(full).score;
  const shown = cascade === null ? lineup : cascadeFrame(cascade.target, cascade.pool, elapsed);

  const say = (message: string) => {
    setStatus(message);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 2400);
  };

  const randomize = () => {
    const next = randomDraft(settings, draft.seed, freshSeed());
    onChange(next);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setElapsed(0);
    setCascade({
      target: next.lineup,
      pool: eligibleSpecies(createDraft(settings, draft.seed)),
      t0: performance.now(),
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?b=${token}`);
      say("Link copied");
    } catch {
      say("Could not copy the link");
    }
  };

  const playFriendly = () => {
    const t = builderToken(settings, lineup, freshSeed() as Seed);
    const { draft: played, cup } = replay(t);
    onFriendly({ token: t, draft: played, cup });
  };

  const tokenNote = (ref: SlotRef) => {
    const id = valueAt(lineup, ref);
    if (id === null) return null;
    const sp = speciesById(id);
    if (ref.kind === "starter") {
      const role = slots[ref.index].role;
      return `${role} ${sp.fits[role]}`;
    }
    const best = sp.bestRoles[0]!;
    return `${best} ${sp.fits[best]}`;
  };

  return (
    <section className={s.builder} aria-label="Pitch builder">
      <div className={s.bar}>
        <div className={s.titleBlock}>
          <p className="kicker">Friendly builder</p>
          <h1 className={s.title}>Build your XI</h1>
        </div>
        <div className={s.score} data-testid="team-score">
          {score !== null ? (
            <span className="scorebug">
              <span className="scorebug__label">Team Score</span>
              <span className={`scorebug__value ${s.scoreValue}`}>{score}</span>
            </span>
          ) : (
            <span className={s.pending}>
              <span className={`num ${s.pendingCount}`}>
                {filledCount(shown)}/{SQUAD}
              </span>
              <span>Fill all 16 to see your Team Score</span>
            </span>
          )}
        </div>
      </div>

      <div className={s.pitch} data-animating={animating || undefined}>
        <Pitch
          formation={lineup.formation}
          lineup={shown}
          label={`${lineup.formation} lineup`}
          onSlotTap={animating ? () => {} : setPicking}
          onSwap={
            animating ? undefined : (a, b) => onChange(applyAction(draft, { type: "swap", a, b }))
          }
          tokenNote={showRatings && !animating ? tokenNote : undefined}
        />
      </div>

      <div className={s.tools} role="toolbar" aria-label="Builder actions">
        <button type="button" className="btn btn--primary" onClick={randomize} disabled={animating}>
          Randomize
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onChange(createDraft(settings, draft.seed))}
          disabled={animating || filled === 0}
        >
          Clear all
        </button>
        <button type="button" className="btn" onClick={onReset} disabled={animating}>
          Reset
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void downloadCard({ b: token }, "pokedraft-lineup.png")}
        >
          Download image
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => void copyLink()}>
          Copy link
        </button>
        <p className={s.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <div className={s.friendly}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={playFriendly}
          disabled={full === null || animating}
        >
          Play a friendly cup
        </button>
        <span className={s.friendlyNote}>{FRIENDLY_LABEL}</span>
      </div>

      {picking !== null ? (
        <Picker
          key={`${picking.kind}${picking.index}`}
          state={draft}
          slot={picking}
          showRatings={showRatings}
          onPick={(species) => {
            onChange(applyAction(draft, { type: "place", species, slot: picking }));
            setPicking(null);
          }}
          onClear={() => {
            onChange(applyAction(draft, { type: "clear", slot: picking }));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </section>
  );
}
