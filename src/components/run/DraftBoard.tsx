"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DRAFT_ROUNDS,
  FORMATIONS,
  REROLLS,
  speciesById,
  rateTeam,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type RerollTarget,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
import { announce } from "@/components/Announcer";
import { SquadFeedback } from "@/components/squad/SquadFeedback";
import { Pitch } from "@/components/pitch/Pitch";
import { RatingNote } from "@/components/pitch/RatingNote";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { RollReveal } from "@/components/wheel/RollReveal";
import { SoundToggle } from "@/components/wheel/SoundToggle";
import { announce as stageLine, dexLabel, stagesFor } from "@/components/wheel/reel";
import { playSignCard, playSpecialReveal, unlockAudio } from "@/components/wheel/sound";
import { useReducedMotion } from "@/components/wheel/useReducedMotion";
import { REGION_LABEL } from "@/ui/labels";
import { filledCount, refFromKey, sameRef, slotLabel, valueAt } from "@/ui/lineup";
import { ratingFor, type Rating } from "@/ui/rating";
import { swapMessage } from "@/ui/swap-message";
import { RoadStrip } from "./RoadStrip";
import { NavIcon } from "@/components/ui/nav-icons";
import { candidatesFor, withHint, type Run } from "./runState";
import { typeFrame } from "@/design/stadium";
import { fullLineup } from "@/components/builder/model";
import { ScoutingDossier } from "@/components/scouting/ScoutingDossier";
import { previewCandidateEdges, ratePartialLineup, ratePartialLines } from "@/ui/partial-rating";
import { getSlotSuitability } from "@/ui/suitability";
import s from "./DraftBoard.module.css";

export interface DraftBoardProps {
  readonly title: string;
  readonly navFamily?: "play" | "daily";
  readonly run: Run;
  readonly failure: string | null;
  readonly showRatings: boolean;
  readonly onAction: (action: DraftAction) => void;
  readonly onRun: (run: Run) => void;
  readonly onNewRun: () => void;
  readonly onSeeResults: () => void;
  // The cup plays a matchday after the draft, so the button kicks off instead of showing results.
  readonly kickOff: boolean;
}

const REROLL_BUTTONS: Readonly<Record<"cup8" | "kanto151", readonly [RerollTarget, string][]>> = {
  cup8: [
    ["type", "Reroll type"],
    ["region", "Reroll region"],
  ],
  kanto151: [["species", "Reroll"]],
};

// A downward drag on the open picker's toggle longer than this closes it, as on the builder Picker.
const SWIPE_CLOSE_PX = 80;

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

type ActiveDraftSettings = Exclude<DraftSettings, { readonly mode: "builder" }>;

export function DraftBoard(props: DraftBoardProps) {
  if (props.run.state.settings.mode === "builder") return null;
  return <ActiveDraftBoard {...props} settings={props.run.state.settings} />;
}

function ActiveDraftBoard({
  title,
  navFamily = "play",
  run,
  failure,
  showRatings,
  onAction,
  onRun,
  onNewRun,
  onSeeResults,
  kickOff,
  settings,
}: DraftBoardProps & { readonly settings: ActiveDraftSettings }) {
  const { state, rollId } = run;
  const { phase } = state;
  const reduced = useReducedMotion();
  const [revealedId, setRevealedId] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [hubOpen, setHubOpen] = useState(false);
  const [inspectId, setInspectId] = useState<SpeciesId | null>(null);
  const [askNewRun, setAskNewRun] = useState(false);
  const newRunRef = useRef<HTMLButtonElement>(null);
  const keepDraftingRef = useRef<HTMLButtonElement>(null);
  const askNewRunId = useId();
  const [swipeY, setSwipeY] = useState(0);
  const swipe = useRef<{ readonly pointerId: number; readonly y0: number } | null>(null);
  const swipeClosed = useRef(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragCandidate, setDragCandidate] = useState<{
    id: SpeciesId;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [dropSlot, setDropSlot] = useState<SlotRef | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragCandidateRef = useRef<{ id: SpeciesId; moved: boolean } | null>(null);
  // The player picked for a tap swap: a tap on a placed player, then a tap on another slot.
  const [swapFrom, setSwapFrom] = useState<SlotRef | null>(null);
  const onRevealDone = useCallback(() => setRevealedId(rollId), [rollId]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Where focus was when an action was sent, to move it to the heading if that control is gone.
  const focusBefore = useRef<Element | null>(null);
  const runBefore = useRef(run);
  const spokenRoll = useRef(-1);
  const specialRevealRoll = useRef(-1);
  const pitchRef = useRef<HTMLElement>(null);
  const scrolledRoll = useRef<number | null>(null);

  const [prevRollId, setPrevRollId] = useState(rollId);
  if (rollId !== prevRollId) {
    setPrevRollId(rollId);
    setSelection(null);
    setDropSlot(null);
    if (phase.kind === "choosing") {
      setDrawerOpen(true);
    }
  }

  const drawerRef = useRef<HTMLDivElement>(null);

  const placeAfterPick = phase.kind === "choosing" && phase.slot === null;
  useEffect(() => {
    const pitch = pitchRef.current;
    if (!placeAfterPick || pitch === null || scrolledRoll.current === rollId) return;
    scrolledRoll.current = rollId;
    const top = pitch.getBoundingClientRect().top;
    const headerRoom = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    // Leave the page alone while the pitch top already shows, so the hub above it stays in view.
    if (top >= headerRoom && top <= window.innerHeight / 2) return;
    pitch.scrollIntoView({ block: "start", behavior: "instant" });
  }, [rollId, placeAfterPick]);

  useEffect(() => {
    if (run.error === null) return;
    const id = window.setTimeout(() => onRun(withHint(run, null)), HINT_MS);
    return () => window.clearTimeout(id);
  }, [run, onRun]);

  useEffect(() => {
    const before = runBefore.current;
    runBefore.current = run;
    if (before === run) return;
    if (before.seed !== run.seed || (before.actions.length > 0 && run.actions.length === 0)) {
      scrolledRoll.current = null;
    }
    const was = focusBefore.current;
    focusBefore.current = null;
    if (was !== null && !was.isConnected) headingRef.current?.focus({ preventScroll: true });
    if (run.error !== null) announce(run.error);
    else if (run.actions.length > before.actions.length) {
      const action = run.actions[run.actions.length - 1]!;
      announce(outcome(before.state, run.state, action));
      if (action.type === "pick") playSignCard();
    }
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

  const mode = settings.mode;
  const squadFirst = settings.order === "squadFirst";
  const choosing = phase.kind === "choosing" ? phase : null;
  const revealed = choosing !== null && (reduced || revealedId === rollId);
  const candidates = useMemo(() => (revealed ? candidatesFor(state) : []), [revealed, state]);
  useEffect(() => {
    if (!revealed || specialRevealRoll.current === rollId) return;
    specialRevealRoll.current = rollId;
    if (candidates.some((id) => speciesById(id).special)) playSpecialReveal();
  }, [revealed, rollId, candidates]);
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

  const slotRole = (ref: SlotRef) =>
    ref.kind === "starter" ? FORMATIONS[settings.formation].slots[ref.index].role : null;
  const rateOffer = (id: SpeciesId): Rating =>
    committed === null
      ? ratingFor(speciesById(id), null, "")
      : ratingFor(speciesById(id), slotRole(committed), slotLabel(state.lineup, committed));
  const tokenNote = (ref: SlotRef, noteId: string): ReactNode => {
    const id = valueAt(state.lineup, ref);
    if (id === null) return null;
    return (
      <RatingNote
        id={noteId}
        rating={ratingFor(speciesById(id), slotRole(ref), slotLabel(state.lineup, ref))}
      />
    );
  };

  const act = useCallback(
    (action: DraftAction) => {
      focusBefore.current = document.activeElement;
      setSwapFrom(null);
      if (action.type === "pick") setDrawerOpen(true);
      onAction(action);
    },
    [onAction],
  );

  const tapCandidate = useCallback(
    (id: SpeciesId) => {
      if (choosing === null) return;
      if (choosing.slot !== null) {
        setDrawerOpen(false);
        act({ type: "pick", species: id, slot: choosing.slot });
        return;
      }
      setSelection({ rollId, species: id });
      setDrawerOpen(false);
    },
    [choosing, act, rollId],
  );

  const onCandidatePointerDown = useCallback((id: SpeciesId, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragPointerId.current = e.pointerId;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragCandidateRef.current = { id, moved: false };
    setDragCandidate({ id, x: e.clientX, y: e.clientY, moved: false });
  }, []);

  useEffect(() => {
    if (dragCandidate === null) return;
    const onPointerMove = (e: PointerEvent) => {
      if (dragPointerId.current !== e.pointerId) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const threshold = e.pointerType === "touch" ? 16 : 8;
      const moved = (dragCandidateRef.current?.moved ?? false) || Math.hypot(dx, dy) > threshold;
      if (dragCandidateRef.current) dragCandidateRef.current.moved = moved;
      setDragCandidate((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY, moved } : null));
      if (moved) {
        const drawerRect = drawerRef.current?.getBoundingClientRect();
        const overDrawer =
          drawerRect !== undefined &&
          e.clientX >= drawerRect.left &&
          e.clientX <= drawerRect.right &&
          e.clientY >= drawerRect.top &&
          e.clientY <= drawerRect.bottom;
        if (overDrawer) {
          setDropSlot(null);
        } else {
          const el = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-slot-key]");
          const under = el?.dataset.slotKey ? refFromKey(el.dataset.slotKey) : null;
          setDropSlot(under !== null && valueAt(state.lineup, under) === null ? under : null);
        }
      }
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (dragPointerId.current !== e.pointerId) return;
      dragCandidateRef.current = null;
      setDragCandidate(null);
      setDropSlot(null);
      dragPointerId.current = null;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (dragPointerId.current !== e.pointerId) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const threshold = e.pointerType === "touch" ? 16 : 8;
      const moved = (dragCandidateRef.current?.moved ?? false) || Math.hypot(dx, dy) > threshold;
      const drawerRect = drawerRef.current?.getBoundingClientRect();
      const overDrawer =
        drawerRect !== undefined &&
        e.clientX >= drawerRect.left &&
        e.clientX <= drawerRect.right &&
        e.clientY >= drawerRect.top &&
        e.clientY <= drawerRect.bottom;
      if (moved && dragCandidateRef.current && !overDrawer) {
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-slot-key]");
        const target =
          choosing?.slot ?? (el?.dataset.slotKey ? refFromKey(el.dataset.slotKey) : null);
        if (target !== null && valueAt(state.lineup, target) === null) {
          act({ type: "pick", species: dragCandidateRef.current.id, slot: target });
          setSelection(null);
          setDrawerOpen(false);
        }
      }
      dragCandidateRef.current = null;
      setDragCandidate(null);
      setDropSlot(null);
      dragPointerId.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [dragCandidate, state.lineup, act, choosing?.slot]);

  const cancelNewRun = useCallback(() => setAskNewRun(false), []);
  const askedNewRun = useRef(false);
  useEffect(() => {
    if (askNewRun) keepDraftingRef.current?.focus({ preventScroll: true });
    else if (askedNewRun.current) newRunRef.current?.focus({ preventScroll: true });
    askedNewRun.current = askNewRun;
  }, [askNewRun]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inspectId !== null || document.querySelector("dialog[open]") !== null) return;
      if (askNewRun) {
        if (e.key === "Escape") cancelNewRun();
        return;
      }
      if (e.key === "Escape") {
        if (swapFrom !== null) {
          setSwapFrom(null);
          announce("Swap cancelled.");
          return;
        }
        if (selection !== null) {
          setSelection(null);
          setDrawerOpen(true);
          announce("Selection cleared. Reopened spin results.");
          return;
        }
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (revealed && candidates.length > 0) {
        const index = ["1", "2", "3"].indexOf(e.key);
        if (index !== -1 && index < candidates.length) {
          e.preventDefault();
          tapCandidate(candidates[index]!);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swapFrom, selection, revealed, candidates, tapCandidate, inspectId, askNewRun, cancelNewRun]);

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
      setDrawerOpen(false);
      const name = speciesById(id).name;
      setSwapFrom(ref);
      announce(`${slotLabel(state.lineup, ref)} ${name} selected. ${swapPrompt(name)}`);
      return;
    }
    if (phase.kind === "awaitingSlot") {
      setDrawerOpen(true);
      act({ type: "chooseSlot", slot: ref });
      return;
    }
    if (choosing === null) return;
    if (committed !== null) {
      hint("Pick a player for the highlighted slot.");
      return;
    }
    if (selected === null) {
      setDrawerOpen(true);
      hint(revealed ? "Choose a player first, then tap a slot." : "Wait for the wheel to stop.");
      return;
    }
    act({ type: "pick", species: selected, slot: ref });
    setSelection(null);
  };

  const full = fullLineup(state.lineup);
  const teamRating = full === null ? null : rateTeam(full);
  const partialRating = useMemo(() => ratePartialLineup(state.lineup), [state.lineup]);
  const liveSynergy = teamRating?.synergy ?? partialRating.synergy;
  const armed = phase.kind === "awaitingSlot" || (committed === null && selected !== null);
  const message = failure ?? run.error ?? (pickedName === null ? null : swapPrompt(pickedName));
  const activeSpecies = useMemo(() => {
    if (dragCandidate !== null) return speciesById(dragCandidate.id);
    if (selected !== null) return speciesById(selected);
    return null;
  }, [dragCandidate, selected]);
  const previewEdges = useMemo(
    () => (activeSpecies === null ? [] : previewCandidateEdges(state.lineup, activeSpecies.id)),
    [activeSpecies, state.lineup],
  );

  return (
    <div
      className={s.board}
      data-revealed={revealed || undefined}
      data-rated={showRatings || undefined}
      data-drawer={drawerOpen || undefined}
      data-hub={hubOpen || undefined}
      data-choosing={phase.kind === "choosing" || undefined}
      data-has-selection={selected !== null || undefined}
      data-dragging-candidate={dragCandidate?.moved || undefined}
    >
      {drawerOpen && phase.kind === "choosing" && selected === null ? (
        <div
          className={s.drawerBackdrop}
          aria-hidden="true"
          data-testid="draft-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <div className={s.hub}>
        <div className={s.hubControls}>
          <button
            type="button"
            className="btn btn--ghost"
            aria-expanded={hubOpen}
            onClick={() => setHubOpen(!hubOpen)}
          >
            Challenge Hub · {title}
          </button>
          <SoundToggle />
        </div>
        <p>
          Draft: {filledCount(state.lineup)}/16 ·{" "}
          {liveSynergy === null
            ? "Chemistry after draft"
            : `${Math.round(liveSynergy * 100)}% Chem`}
          {partialRating.specialCount > 0 ? ` · Legendaries: ${partialRating.specialCount}/3` : ""}
        </p>
      </div>
      <section className={s.side} aria-label="Draft">
        <header className={s.header}>
          <div className={s.titleRow}>
            <span className="eyebrow">
              <NavIcon family={navFamily} />
              {title}
            </span>
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
        </header>

        {/* The page's live region reads this out; the line itself is for the eyes. */}
        {message !== null ? (
          <p className={s.error} data-testid="draft-hint">
            {message}
          </p>
        ) : null}

        {phase.kind === "awaitingSlot" ? (
          <p className={s.help}>Tap an empty slot on the pitch. The wheel rolls for that slot.</p>
        ) : null}

        {phase.kind === "choosing" ? (
          <div
            ref={drawerRef}
            className={s.drawer}
            data-testid="draft-drawer"
            style={drawerOpen && swipeY > 0 ? { transform: `translateY(${swipeY}px)` } : undefined}
          >
            <button
              type="button"
              className={`btn btn--ghost ${s.drawerToggle}`}
              onClick={() => {
                if (swipeClosed.current) {
                  swipeClosed.current = false;
                  return;
                }
                setDrawerOpen(!drawerOpen);
              }}
              onPointerDown={(e) => {
                swipeClosed.current = false;
                if (!drawerOpen || e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                swipe.current = { pointerId: e.pointerId, y0: e.clientY };
              }}
              onPointerMove={(e) => {
                if (swipe.current?.pointerId !== e.pointerId) return;
                setSwipeY(Math.max(0, e.clientY - swipe.current.y0));
              }}
              onPointerUp={(e) => {
                if (swipe.current?.pointerId !== e.pointerId) return;
                const moved = e.clientY - swipe.current.y0;
                swipe.current = null;
                setSwipeY(0);
                if (moved > SWIPE_CLOSE_PX) {
                  swipeClosed.current = true;
                  setDrawerOpen(false);
                }
              }}
              onPointerCancel={() => {
                swipe.current = null;
                setSwipeY(0);
              }}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? "Hide players" : revealed ? "Show players" : "Show roll"}
            </button>
            {roll !== null ? (
              <div className={s.wheels} data-testid="draft-wheel">
                <RollReveal
                  key={`reveal-${rollId}`}
                  stages={stagesFor(roll, settings, run.cause)}
                  instant={reduced}
                  onDone={onRevealDone}
                />
              </div>
            ) : null}
            {revealed ? (
              <>
                <Candidates
                  key={`cands-${rollId}`}
                  ids={candidates}
                  selected={selected}
                  committed={choosing?.slot !== null}
                  rate={showRatings ? rateOffer : null}
                  onTap={tapCandidate}
                  onCandidatePointerDown={onCandidatePointerDown}
                />
                <div className={s.rerolls}>
                  {REROLL_BUTTONS[mode].map(([target, label]) => {
                    // aria-disabled, not disabled, so a pressed button keeps focus while it is off.
                    const off = remaining <= 0 || !revealed;
                    return (
                      <button
                        key={target}
                        type="button"
                        className="btn btn--sm"
                        aria-label={`${label} ${remaining}/${REROLLS[mode]}, ${remaining} left`}
                        aria-disabled={off || undefined}
                        onClick={() => {
                          if (off) return;
                          unlockAudio();
                          act({ type: "reroll", target });
                        }}
                      >
                        {label}{" "}
                        <span className={s.count}>
                          {remaining}/{REROLLS[mode]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
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
              {kickOff ? "Kick off" : "See results"}
            </button>
          </div>
        ) : null}

        <div className={s.footer}>
          {showRatings ? (
            <p className={s.legend} data-testid="ratings-legend">
              Ratings are 0 to 100, vs other players in the same role.
            </p>
          ) : null}
          {askNewRun ? (
            <div className={s.askNewRun} role="group" aria-labelledby={askNewRunId}>
              <p id={askNewRunId}>
                Start over? The {filledCount(state.lineup)}{" "}
                {filledCount(state.lineup) === 1 ? "player" : "players"} you signed will be lost.
              </p>
              <button
                type="button"
                className="btn btn--sm"
                data-testid="new-run-confirm"
                onClick={onNewRun}
              >
                Start over
              </button>
              <button
                ref={keepDraftingRef}
                type="button"
                className="btn btn--primary btn--sm"
                data-testid="new-run-cancel"
                onClick={cancelNewRun}
              >
                Keep drafting
              </button>
            </div>
          ) : (
            <button
              ref={newRunRef}
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid="new-run"
              onClick={() => {
                if (filledCount(state.lineup) === 0) onNewRun();
                else setAskNewRun(true);
              }}
            >
              New run
            </button>
          )}
        </div>
      </section>

      <div className={s.road}>
        <RoadStrip seed={run.seed} mode={mode} compact />
      </div>

      <section
        ref={pitchRef}
        className={s.pitch}
        data-testid="draft-pitch"
        data-armed={armed || undefined}
        aria-label="Your squad"
      >
        {selected !== null && phase.kind === "choosing" && !drawerOpen ? (
          <div className={s.selectionBar} data-testid="draft-selection-bar">
            <div className={s.selectionMeta}>
              <PlayerImage dexId={selected} size={32} alt={speciesById(selected).name} />
              <div className={s.selectionDetails}>
                <span className={s.selectionName}>{speciesById(selected).name}</span>
                <span className={s.selectionHint}>Tap pitch position to place</span>
              </div>
            </div>
            <div className={s.selectionLegend} aria-hidden="true">
              <span className={s.legendItem}>
                <span className={s.legendDot} data-suit="rec" />
                Best
              </span>
              <span className={s.legendItem}>
                <span className={s.legendDot} data-suit="ok" />
                OK
              </span>
              <span className={s.legendItem}>
                <span className={s.legendDot} data-suit="bad" />
                Poor
              </span>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid={`inspect-selected-${selected}`}
              onClick={() => setInspectId(selected)}
            >
              Scout
            </button>
            <button
              type="button"
              className={`btn btn--sm ${s.changePickBtn}`}
              onClick={() => {
                setSelection(null);
                setDrawerOpen(true);
              }}
              aria-label="Back to the roll"
            >
              Show roll
            </button>
          </div>
        ) : null}
        <Pitch
          formation={settings.formation}
          lineup={state.lineup}
          speciesOf={speciesById}
          onSlotTap={tapSlot}
          onSwap={(a, b) => act({ type: "swap", a, b })}
          highlight={committed}
          selected={picked}
          label="Your formation"
          tokenNote={showRatings ? tokenNote : undefined}
          edges={teamRating?.edges ?? partialRating.edges}
          previewEdges={previewEdges}
          suitabilityOf={
            activeSpecies !== null
              ? (ref) => getSlotSuitability(activeSpecies, settings.formation, ref)
              : undefined
          }
          dropTarget={dropSlot}
          fit
        />
        <SquadFeedback
          lineup={state.lineup}
          speciesOf={speciesById}
          edges={partialRating.edges}
          lines={showRatings ? ratePartialLines(state.lineup) : undefined}
          onScout={setInspectId}
        />
      </section>

      {inspectId !== null ? (
        <ScoutingDossier
          speciesId={inspectId}
          showRatings={showRatings}
          onClose={() => setInspectId(null)}
        />
      ) : null}

      {dragCandidate && dragCandidate.moved ? (
        <div
          className={s.dragPreview}
          style={{
            left: `${dragCandidate.x}px`,
            top: `${dragCandidate.y}px`,
          }}
          aria-hidden="true"
        >
          <PlayerImage dexId={dragCandidate.id} size={44} alt="" />
          <span>{speciesById(dragCandidate.id).name}</span>
        </div>
      ) : null}
    </div>
  );
}

function Candidates({
  ids,
  selected,
  committed,
  rate,
  onTap,
  onCandidatePointerDown,
}: {
  readonly ids: readonly SpeciesId[];
  readonly selected: SpeciesId | null;
  readonly committed: boolean;
  readonly rate: ((id: SpeciesId) => Rating) | null;
  readonly onTap: (id: SpeciesId) => void;
  readonly onCandidatePointerDown?: (id: SpeciesId, e: React.PointerEvent) => void;
}) {
  const rawFitId = useId();
  const isCompact = ids.length > 3;
  return (
    <div className={s.candidates} data-many={isCompact || undefined}>
      <div className={s.dragHandle} aria-hidden="true" />
      <p className="kicker">
        {committed ? "Tap a player to sign them" : "Tap a player, then an open slot"}
        {isCompact ? ` · ${ids.length} available` : null}
      </p>
      <ul className={s.cards} data-scrollable={isCompact || undefined}>
        {ids.map((id) => {
          const sp = speciesById(id);
          const rating = rate === null ? null : rate(id);
          const primaryType = sp.types[0];
          return (
            <li key={id}>
              <button
                type="button"
                className={s.card}
                data-testid={`candidate-${id}`}
                data-type={primaryType}
                style={typeFrame(primaryType)}
                aria-pressed={committed ? undefined : selected === id}
                aria-describedby={rating !== null ? `${rawFitId}-${id}` : undefined}
                data-rated={rating !== null || undefined}
                onClick={() => onTap(id)}
                onPointerDown={(e) => onCandidatePointerDown?.(id, e)}
              >
                <div className={s.cardArtWrap}>
                  <PlayerImage dexId={id} size={isCompact ? 72 : 88} alt={sp.name} />
                </div>
                <span className={s.candName}>{sp.name}</span>
                {sp.special ? <span className={s.candSpecial}>Legendary / Mythical</span> : null}
                <span className={`num ${s.candDex}`}>{dexLabel(id)}</span>
                <span className={s.candTypes}>
                  {sp.types.map((t) => (
                    <TypeChip key={t} type={t} />
                  ))}
                </span>
                {rating !== null ? (
                  <span className={s.candFit} data-testid={`fit-${id}`}>
                    {rating.best !== null ? (
                      <>
                        <span className={s.candFitLabel}>Best: {rating.best}</span>{" "}
                      </>
                    ) : null}
                    <span className="num">{rating.score}</span>{" "}
                    <span className={s.candFitVs}>{rating.versus}</span>
                  </span>
                ) : null}
              </button>
              {/* Outside the button, so the raw fit is a description and not part of its name. */}
              {rating !== null ? (
                <span id={`${rawFitId}-${id}`} className="visually-hidden">
                  {rating.raw}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
