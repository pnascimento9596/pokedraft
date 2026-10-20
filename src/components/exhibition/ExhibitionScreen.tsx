"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useSyncExternalStore } from "react";
import { ModuleCard, StatusNote } from "@/components/ui/primitives";
import {
  awayName,
  challengers,
  exhibitionHref,
  parseExhibitionQuery,
  sameSquad,
  squadFromToken,
  type Challenger,
  type ExhibitionQuery,
} from "@/ui/exhibition-route";
import { record } from "@/ui/labels";
import { HISTORY_KEY, loadHistory } from "@/ui/runs";
import { readJson } from "@/ui/storage";
import { ExhibitionMatch } from "./ExhibitionMatch";
import s from "./ExhibitionScreen.module.css";

const BUILDER_SAVE_KEY = "pokedraft.builder";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Both reads are raw strings, so the snapshot only changes when the stored values do.
function storedSnapshot(): string {
  return JSON.stringify([read(HISTORY_KEY), read(BUILDER_SAVE_KEY)]);
}

// History and the Builder save live in this browser, so they are read after mount. Reading them
// never writes: the lifetime backfill belongs to the history page, not to an exhibition.
function useStoredSquads(): readonly Challenger[] | null {
  const stored = useSyncExternalStore(subscribe, storedSnapshot, () => null);
  return useMemo(() => {
    if (stored === null) return null;
    const builder = readJson<unknown>(BUILDER_SAVE_KEY, null);
    return challengers(loadHistory(), builder);
  }, [stored]);
}

function challengerLabel(challenger: Challenger): string {
  if (challenger.kind === "builder") return "Builder lineup";
  const { run } = challenger;
  const date = new Date(run.at);
  const when = Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${when}, ${run.formation}, ${record(run.wins, run.draws, run.losses)}`;
}

function NoSquad() {
  return (
    <StatusNote
      className={s.note}
      title="No squad to play with yet."
      data-testid="exhibition-empty"
    >
      <span>Play a cup or save a full squad in the Builder, then come back for an exhibition.</span>
      <span className={s.links}>
        <Link href="/" className="btn btn--primary">
          Play a cup
        </Link>
        <Link href="/" className="btn">
          Open the Builder
        </Link>
      </span>
    </StatusNote>
  );
}

export function ExhibitionScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pickerId = useId();
  const stored = useStoredSquads();
  const query = parseExhibitionQuery(new URLSearchParams(params.toString()));
  const away = useMemo(
    () => (query.away === null ? null : squadFromToken(query.away)),
    [query.away],
  );
  const options = stored ?? [];
  const homeToken = query.home ?? options[0]?.token ?? null;
  const home = useMemo(() => (homeToken === null ? null : squadFromToken(homeToken)), [homeToken]);
  const name = awayName(query.name);

  if (stored === null) {
    return <p className="kicker">Loading the exhibition</p>;
  }

  const go = (next: Partial<ExhibitionQuery>) => {
    router.replace(exhibitionHref({ ...query, ...next, away: query.away! }), { scroll: false });
  };

  if (query.away === null || away === null) {
    return (
      <StatusNote className={s.note} title="Squad not found." data-testid="exhibition-broken">
        <span>This exhibition link has no squad to play against.</span>
        <Link href="/history" className="btn">
          Open your history
        </Link>
      </StatusNote>
    );
  }

  const linked = query.home !== null && !options.some((option) => option.token === query.home);

  return (
    <ModuleCard
      className={s.screen}
      eyebrow="Exhibition"
      title={`Your squad vs ${query.name === null ? "their squad" : name}`}
      description="Choose your squad, then play one match or two legs."
    >
      <div className={s.body}>
        {options.length > 0 || linked ? (
          <div className={s.picker}>
            <label htmlFor={pickerId}>Your squad</label>
            <select
              id={pickerId}
              className={s.select}
              value={homeToken ?? ""}
              onChange={(event) => go({ home: event.target.value })}
            >
              {linked ? <option value={query.home!}>Squad from the link</option> : null}
              {options.map((option) => (
                <option key={option.token} value={option.token}>
                  {challengerLabel(option)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {homeToken === null ? (
          <NoSquad />
        ) : home === null ? (
          <StatusNote className={s.note} title="Squad not found." data-testid="exhibition-broken">
            Your squad in this link could not be read. Choose another squad.
          </StatusNote>
        ) : (
          <ExhibitionMatch
            home={home.lineup}
            away={away.lineup}
            seed={away.seed}
            rematch={query.rematch}
            legs={query.legs}
            awayName={name}
            mirror={sameSquad(home.lineup, away.lineup)}
            onLegs={(legs) => go({ legs })}
            onRematch={() => go({ rematch: query.rematch + 1 })}
          />
        )}
      </div>
    </ModuleCard>
  );
}
