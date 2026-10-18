"use client";

import { useEffect, useState } from "react";
import type { Moveset } from "@/data/movesets";

export type MovesOf = (id: number) => Moveset | null;

const NO_MOVES: MovesOf = () => null;

/**
 * The canon movesets, loaded only when a match mounts. Null until the chunk settles. A failed load
 * resolves to generic callouts so the match can still kick off.
 */
export function useMovesets(): MovesOf | null {
  const [movesOf, setMovesOf] = useState<MovesOf | null>(null);
  useEffect(() => {
    let live = true;
    import("@/data/movesets").then(
      (m) => {
        if (!live) return;
        setMovesOf(() => (id: number) => {
          try {
            return m.movesetFor(id);
          } catch {
            return null;
          }
        });
      },
      () => {
        if (live) setMovesOf(() => NO_MOVES);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return movesOf;
}
