"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { challengeHref } from "@/ui/challenge-href";
import { exhibitionHref, squadFromToken } from "@/ui/exhibition-route";
import { PlayerImage } from "@/components/PlayerImage";
import { slimSpeciesById } from "@/data/species-index";
import { StatusNote } from "@/components/ui/primitives";
import { announce } from "@/components/Announcer";
import { record } from "@/ui/labels";
import { fetchBoard, type BoardResult, type BoardView } from "./client";
import { COACH_FILTERS, type CoachFilter, type EngineFilter } from "@/leaderboard/contract";
import { COACH_FILTER_LABEL, engineRowLabel, variantLabel } from "./format";
import { useOwnNickname } from "./ownNickname";
import s from "./Board.module.css";

const FILTER_EMPTY: Readonly<Record<Exclude<CoachFilter, "all">, string>> = {
  coached: "No coached runs on this board yet.",
  uncoached: "No uncoached runs on this board yet.",
};

const NO_ENGINE_RUNS = "No runs on this engine yet.";

const CHIP_CLASS: Readonly<Record<CoachFilter, string | undefined>> = {
  all: s.chipAll,
  uncoached: s.chipUncoached,
  coached: s.chipCoached,
};

const ERROR_COPY: Readonly<Record<Extract<BoardResult, { kind: "error" }>["reason"], string>> = {
  offline: "The leaderboard is offline right now.",
  network: "Could not reach the leaderboard. Check your connection.",
  unexpected: "The leaderboard sent a reply we could not read.",
};

function Figure({ value }: { readonly value: string | number }) {
  const text = String(value);
  return (
    <bdi className={s.figure} role="group" aria-label={text}>
      {[...text].map((character, index) => (
        <span key={index} className={character === "-" ? s.separator : s.digit} aria-hidden="true">
          {character}
        </span>
      ))}
    </bdi>
  );
}

export function Board({
  view,
  onCoachChange,
  onEngineChange,
}: {
  readonly view: BoardView;
  readonly onCoachChange: (coach: CoachFilter) => void;
  readonly onEngineChange: (engine: EngineFilter) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const me = useOwnNickname();
  const { coach } = view;
  const engine = view.scope === "all" ? view.engine : "current";
  const board = `${view.mode}|${view.scope}|${view.scope === "daily" ? view.date : ""}`;
  const key = `${board}|${coach}|${engine}|${attempt}`;
  // `older`: the current-engine all-time board is empty but All engines has runs.
  const [loaded, setLoaded] = useState<{
    key: string;
    result: BoardResult;
    older: boolean;
  } | null>(null);
  // The board this player has seen rows on. Once it has, the chips stay mounted through every
  // filtered load, empty view or error, so switching views never moves the page.
  const [filtered, setFiltered] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBoard(view, ctrl.signal).then(async (result) => {
      const askOlder =
        engine === "current" &&
        view.scope === "all" &&
        coach === "all" &&
        result.kind === "ok" &&
        result.entries.length === 0;
      const all = askOlder ? await fetchBoard({ ...view, engine: "all" }, ctrl.signal) : null;
      if (ctrl.signal.aborted) return;
      setLoaded({ key, result, older: all?.kind === "ok" && all.entries.length > 0 });
      if (result.kind === "ok" && result.entries.length > 0) setFiltered(board);
    });
    return () => ctrl.abort();
    // `key` covers every field of `view` and the coach filter that changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const result = loaded?.key === key ? loaded.result : null;
  const older = loaded?.key === key && loaded.older;
  const hasRows = result?.kind === "ok" && result.entries.length > 0;
  const showChips = hasRows || coach !== "all" || filtered === board;

  // Try again unmounts itself, so the next board, empty state or error takes focus. The attempt
  // number keeps the error's own effect, if it runs after the click, from taking that focus.
  const focusAttempt = useRef<number | null>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const target = (el: HTMLElement | null) => {
    focusTarget.current = el;
  };

  useEffect(() => {
    if (result === null) return;
    // An error is a role="alert" and speaks for itself.
    if (result.kind === "ok") {
      const n = result.entries.length;
      announce(
        n > 0
          ? n === 1
            ? "1 entry."
            : `${n} entries.`
          : coach !== "all"
            ? FILTER_EMPTY[coach]
            : older
              ? NO_ENGINE_RUNS
              : "No entries yet.",
      );
    }
    if (focusAttempt.current === attempt) {
      focusAttempt.current = null;
      focusTarget.current?.focus({ preventScroll: true });
    }
  }, [result, attempt, coach, older]);

  const chips = showChips ? (
    <div
      className={s.coachFilter}
      role="group"
      aria-label="Coached runs"
      data-testid="coach-filter"
    >
      {COACH_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          className={`chip ${CHIP_CLASS[f]}`}
          aria-pressed={coach === f}
          data-testid={`coach-filter-${f}`}
          onClick={() => onCoachChange(f)}
        >
          {COACH_FILTER_LABEL[f]}
        </button>
      ))}
    </div>
  ) : null;

  // On the all-time board only: a current-engine board can be empty while older runs exist.
  const engineToggle =
    view.scope === "all" ? (
      <button
        type="button"
        className={`chip ${s.engineToggle}`}
        aria-pressed={engine === "all"}
        data-testid="engine-filter-all"
        onClick={() => onEngineChange(engine === "all" ? "current" : "all")}
      >
        All engines
      </button>
    ) : null;

  if (result === null) {
    return (
      <>
        {chips}
        {engineToggle}
        <p className={`kicker ${s.loading}`}>Loading the board</p>
      </>
    );
  }

  if (result.kind === "error") {
    return (
      <>
        {chips}
        {engineToggle}
        <StatusNote
          className={s.error}
          title="Board unavailable"
          data-testid="board-error"
          role="alert"
        >
          <span>{ERROR_COPY[result.reason]} The board could not be loaded.</span>
          <button
            ref={target}
            type="button"
            className="btn"
            onClick={() => {
              focusAttempt.current = attempt + 1;
              setAttempt(attempt + 1);
            }}
          >
            Try again
          </button>
        </StatusNote>
      </>
    );
  }

  if (result.entries.length === 0 && coach !== "all") {
    return (
      <>
        {chips}
        {engineToggle}
        <p ref={target} className={s.filterEmpty} data-testid="coach-filter-empty" tabIndex={-1}>
          {FILTER_EMPTY[coach]}
        </p>
      </>
    );
  }

  if (result.entries.length === 0 && older) {
    return (
      <>
        {engineToggle}
        <StatusNote className={s.empty} title={NO_ENGINE_RUNS} data-testid="board-empty-engine">
          <span>Runs from older engines are on the All engines board.</span>
          <span className={s.emptyActions}>
            <button
              ref={target}
              type="button"
              className="btn btn--primary"
              onClick={() => {
                focusAttempt.current = attempt;
                onEngineChange("all");
              }}
            >
              Show all engines
            </button>
            <Link href="/" className="btn">
              Play a run
            </Link>
          </span>
        </StatusNote>
      </>
    );
  }

  if (result.entries.length === 0) {
    return (
      <>
        {engineToggle}
        <StatusNote className={s.empty} title="No entries yet." data-testid="board-empty">
          <span>Finish a run and submit it to claim the top spot.</span>
          <Link
            ref={target}
            href={view.scope === "daily" ? "/daily" : "/"}
            className="btn btn--primary"
          >
            {view.scope === "daily" ? "Play the daily" : "Play a run"}
          </Link>
        </StatusNote>
      </>
    );
  }

  return (
    <>
      {chips}
      {engineToggle}
      <ol
        ref={target}
        className={s.list}
        data-testid="board"
        aria-label="Leaderboard"
        tabIndex={-1}
      >
        {result.entries.map((e) => (
          <li
            key={e.token}
            className={s.row}
            data-testid="board-row"
            data-top={e.rank <= 3 || undefined}
            data-me={e.nickname === me || undefined}
          >
            <Link href={`/r/${e.token}`} className={s.link}>
              <span className={s.rank}>{e.rank}</span>
              <span className={s.main}>
                <span className={s.nick}>
                  {e.nickname}
                  {e.nickname === me ? (
                    <>
                      <span className="visually-hidden">, you</span>
                      <span className={s.you} data-testid="own-row-chip" aria-hidden="true">
                        You
                      </span>
                    </>
                  ) : null}
                  {e.coached ? (
                    <span className={s.coached} data-testid="coached-chip">
                      Coached
                    </span>
                  ) : null}
                  {engineRowLabel(e.engineVersion) !== null ? (
                    <span className={s.engineLabel} data-testid="engine-row-label">
                      {engineRowLabel(e.engineVersion)}
                    </span>
                  ) : null}
                </span>
                <span className={s.meta}>
                  {view.scope === "daily" && e.formation !== null
                    ? e.formation
                    : variantLabel(e.variant)}
                </span>
                <span className={s.squad}>
                  {e.squadSpeciesIds ? (
                    e.squadSpeciesIds.map((id) => (
                      <PlayerImage
                        key={id}
                        dexId={id}
                        size={24}
                        alt={slimSpeciesById(id)?.name ?? `#${id}`}
                      />
                    ))
                  ) : (
                    <span className={s.meta}>Squad preview unavailable.</span>
                  )}
                </span>
              </span>
              <span className={s.recordCol}>
                <span className={s.label}>W-D-L</span>
                <span className={s.record}>
                  <Figure value={record(e.wins, e.draws, e.losses)} />
                </span>
              </span>
              <span className={s.scoreCol}>
                <span className={s.label}>Team Score</span>
                <span className={s.score}>
                  <Figure value={e.teamScore} />
                </span>
              </span>
            </Link>
            {challengeHref(e.token) !== null || squadFromToken(e.token) !== null ? (
              <div className={s.rowActions}>
                {challengeHref(e.token) !== null ? (
                  <Link
                    className={`btn btn--ghost ${s.challenge}`}
                    href={challengeHref(e.token)!}
                    aria-label={`Challenge this Seed: ${e.nickname}, ${record(e.wins, e.draws, e.losses)}`}
                  >
                    Challenge this Seed
                  </Link>
                ) : null}
                {squadFromToken(e.token) !== null ? (
                  <Link
                    className={`btn btn--ghost ${s.challenge}`}
                    href={exhibitionHref({ away: e.token, name: e.nickname })}
                    aria-label={`Exhibition vs this squad: ${e.nickname}, ${record(e.wins, e.draws, e.losses)}`}
                  >
                    Exhibition vs this squad
                  </Link>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}
