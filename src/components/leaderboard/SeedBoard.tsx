"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BoardMode } from "@/leaderboard/contract";
import { ModuleCard, StatusNote, Table } from "@/components/ui/primitives";
import { readAnyToken } from "@/ui/read-token";
import { record } from "@/ui/labels";
import { fetchSeedBoard, type BoardResult } from "./client";
import { engineRowLabel } from "./format";
import s from "./SeedBoard.module.css";

// Builder friendlies are unranked, so they have no seed board.
function seedBoardOf(token: string): { readonly mode: BoardMode; readonly seed: string } | null {
  const run = readAnyToken(token);
  if (run === null || run.settings.mode === "builder") return null;
  return { mode: run.settings.mode, seed: run.seed };
}

/**
 * Every submitted run on this run's seed. It is fetched after mount, so the shared page's server
 * render stays free of database reads.
 */
export function SeedBoard({ token }: { readonly token: string }) {
  const target = seedBoardOf(token);
  const mode = target?.mode;
  const seed = target?.seed;
  const [loaded, setLoaded] = useState<{
    readonly key: string;
    readonly result: BoardResult;
  } | null>(null);
  const key = `${mode}|${seed}`;

  useEffect(() => {
    if (mode === undefined || seed === undefined) return;
    const ctrl = new AbortController();
    fetchSeedBoard(mode, seed, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) setLoaded({ key: `${mode}|${seed}`, result });
    });
    return () => ctrl.abort();
  }, [mode, seed]);

  const result = loaded?.key === key ? loaded.result : null;
  if (target === null || result === null) return null;
  if (result.kind === "ok" && result.entries.length === 0) return null;

  return (
    <ModuleCard
      className={s.card}
      eyebrow="Leaderboard"
      title="Friends on this seed"
      description="Every submitted run on this seed, ranked like the board."
      data-testid="seed-board"
    >
      {result.kind === "error" ? (
        <StatusNote title="Board unavailable" data-testid="seed-board-error">
          The runs on this seed could not be loaded.
        </StatusNote>
      ) : (
        <div className={s.wrap}>
          <Table className={s.table} aria-label="Friends on this seed">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col" className={s.player}>
                  Player
                </th>
                <th scope="col">Formation</th>
                <th scope="col">W-D-L</th>
                <th scope="col" className={s.wraps}>
                  Team Score
                </th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((e) => {
                const mine = e.token === token;
                const engine = engineRowLabel(e.engineVersion);
                return (
                  <tr key={e.token} data-mine={mine || undefined}>
                    <td>{e.rank}</td>
                    <th scope="row" className={s.player}>
                      {mine ? e.nickname : <Link href={`/r/${e.token}`}>{e.nickname}</Link>}
                      {mine || engine !== null ? (
                        <span className={s.tags}>
                          {mine ? <span className={s.tag}>This run</span> : null}
                          {engine !== null ? <span className={s.tag}>{engine}</span> : null}
                        </span>
                      ) : null}
                    </th>
                    <td>{e.formation ?? "Unknown"}</td>
                    <td>{record(e.wins, e.draws, e.losses)}</td>
                    <td>{e.teamScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </ModuleCard>
  );
}
