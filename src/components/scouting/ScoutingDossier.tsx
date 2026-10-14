"use client";

import { useEffect, useId } from "react";
import { pokedexById } from "@/data/pokedex";
import { speciesById, type SpeciesId } from "@/engine";
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
  showRatings,
  onClose,
}: {
  readonly speciesId: SpeciesId;
  readonly showRatings: boolean;
  readonly onClose: () => void;
}) {
  const titleId = useId();
  const sp = speciesById(speciesId);
  const dex = pokedexById(speciesId);
  const scout = SCOUTING_BY_ID.get(speciesId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const bestSet = new Set<Role>(sp.bestRoles);
  const worstSet = new Set<Role>(scout?.worstRoles ?? []);

  return (
    <div
      className={s.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="scouting-dossier"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            type="button"
            className="btn btn--sm"
            data-testid="close-dossier"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <section className={s.section} aria-label="Role suitability">
          <h3 className={s.sectionTitle}>Position Suitability & Role Fit</h3>
          <div className={s.roleGrid}>
            {ROLES.map((role) => {
              const tier = bestSet.has(role) ? "best" : worstSet.has(role) ? "worst" : "neutral";
              const quality = Math.round(sp.quality[role] * 100);
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
    </div>
  );
}
