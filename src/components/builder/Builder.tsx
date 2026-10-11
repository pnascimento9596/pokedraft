"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FORMATIONS } from "@/engine/formations";
import type {
  CupResult,
  DraftState,
  FormationId,
  Lineup,
  Seed,
  SlotRef,
  Species,
  SpeciesId,
} from "@/engine/types";
import { Pitch } from "@/components/pitch/Pitch";
import { downloadCard } from "@/components/share/download";
import { FRIENDLY_LABEL, qualityScore, versusLabel } from "@/ui/labels";
import { BUILDER_URL_SEED, emptyLineup, filledCount, valueAt } from "@/ui/lineup";
import { freshSeed } from "@/ui/settings";
import { CASCADE_TOTAL_MS, cascadeFrame, fullLineup } from "./model";
import s from "./Builder.module.css";

export type BuilderEngine = typeof import("./live");

export interface LiveDesk {
  readonly engine: BuilderEngine;
  readonly draft: DraftState;
}

// Until the builder engine (and the species data under it) has loaded, the desk is idle and the
// pitch is the panel's formation with no players. Every action that needs the data loads it first.
export type Desk =
  | { readonly kind: "idle"; readonly formation: FormationId }
  | ({ readonly kind: "live" } & LiveDesk);

function noSpecies(id: SpeciesId): Species {
  throw new Error(`species ${id} on an idle builder pitch`);
}

export interface Friendly {
  readonly token: string;
  readonly draft: DraftState;
  readonly cup: CupResult;
}

export interface BuilderProps {
  readonly desk: Desk;
  /** Loads the engine if needed and resolves with the live desk. */
  readonly ensureLive: () => Promise<LiveDesk>;
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

export function Builder({
  desk,
  ensureLive,
  onChange,
  showRatings,
  onReset,
  onFriendly,
}: BuilderProps) {
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

  const lineup = desk.kind === "live" ? desk.draft.lineup : emptyLineup(desk.formation);
  const slots = FORMATIONS[lineup.formation].slots;
  const filled = filledCount(lineup);
  const full = fullLineup(lineup);
  const animating = cascade !== null;
  const score =
    desk.kind === "live" && full !== null && !animating ? desk.engine.rateTeam(full).score : null;
  const shown = cascade === null ? lineup : cascadeFrame(cascade.target, cascade.pool, elapsed);

  const preload = () => {
    if (desk.kind === "idle") ensureLive().catch(() => {});
  };

  const say = (message: string) => {
    setStatus(message);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 2400);
  };

  const withLive = (act: (live: LiveDesk) => void | Promise<void>) => {
    if (desk.kind === "live") {
      void act(desk);
      return;
    }
    setStatus("Loading the players");
    ensureLive().then(
      (live) => {
        setStatus("");
        return act(live);
      },
      () => say("The builder could not load. Check your connection."),
    );
  };

  const tokenOf = ({ engine, draft }: LiveDesk) =>
    engine.builderToken(draft.settings, draft.lineup, BUILDER_URL_SEED);

  const randomize = () =>
    withLive(({ engine, draft }) => {
      const next = engine.randomDraft(draft.settings, draft.seed, freshSeed());
      onChange(next);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setElapsed(0);
      setCascade({
        target: next.lineup,
        pool: engine.eligibleSpecies(engine.createDraft(draft.settings, draft.seed)),
        t0: performance.now(),
      });
    });

  const copyLink = () =>
    withLive(async (live) => {
      try {
        await navigator.clipboard.writeText(`${location.origin}/?b=${tokenOf(live)}`);
        say("Link copied");
      } catch {
        say("Could not copy the link");
      }
    });

  const playFriendly = () =>
    withLive(({ engine, draft }) => {
      const t = engine.builderToken(draft.settings, draft.lineup, freshSeed() as Seed);
      const { draft: played, cup } = engine.replay(t);
      onFriendly({ token: t, draft: played, cup });
    });

  // The same number and label as the picker row: where the player ranks for the slot's role (a
  // bench slot has none, so their best one) among all Pokémon, 0 to 100.
  const tokenNote = (engine: BuilderEngine, ref: SlotRef): ReactNode => {
    const id = valueAt(lineup, ref);
    if (id === null) return null;
    const sp = engine.speciesById(id);
    const role = ref.kind === "starter" ? slots[ref.index].role : sp.bestRoles[0]!;
    return (
      <>
        <span className={s.noteScore}>{qualityScore(sp.quality[role])}</span>{" "}
        <span className={s.noteLabel}>{versusLabel(role)}</span>
      </>
    );
  };

  return (
    <section
      className={s.builder}
      aria-label="Pitch builder"
      onPointerEnter={preload}
      onPointerDown={preload}
      onFocus={preload}
    >
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
          speciesOf={desk.kind === "live" ? desk.engine.speciesById : noSpecies}
          label={`${lineup.formation} lineup`}
          onSlotTap={animating ? () => {} : (ref) => withLive(() => setPicking(ref))}
          onSwap={
            animating || desk.kind !== "live"
              ? undefined
              : (a, b) => onChange(desk.engine.applyAction(desk.draft, { type: "swap", a, b }))
          }
          tokenNote={
            showRatings && !animating && desk.kind === "live"
              ? (ref) => tokenNote(desk.engine, ref)
              : undefined
          }
        />
      </div>

      <div className={s.tools} role="toolbar" aria-label="Builder actions">
        <button type="button" className="btn btn--primary" onClick={randomize} disabled={animating}>
          Randomize
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            withLive(({ engine, draft }) =>
              onChange(engine.createDraft(draft.settings, draft.seed)),
            )
          }
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
          onClick={() =>
            withLive((live) => void downloadCard({ b: tokenOf(live) }, "pokedraft-lineup.png"))
          }
        >
          Download image
        </button>
        <button type="button" className="btn btn--ghost" onClick={copyLink}>
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

      {picking !== null && desk.kind === "live" ? (
        <desk.engine.Picker
          key={`${picking.kind}${picking.index}`}
          state={desk.draft}
          slot={picking}
          showRatings={showRatings}
          onPick={(species) => {
            onChange(
              desk.engine.applyAction(desk.draft, { type: "place", species, slot: picking }),
            );
            setPicking(null);
          }}
          onClear={() => {
            onChange(desk.engine.applyAction(desk.draft, { type: "clear", slot: picking }));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </section>
  );
}
