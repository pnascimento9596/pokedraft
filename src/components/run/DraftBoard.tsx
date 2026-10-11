"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DRAFT_ROUNDS,
  REROLLS,
  speciesById,
  type DraftAction,
  type DraftState,
  type RerollTarget,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
import { announce } from "@/components/Announcer";
import { Pitch } from "@/components/pitch/Pitch";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { RollReveal } from "@/components/wheel/RollReveal";
import { SoundToggle } from "@/components/wheel/SoundToggle";
import { announce as stageLine, dexLabel, stagesFor } from "@/components/wheel/reel";
import { unlockAudio } from "@/components/wheel/sound";
import { useReducedMotion } from "@/components/wheel/useReducedMotion";
import { REGION_LABEL } from "@/ui/labels";
import { sameRef, slotLabel, valueAt } from "@/ui/lineup";
import { swapMessage } from "@/ui/swap-message";
import { RoadStrip } from "./RoadStrip";
import { NavIcon } from "@/components/ui/nav-icons";
import { candidatesFor, withHint, type Run } from "./runState";
import s from "./DraftBoard.module.css";

export interface DraftBoardProps {
  readonly title: string;
  readonly run: Run;
  readonly failure: string | null;
  readonly onAction: (action: DraftAction) => void;
  readonly onRun: (run: Run) => void;
  readonly onNewRun: () => void;
  readonly onSeeResults: () => void;
}

const REROLL_BUTTONS: Readonly<Record<"cup8" | "kanto151", readonly [RerollTarget, string][]>> = {
  cup8: [
    ["type", "Reroll type"],
    ["region", "Reroll region"],
  ],
  kanto151: [["species", "Reroll"]],
};

// How long a hint for a tap that did nothing stays up.
const HINT_MS = 4000;

const REROLLED: Readonly<Record<RerollTarget, string>> = {
  type: "type",
  region: "region",
  species: "player",
};

const swapPrompt = (name: string) => `Tap another slot to swap ${name}, or tap it again to cancel.`;

// What an action did, for the page's live region. `before` is the state the action applied to.
function outcome(before: DraftState, after: DraftState, action: DraftAction): string {
  const parts: string[] = [];
  if (action.type === "pick") {
    const slot = action.slot ?? (before.phase.kind === "choosing" ? before.phase.slot : null);
    const name = speciesById(action.species).name;
    parts.push(
      slot === null ? `Signed ${name}.` : `Signed ${name} at ${slotLabel(after.lineup, slot)}.`,
    );
  } else if (action.type === "swap") {
    parts.push(swapMessage(before.lineup, action.a, action.b));
  } else if (action.type === "chooseSlot") {
    parts.push(`Rolling for ${slotLabel(after.lineup, action.slot)}.`);
  } else if (action.type === "reroll" && after.settings.mode !== "builder") {
    const left = REROLLS[after.settings.mode] - after.rerollsUsed;
    parts.push(`Rerolled the ${REROLLED[action.target]}, ${left} left.`);
  }
  if (after.phase.kind === "complete" && before.phase.kind !== "complete") {
    parts.push(
      `Draft complete, ${DRAFT_ROUNDS} of ${DRAFT_ROUNDS} signed. Tap two players to swap them.`,
    );
  } else if (after.round !== before.round) {
    parts.push(`Round ${after.round + 1} of ${DRAFT_ROUNDS}.`);
  }
  return parts.join(" ");
}

interface Selection {
  readonly rollId: number;
  readonly species: SpeciesId;
}

export function DraftBoard({
  title,
  run,
  failure,
  onAction,
  onRun,
  onNewRun,
  onSeeResults,
}: DraftBoardProps) {
  const { state, rollId } = run;
  const { settings, phase } = state;
  const reduced = useReducedMotion();
  const [revealedId, setRevealedId] = useState(-1);
  const [selection, setSelection] = useState<Selection | null>(null);
  // The player picked for a tap swap: a tap on a placed player, then a tap on another slot.
  const [swapFrom, setSwapFrom] = useState<SlotRef | null>(null);
  const onRevealDone = useCallback(() => setRevealedId(rollId), [rollId]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Where focus was when an action was sent, to move it to the heading if that control is gone.
  const focusBefore = useRef<Element | null>(null);
  const runBefore = useRef(run);
  const spokenRoll = useRef(-1);

  useEffect(() => {
    if (run.error === null) return;
    const id = window.setTimeout(() => onRun(withHint(run, null)), HINT_MS);
    return () => window.clearTimeout(id);
  }, [run, onRun]);

  useEffect(() => {
    const before = runBefore.current;
    runBefore.current = run;
    if (before === run) return;
    const was = focusBefore.current;
    focusBefore.current = null;
    if (was !== null && !was.isConnected) headingRef.current?.focus({ preventScroll: true });
    if (run.error !== null) announce(run.error);
    else if (run.actions.length > before.actions.length)
      announce(outcome(before.state, run.state, run.actions[run.actions.length - 1]!));
  }, [run]);

  const roll = state.phase.kind === "choosing" ? state.phase.roll : null;
  const revealedNow = roll !== null && (reduced || revealedId === rollId);
  useEffect(() => {
    if (roll === null || !revealedNow || spokenRoll.current === rollId) return;
    spokenRoll.current = rollId;
    announce(stagesFor(roll, settings, run.cause).map(stageLine).join(" "));
  }, [roll, revealedNow, rollId, settings, run.cause]);

  useEffect(() => {
    if (failure !== null) announce(failure);
  }, [failure]);

  useEffect(() => {
    if (swapFrom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSwapFrom(null);
      announce("Swap cancelled.");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [swapFrom]);

  if (settings.mode === "builder") return null;
  const mode = settings.mode;
  const squadFirst = settings.order === "squadFirst";
  const choosing = phase.kind === "choosing" ? phase : null;
  const revealed = choosing !== null && (reduced || revealedId === rollId);
  const candidates = revealed ? candidatesFor(state) : [];
  const single = candidates.length === 1 ? candidates[0]! : null;
  const selected =
    selection !== null && selection.rollId === rollId && candidates.includes(selection.species)
      ? selection.species
      : squadFirst
        ? single
        : null;
  const remaining = REROLLS[mode] - state.rerollsUsed;
  const round = Math.min(state.round + 1, DRAFT_ROUNDS);
  const hint = (message: string) => onRun(withHint(run, message));
  const committed = choosing?.slot ?? null;
  const picked =
    swapFrom !== null && valueAt(state.lineup, swapFrom) !== null && !sameRef(swapFrom, committed)
      ? swapFrom
      : null;
  const pickedName = picked === null ? null : speciesById(valueAt(state.lineup, picked)!).name;

  const act = (action: DraftAction) => {
    focusBefore.current = document.activeElement;
    setSwapFrom(null);
    onAction(action);
  };

  const tapCandidate = (id: SpeciesId) => {
    if (choosing === null) return;
    if (choosing.slot !== null) {
      act({ type: "pick", species: id, slot: choosing.slot });
      return;
    }
    setSelection(selected === id ? null : { rollId, species: id });
  };

  const tapSlot = (ref: SlotRef) => {
    const id = valueAt(state.lineup, ref);
    if (picked !== null) {
      if (!sameRef(picked, ref)) {
        act({ type: "swap", a: picked, b: ref });
        return;
      }
      setSwapFrom(null);
      announce("Swap cancelled.");
      return;
    }
    if (id !== null) {
      const name = speciesById(id).name;
      setSwapFrom(ref);
      announce(`${slotLabel(state.lineup, ref)} ${name} selected. ${swapPrompt(name)}`);
      return;
    }
    if (phase.kind === "awaitingSlot") {
      act({ type: "chooseSlot", slot: ref });
      return;
    }
    if (choosing === null) return;
    if (committed !== null) {
      hint("Pick a player for the highlighted slot.");
      return;
    }
    if (selected === null) {
      hint(revealed ? "Choose a player first, then tap a slot." : "Wait for the wheel to stop.");
      return;
    }
    act({ type: "pick", species: selected, slot: ref });
  };

  const armed = phase.kind === "awaitingSlot" || (committed === null && selected !== null);
  const message = failure ?? run.error ?? (pickedName === null ? null : swapPrompt(pickedName));

  return (
    <div className={s.board} data-revealed={revealed || undefined}>
      <section className={s.side} aria-label="Draft">
        <header className={s.header}>
          <div className={s.titleRow}>
            <span className="kicker">
              <NavIcon family={"play"} />
              {title}
            </span>
            <SoundToggle />
          </div>
          <h1 ref={headingRef} className={s.round} data-testid="round-header" tabIndex={-1}>
            {phase.kind === "complete" ? "Draft complete" : `Round ${round} of ${DRAFT_ROUNDS}`}
          </h1>
          <div className={s.rolled} aria-live="off">
            {phase.kind === "awaitingSlot" ? (
              <p className={s.prompt} data-testid="round-prompt">
                Pick a slot for round {round}
              </p>
            ) : roll !== null && revealed ? (
              roll.kind === "combo" ? (
                <>
                  <span className={s.regionTag}>{REGION_LABEL[roll.region]}</span>
                  <TypeChip type={roll.type} />
                </>
              ) : (
                <>
                  <span className={s.regionTag}>{speciesById(roll.species).name}</span>
                  <span className="num">{dexLabel(roll.species)}</span>
                </>
              )
            ) : roll !== null ? (
              <span className={s.rolling}>Rolling</span>
            ) : null}
          </div>
          {phase.kind !== "complete" ? (
            <div className={s.rerolls}>
              {REROLL_BUTTONS[mode].map(([target, label]) => {
                // aria-disabled, not disabled, so a pressed button keeps focus while it is off.
                const off = remaining <= 0 || !revealed;
                return (
                  <button
                    key={target}
                    type="button"
                    className="btn btn--sm"
                    aria-disabled={off || undefined}
                    onClick={() => {
                      if (off) return;
                      unlockAudio();
                      act({ type: "reroll", target });
                    }}
                  >
                    {label}{" "}
                    <span className={s.count}>
                      {remaining}
                      <span className="visually-hidden"> left</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </header>

        {/* The page's live region reads this out; the line itself is for the eyes. */}
        {message !== null ? (
          <p className={s.error} data-testid="draft-hint">
            {message}
          </p>
        ) : null}

        {roll !== null ? (
          <div className={s.wheels}>
            <RollReveal
              key={`reveal-${rollId}`}
              stages={stagesFor(roll, settings, run.cause)}
              instant={reduced}
              onDone={onRevealDone}
            />
          </div>
        ) : null}

        {phase.kind === "awaitingSlot" ? (
          <p className={s.help}>Tap an empty slot on the pitch. The wheel rolls for that slot.</p>
        ) : null}

        {revealed ? (
          <Candidates
            key={`cands-${rollId}`}
            ids={candidates}
            big={roll?.kind === "species" || (roll?.kind === "combo" && roll.offers !== null)}
            selected={selected}
            committed={choosing?.slot !== null}
            onTap={tapCandidate}
          />
        ) : null}

        {phase.kind === "complete" ? (
          <div className={s.done}>
            <p>Tap or drag two players to swap them before kick-off.</p>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="see-results"
              onClick={onSeeResults}
            >
              See results
            </button>
          </div>
        ) : null}

        <div className={s.footer}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid="new-run"
            onClick={onNewRun}
          >
            New run
          </button>
        </div>
      </section>

      <div className={s.road}>
        <RoadStrip seed={run.seed} mode={mode} compact />
      </div>

      <section className={s.pitch} data-armed={armed || undefined} aria-label="Your squad">
        <Pitch
          formation={settings.formation}
          lineup={state.lineup}
          speciesOf={speciesById}
          onSlotTap={tapSlot}
          onSwap={(a, b) => act({ type: "swap", a, b })}
          highlight={committed}
          selected={picked}
          label="Your formation"
          fit
        />
      </section>
    </div>
  );
}

function Candidates({
  ids,
  big,
  selected,
  committed,
  onTap,
}: {
  readonly ids: readonly SpeciesId[];
  readonly big: boolean;
  readonly selected: SpeciesId | null;
  readonly committed: boolean;
  readonly onTap: (id: SpeciesId) => void;
}) {
  return (
    <div className={s.candidates} data-big={big || undefined}>
      <p className="kicker">
        {committed ? "Tap a player to sign them" : "Tap a player, then an open slot"}
        {big ? null : ` · ${ids.length} available`}
      </p>
      <ul className={big ? s.cards : s.rows}>
        {ids.map((id) => {
          const sp = speciesById(id);
          return (
            <li key={id}>
              <button
                type="button"
                className={big ? s.card : s.row}
                data-testid={`candidate-${id}`}
                aria-pressed={committed ? undefined : selected === id}
                onClick={() => onTap(id)}
              >
                <PlayerImage dexId={id} size={big ? 72 : 40} alt={sp.name} />
                <span className={s.candName}>{sp.name}</span>
                <span className={`num ${s.candDex}`}>{dexLabel(id)}</span>
                <span className={s.candTypes}>
                  {sp.types.map((t) => (
                    <TypeChip key={t} type={t} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
