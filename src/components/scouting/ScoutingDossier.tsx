"use client";

import { useEffect, useId, useRef } from "react";
import { pokedexById } from "@/data/pokedex";
import { speciesById, type Species, type SpeciesId } from "@/engine";
import { SCOUTING } from "@/scouting/scouting-data";
import { MOVE_TRAITS } from "@/scouting/move-traits";
import { ATTRS, ROLES, type Attr, type Role } from "@/scouting/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { getAbilityMeta } from "@/components/results/abilityEffects";
import { typeFrame } from "@/design/stadium";
import { REGION_LABEL, tagLabel } from "@/ui/labels";
import s from "./ScoutingDossier.module.css";

const SCOUTING_BY_ID = new Map(SCOUTING.map((entry) => [entry.id, entry]));

const RADAR_AXES = [
  { attr: "PAC", x: 0, y: -1 },
  { attr: "SHO", x: Math.sqrt(3) / 2, y: -0.5 },
  { attr: "PAS", x: Math.sqrt(3) / 2, y: 0.5 },
  { attr: "DRI", x: 0, y: 1 },
  { attr: "DEF", x: -Math.sqrt(3) / 2, y: 0.5 },
  { attr: "PHY", x: -Math.sqrt(3) / 2, y: -0.5 },
] as const satisfies readonly { attr: Attr; x: number; y: number }[];

const ROLE_NAME: Readonly<Record<Role, string>> = {
  GK: "Goalkeeper",
  CB: "Centre-Back",
  FB: "Full-Back",
  WB: "Wing-Back",
  DM: "Def. Mid",
  CM: "Central Mid",
  AM: "Attacking Mid",
  WM: "Wide Mid",
  W: "Winger",
  ST: "Striker",
};

const ATTR_LABEL: Readonly<Record<Attr, string>> = {
  PAC: "Pace",
  ACC: "Accel",
  SHO: "Shooting",
  PAS: "Passing",
  VIS: "Vision",
  DRI: "Dribbling",
  TEC: "Technique",
  DEF: "Defense",
  TAK: "Tackling",
  AER: "Aerial",
  PHY: "Physical",
  STA: "Stamina",
  DIV: "GK Diving",
  HAN: "GK Handling",
  REF: "GK Reflexes",
  GKP: "GK Position",
  KIC: "GK Kicking",
};

function formatMoveName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ScoutingDossier({
  speciesId,
  compareTo,
  showRatings,
  onClose,
}: {
  readonly speciesId: SpeciesId;
  readonly compareTo?: Species;
  readonly showRatings: boolean;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = useRef(false);
  const titleId = useId();
  const radarId = useId();
  const sp = speciesById(speciesId);
  const incumbent = compareTo?.id !== speciesId ? compareTo : undefined;
  const dex = pokedexById(speciesId);
  const scout = SCOUTING_BY_ID.get(speciesId);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement;
    active.current = true;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      active.current = false;
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const bestSet = new Set<Role>(sp.bestRoles);
  const worstSet = new Set<Role>(scout?.worstRoles ?? []);
  // One SVG unit per attribute point, with 99 as the outer ring.
  const radarPoints = (values: readonly number[]) =>
    RADAR_AXES.map(
      ({ x, y }, i) => `${(140 + x * values[i]!).toFixed(2)},${(140 + y * values[i]!).toFixed(2)}`,
    ).join(" ");

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      data-testid="scouting-dossier"
      onClose={(e) => {
        e.stopPropagation();
        // Ignore cleanup and queued close events from StrictMode's previous mount.
        if (active.current && !e.currentTarget.open) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={s.modal} style={typeFrame(sp.types[0])}>
        <header className={s.header}>
          <div className={s.identity}>
            <div className={s.artWrap}>
              <PlayerImage dexId={sp.id} size={56} alt={sp.name} />
            </div>
            <div className={s.titleGroup}>
              <div className={s.nameRow}>
                <h2 id={titleId} className={s.name}>
                  {sp.name}
                </h2>
                <span className={`num ${s.dex}`}>#{String(sp.id).padStart(3, "0")}</span>
                {sp.special ? <span className={s.specialBadge}>Special</span> : null}
              </div>
              <div className={s.subMeta}>
                {dex ? <span>{dex.genus}</span> : null}
                <span>· {REGION_LABEL[sp.region]}</span>
                {dex ? (
                  <span>
                    · {(dex.heightDm / 10).toFixed(1)} m · {(dex.weightHg / 10).toFixed(1)} kg
                  </span>
                ) : null}
              </div>
              <div className={s.tagsRow}>
                {sp.types.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--sm"
            data-testid="close-dossier"
            onClick={() => ref.current?.close()}
          >
            Close
          </button>
        </header>

        {incumbent ? (
          <p className={s.comparison} role="note" aria-label="Incumbent comparison">
            Compared with <strong>{incumbent.name}</strong> in this slot.{" "}
            {showRatings
              ? "Deltas are candidate minus incumbent."
              : "Numeric comparisons are hidden."}
          </p>
        ) : null}

        {showRatings ? (
          <section className={s.section} aria-label="Attribute radar">
            <h3 className={s.sectionTitle}>Attribute Profile</h3>
            <svg
              className={s.radar}
              viewBox="0 0 280 280"
              role="img"
              aria-labelledby={`${radarId}-title`}
              aria-describedby={`${radarId}-desc`}
            >
              <title id={`${radarId}-title`}>{sp.name} attribute radar</title>
              <desc id={`${radarId}-desc`}>
                {`${sp.name}: ${RADAR_AXES.map(({ attr }) => `${attr} ${sp.attrs[attr]}`).join(", ")}. Scale 0 to 99.`}
                {incumbent
                  ? ` ${incumbent.name}: ${RADAR_AXES.map(({ attr }) => `${attr} ${incumbent.attrs[attr]}`).join(", ")}. Dashed outline.`
                  : ""}
              </desc>
              <g aria-hidden="true">
                {[33, 66, 99].map((radius) => (
                  <polygon
                    key={radius}
                    className={s.radarGrid}
                    points={radarPoints(RADAR_AXES.map(() => radius))}
                  />
                ))}
                {RADAR_AXES.map(({ attr, x, y }) => (
                  <line
                    key={attr}
                    className={s.radarGrid}
                    x1={140}
                    y1={140}
                    x2={140 + x * 99}
                    y2={140 + y * 99}
                  />
                ))}
                <polygon
                  className={s.radarCandidate}
                  data-player="candidate"
                  points={radarPoints(RADAR_AXES.map(({ attr }) => sp.attrs[attr]))}
                />
                {incumbent ? (
                  <polygon
                    className={s.radarIncumbent}
                    data-player="incumbent"
                    points={radarPoints(RADAR_AXES.map(({ attr }) => incumbent.attrs[attr]))}
                  />
                ) : null}
                {RADAR_AXES.map(({ attr, x, y }) => (
                  <text
                    key={attr}
                    className={s.radarLabel}
                    x={140 + x * 121}
                    y={140 + y * 121}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {attr}
                  </text>
                ))}
              </g>
            </svg>
            <div className={s.radarLegend}>
              <span className={s.candidateLegend}>{sp.name} (solid)</span>
              {incumbent ? (
                <span className={s.incumbentLegend}>{incumbent.name} (dashed)</span>
              ) : null}
              <span>Actual attributes, 0 to 99 scale</span>
            </div>
          </section>
        ) : null}

        <section className={s.section} aria-label="Role suitability">
          <h3 className={s.sectionTitle}>Position Suitability & Role Fit</h3>
          <div className={s.roleGrid}>
            {ROLES.map((role) => {
              const tier = bestSet.has(role) ? "best" : worstSet.has(role) ? "worst" : "neutral";
              const quality = Math.round(sp.quality[role] * 100);
              const delta = incumbent ? quality - Math.round(incumbent.quality[role] * 100) : null;
              return (
                <div key={role} className={s.roleCell} data-tier={tier}>
                  <div className={s.roleTop}>
                    <span>{role}</span>
                    {showRatings ? (
                      <span className="num">{quality}</span>
                    ) : (
                      <span>{tier === "best" ? "★ Best" : tier === "worst" ? "Poor" : "OK"}</span>
                    )}
                  </div>
                  <span className={s.roleSub}>
                    {ROLE_NAME[role]}
                    {showRatings ? ` · Fit ${sp.fits[role]}` : ""}
                  </span>
                  {showRatings && delta !== null ? (
                    <span
                      className={s.delta}
                      role="note"
                      aria-label={`${role} rating difference versus ${incumbent!.name}`}
                      data-delta={Math.sign(delta)}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className={s.section} aria-label="Soccer attributes">
          <h3 className={s.sectionTitle}>17 Soccer Attributes</h3>
          {showRatings ? (
            <div className={s.attrGrid}>
              {ATTRS.map((attr) => {
                const val = sp.attrs[attr];
                const delta = incumbent ? val - incumbent.attrs[attr] : null;
                return (
                  <div key={attr} className={s.attrItem}>
                    <div className={s.attrHeader}>
                      <span className={s.attrCode} title={ATTR_LABEL[attr]}>
                        {attr} · {ATTR_LABEL[attr]}
                      </span>
                      <span className="num">{val}</span>
                    </div>
                    <div className={s.attrTrack} aria-hidden="true">
                      <div
                        className={s.attrFill}
                        data-high={val >= 80 || undefined}
                        data-low={val < 45 || undefined}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    {delta !== null ? (
                      <span
                        className={s.delta}
                        role="note"
                        aria-label={`${attr} difference versus ${incumbent!.name}`}
                        data-delta={Math.sign(delta)}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={s.rationale}>
              Numeric 1 to 99 attributes are hidden while blind challenge ratings are off.
            </p>
          )}
        </section>

        <section className={s.section} aria-label="Strengths and weaknesses">
          <h3 className={s.sectionTitle}>Scouting Tags</h3>
          <div className={s.tagsRow}>
            {sp.strengths.map((tag) => (
              <span key={`+${tag}`} className={s.tagGood}>
                + {tagLabel(tag)}
              </span>
            ))}
            {sp.weaknesses.map((tag) => (
              <span key={`-${tag}`} className={s.tagBad}>
                - {tagLabel(tag)}
              </span>
            ))}
          </div>
        </section>

        {dex ? (
          <section className={s.section} aria-label="Abilities and signature moves">
            <h3 className={s.sectionTitle}>Abilities & Signature Moves</h3>
            <div className={s.abilityList}>
              {dex.abilities.map((ab) => (
                <div key={ab.id} className={s.abilityCard}>
                  <span className={s.abilityName}>
                    {ab.name}
                    {ab.hidden ? " (Hidden)" : ""}:
                  </span>{" "}
                  <span>{getAbilityMeta(ab.id, ab.name, sp.types[0]).flavor}</span>
                </div>
              ))}
            </div>
            {dex.kickMoves.length > 0 ? (
              <div className={s.tagsRow}>
                {dex.kickMoves.map((move) => {
                  const trait = MOVE_TRAITS[move] ?? "kick";
                  const badge =
                    trait === "header" ? "Header" : trait === "reflex" ? "Reflex" : "Strike";
                  return (
                    <span key={move} className={s.movePill}>
                      {formatMoveName(move)} ({badge})
                    </span>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {scout ? (
          <section className={s.section} aria-label="Scouting report">
            <h3 className={s.sectionTitle}>Scout Report</h3>
            <p className={s.rationale}>{scout.rationale}</p>
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
