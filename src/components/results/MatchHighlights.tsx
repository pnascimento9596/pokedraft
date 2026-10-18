"use client";

import { useState, useMemo, useRef, useEffect, type CSSProperties } from "react";
import type { CupResult, CupRound, DraftState } from "@/engine";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeIcon } from "@/components/TypeIcon";
import { playGoalHorn, unlockAudio } from "@/components/wheel/sound";
import { TYPE_PALETTE } from "@/design/stadium";
import { getAllMatchStars, type MatchStar } from "./starCalculation";
import { RecordedSaves } from "./RecordedSaves";
import { SoccerBall } from "./SoccerBall";
import s from "./MatchHighlights.module.css";

export interface MatchHighlightsProps {
  readonly cup: CupResult;
  readonly draft: DraftState;
  readonly selectedRound?: CupRound | "mvp" | null;
  readonly onSelectRound?: (round: CupRound | "mvp") => void;
}

export function MatchHighlights({
  cup,
  draft,
  selectedRound = null,
  onSelectRound,
}: MatchHighlightsProps) {
  const stars = useMemo(() => getAllMatchStars(cup, draft), [cup, draft]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [striking, setStriking] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [prevSelectedRound, setPrevSelectedRound] = useState<CupRound | "mvp" | null>(null);

  if (selectedRound !== prevSelectedRound) {
    setPrevSelectedRound(selectedRound);
    if (selectedRound !== null) {
      const idx = stars.findIndex((st) => st.round === selectedRound);
      if (idx >= 0) {
        setActiveIdx(idx);
        setStriking(false);
        setShowGoal(false);
      }
    }
  }

  const goalTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelStrikeTimers = () => {
    clearTimeout(goalTimer.current);
    clearTimeout(resetTimer.current);
    goalTimer.current = undefined;
    resetTimer.current = undefined;
  };

  useEffect(() => cancelStrikeTimers, [selectedRound]);

  if (stars.length === 0) return null;

  const currentStar: MatchStar = stars[activeIdx] ?? stars[0]!;
  const starColor = TYPE_PALETTE[currentStar.element] ?? TYPE_PALETTE.water;

  const handleSelect = (idx: number) => {
    cancelStrikeTimers();
    setActiveIdx(idx);
    setStriking(false);
    setShowGoal(false);
    const target = stars[idx];
    if (target) {
      onSelectRound?.(target.round);
      setAnnouncement(`Showing ${target.roundLabel}: Star player ${target.name}`);
    }
  };

  const handlePrev = () => {
    if (activeIdx > 0) handleSelect(activeIdx - 1);
  };

  const handleNext = () => {
    if (activeIdx < stars.length - 1) handleSelect(activeIdx + 1);
  };

  const handleStrike = () => {
    if (striking) return;
    unlockAudio();
    if (currentStar.action === "attack") playGoalHorn();
    setStriking(true);
    setAnnouncement(`${currentStar.name} unleashed ${currentStar.kickMove}!`);

    goalTimer.current = setTimeout(() => {
      setShowGoal(true);
      setAnnouncement(
        currentStar.action === "defend"
          ? `Defensive illustration: ${currentStar.name} blocks with ${currentStar.kickMove}.`
          : `Goal illustration: ${currentStar.name} strikes with ${currentStar.kickMove}.`,
      );
    }, 550);

    resetTimer.current = setTimeout(() => {
      setStriking(false);
      setShowGoal(false);
    }, 2800);
  };

  const handleReset = () => {
    cancelStrikeTimers();
    setStriking(false);
    setShowGoal(false);
  };

  const stageStyle = {
    "--star-color": starColor,
  } as CSSProperties;

  return (
    <section
      className={s.highlights}
      data-testid="match-highlights"
      data-paused={paused}
      aria-label="Match Highlights and Star Performers"
      style={stageStyle}
    >
      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>

      <div className={s.topRow}>
        <div className={s.headlineGroup}>
          <span className={s.eyebrow}>Silph Stadium Highlights</span>
          <span className={s.matchTitle} data-testid="highlight-title">
            {currentStar.isTournamentMvp
              ? "Tournament Recap"
              : `${currentStar.roundLabel} vs ${currentStar.opponentName}`}
            <span className={s.scorePill} data-outcome={currentStar.outcome}>
              {currentStar.matchScore}
            </span>
          </span>
        </div>

        <button
          type="button"
          className={s.motionToggle}
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
        >
          <span aria-hidden="true">{paused ? "▶" : "⏸"}</span>{" "}
          {paused ? "Play Motion" : "Pause Motion"}
        </button>
      </div>

      {/* Match Selector Navigation */}
      <div className={s.navStrip} role="region" aria-label="Select match to view star">
        <button
          type="button"
          className={s.navArrow}
          onClick={handlePrev}
          disabled={activeIdx === 0}
          aria-label="Previous match"
        >
          ◀
        </button>

        <div className={s.chipList}>
          {stars.map((star, idx) => (
            <button
              key={`${star.round}-${idx}`}
              type="button"
              className={s.matchChip}
              data-active={activeIdx === idx}
              data-testid={`highlight-chip-${star.round}`}
              onClick={() => handleSelect(idx)}
              aria-pressed={activeIdx === idx}
            >
              <span className={s.outcomeDot} data-outcome={star.outcome} />
              {star.roundShort}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={s.navArrow}
          onClick={handleNext}
          disabled={activeIdx === stars.length - 1}
          aria-label="Next match"
        >
          ▶
        </button>
      </div>

      {/* Interactive Stadium Pitch Stage */}
      <div className={s.stage} data-testid="highlights-stage">
        <div className={s.turfMarking} aria-hidden="true" />

        {/* Player & Dribbling Ball Arena */}
        <div className={s.playerArea}>
          <div className={s.elementalAura} aria-hidden="true" />

          <div className={s.spriteWrap} data-striking={striking}>
            <PlayerImage dexId={currentStar.speciesId} size={84} alt={currentStar.name} />
          </div>

          <div className={s.ballStage} aria-hidden="true">
            <div className={s.ballShadow} data-striking={striking} />
            <SoccerBall size={26} className={s.ball} striking={striking} />
          </div>
        </div>

        {/* Star Accolade & Ability HUD */}
        <div className={s.infoArea}>
          <div className={s.starBadgeRow}>
            <span className={s.rolePill}>{currentStar.role}</span>
            <TypeIcon type={currentStar.element} size={18} decorative />
            <h2 className={s.starName} data-testid="star-name">
              {currentStar.name}
            </h2>
          </div>

          <div className={s.headlineText} data-testid="star-headline">
            <span aria-hidden="true">{currentStar.icon}</span> {currentStar.headline}
          </div>

          <div className={s.statSummary}>{currentStar.statSummary}</div>

          <div className={s.abilityBox} data-testid="star-ability">
            <div className={s.abilityHeader}>
              <span>Ability:</span>
              <span className={s.abilityTag}>{currentStar.ability}</span>
            </div>
            <div className={s.abilityFlavor}>{currentStar.abilityFlavor}</div>
          </div>

          {/* Interactive Action Button */}
          <div className={s.actionRow}>
            <button
              type="button"
              className={s.strikeButton}
              onClick={handleStrike}
              disabled={striking}
              data-testid="strike-btn"
            >
              {currentStar.action === "defend" ? (
                "Defensive drill: "
              ) : (
                <>
                  <span aria-hidden="true">⚽</span> Unleash{" "}
                </>
              )}
              {currentStar.kickMove}!
            </button>
          </div>
        </div>

        {/* Goal Explosion Celebration Overlay */}
        {showGoal ? (
          <div
            className={s.goalOverlay}
            data-testid="goal-overlay"
            role="status"
            aria-label={
              currentStar.action === "defend" ? "Defensive illustration" : "Goal celebration"
            }
          >
            <div className={s.goalTitle}>
              {currentStar.action === "defend" ? (
                "BLOCK!"
              ) : (
                <>
                  <span aria-hidden="true">⚽</span> GOAL!
                </>
              )}
            </div>
            <div className={s.goalSubtitle}>
              {currentStar.name} {currentStar.action === "defend" ? "blocks" : "strikes"} with{" "}
              {currentStar.kickMove}!
            </div>
            <button type="button" className={s.goalResetBtn} onClick={handleReset}>
              Continue Dribbling
            </button>
          </div>
        ) : null}
      </div>
      {cup.matches
        .filter((m) => m.status === "played" && m.round === currentStar.round)
        .map((m) =>
          m.status === "played" ? <RecordedSaves key={m.round} saves={m.saves} illustrate /> : null,
        )}
      <p className="kicker">
        Illustrated highlights. Actions do not change the recorded match result.
      </p>
    </section>
  );
}
