"use client";

import { useCallback, useState } from "react";
import {
  DRAFT_ROUNDS,
  REROLLS,
  speciesById,
  type DraftAction,
  type RerollTarget,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
import { Pitch } from "@/components/pitch/Pitch";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { RollReveal } from "@/components/wheel/RollReveal";
import { SoundToggle } from "@/components/wheel/SoundToggle";
import { dexLabel, stagesFor } from "@/components/wheel/reel";
import { unlockAudio } from "@/components/wheel/sound";
import { useReducedMotion } from "@/components/wheel/useReducedMotion";
import { REGION_LABEL } from "@/ui/labels";
import { valueAt } from "@/ui/lineup";
import { RoadStrip } from "./RoadStrip";
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
  const onRevealDone = useCallback(() => setRevealedId(rollId), [rollId]);

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

  const tapCandidate = (id: SpeciesId) => {
    if (choosing === null) return;
    if (choosing.slot !== null) {
      onAction({ type: "pick", species: id, slot: choosing.slot });
      return;
    }
    setSelection(selected === id ? null : { rollId, species: id });
  };

  const tapSlot = (ref: SlotRef) => {
    const filled = valueAt(state.lineup, ref) !== null;
    if (phase.kind === "awaitingSlot") {
      if (filled) hint("That slot is taken. Pick an empty one.");
      else onAction({ type: "chooseSlot", slot: ref });
      return;
    }
    if (choosing === null) return;
    if (choosing.slot !== null) {
      hint("Pick a player for the highlighted slot.");
      return;
    }
    if (filled) {
      hint("That slot is taken. Drag one player onto another to swap them.");
      return;
    }
    if (selected === null) {
      hint(revealed ? "Choose a player first, then tap a slot." : "Wait for the wheel to stop.");
      return;
    }
    onAction({ type: "pick", species: selected, slot: ref });
  };

  const armed = phase.kind === "awaitingSlot" || (choosing?.slot === null && selected !== null);
  const roll = choosing?.roll ?? null;

  return (
    <div className={s.board}>
      <section className={s.side} aria-label="Draft">
        <header className={s.header}>
          <div className={s.titleRow}>
            <span className="kicker">{title}</span>
            <SoundToggle />
          </div>
          <h1 className={s.round} data-testid="round-header">
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
              {REROLL_BUTTONS[mode].map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  className="btn btn--sm"
                  aria-label={`${label}, ${remaining} left`}
                  disabled={remaining <= 0 || !revealed}
                  onClick={() => {
                    unlockAudio();
                    onAction({ type: "reroll", target });
                  }}
                >
                  {label}
                  <span className={s.count} aria-hidden="true">
                    {remaining}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {failure !== null || run.error !== null ? (
          <p className={s.error} role="status">
            {failure ?? run.error}
          </p>
        ) : null}

        {roll !== null ? (
          <RollReveal
            key={rollId}
            stages={stagesFor(roll, settings, run.cause)}
            instant={reduced}
            onDone={onRevealDone}
          />
        ) : null}

        {phase.kind === "awaitingSlot" ? (
          <p className={s.help}>Tap an empty slot on the pitch. The wheel rolls for that slot.</p>
        ) : null}

        {revealed ? (
          <Candidates
            key={rollId}
            ids={candidates}
            big={roll?.kind === "species" || (roll?.kind === "combo" && roll.offers !== null)}
            selected={selected}
            committed={choosing?.slot !== null}
            onTap={tapCandidate}
          />
        ) : null}

        {phase.kind === "complete" ? (
          <div className={s.done}>
            <p>Your squad of {DRAFT_ROUNDS} is set. Drag players to swap them before kick-off.</p>
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
        <RoadStrip compact />
      </section>

      <section className={s.pitch} data-armed={armed || undefined} aria-label="Your squad">
        <Pitch
          formation={settings.formation}
          lineup={state.lineup}
          onSlotTap={tapSlot}
          onSwap={(a, b) => onAction({ type: "swap", a, b })}
          highlight={choosing?.slot ?? null}
          label="Your formation"
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
