"use client";

import { useEffect, useId, useRef, useState } from "react";
import { pokedexById } from "@/data/pokedex";
import {
  FORMATIONS,
  speciesById,
  type Lineup,
  type SlotRef,
  type Species,
  type SpeciesId,
} from "@/engine";
import { SCOUTING_BY_ID } from "@/scouting/scouting-data";
import { MOVE_TRAITS } from "@/scouting/move-traits";
import { ATTRS, ROLES, type Attr, type Role } from "@/scouting/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeChip } from "@/components/TypeChip";
import { getAbilityMeta } from "@/components/results/abilityEffects";
import { typeFrame } from "@/design/stadium";
import { REGION_LABEL, SUITABILITY_LABEL, tagLabel } from "@/ui/labels";
import { ALL_REFS, slotLabel, valueAt } from "@/ui/lineup";
import { ratingFor } from "@/ui/rating";
import { ratePartialLineup } from "@/ui/partial-rating";
import { getSlotSuitability } from "@/ui/suitability";
import s from "./ScoutingDossier.module.css";

const HEXAGON = [
  [0, -1],
  [Math.sqrt(3) / 2, -0.5],
  [Math.sqrt(3) / 2, 0.5],
  [0, 1],
  [-Math.sqrt(3) / 2, 0.5],
  [-Math.sqrt(3) / 2, -0.5],
] as const;

type RadarAxes = readonly { readonly attr: Attr; readonly x: number; readonly y: number }[];

const radarAxes = (attrs: readonly Attr[]): RadarAxes =>
  attrs.map((attr, i) => ({ attr, x: HEXAGON[i]![0], y: HEXAGON[i]![1] }));

const OUTFIELD_AXES = radarAxes(["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"]);
const GK_AXES = radarAxes(["DIV", "REF", "HAN", "GKP", "KIC", "AER"]);

// Each offer in Compare gets its own dash pattern as well as a colour, so the polygons stay
// apart without colour vision. Past six they could not be told apart, so Compare stops there.
const OFFER_LINES = [
  { dash: "none", name: "solid" },
  { dash: "8 5", name: "dashed" },
  { dash: "2 4", name: "dotted" },
  { dash: "10 4 2 4", name: "dash and dot" },
  { dash: "14 6", name: "long dashed" },
  { dash: "4 2", name: "short dashed" },
] as const;

// The dossier's own history entry while it sits over the Picker, so Back closes only the dossier.
const DOSSIER_ENTRY = "pokedraftDossier";

function onDossierEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && DOSSIER_ENTRY in state;
}

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
  slotContext,
  lineup,
  offers,
  historyEntry = false,
  onClose,
}: {
  readonly speciesId: SpeciesId;
  readonly compareTo?: Species;
  readonly showRatings: boolean;
  readonly slotContext?: {
    readonly slot: SlotRef;
    readonly lineup: Lineup;
    readonly candidateLineup: Lineup;
  };
  /** The squad the player is in, so a drafted keeper gets the goalkeeper radar. */
  readonly lineup?: Lineup;
  /** The round's offers, to step through with Prev and Next and to compare. */
  readonly offers?: {
    readonly ids: readonly SpeciesId[];
    readonly onShow: (id: SpeciesId) => void;
  };
  /** Push a history entry, so Back closes the dossier before the sheet under it. */
  readonly historyEntry?: boolean;
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
  const target =
    slotContext?.slot.kind === "starter"
      ? FORMATIONS[slotContext.lineup.formation].slots[slotContext.slot.index]
      : null;
  const candidateRating = slotContext
    ? ratingFor(sp, target?.role ?? null, target?.label ?? "Bench")
    : null;
  const incumbentRating =
    slotContext && incumbent
      ? ratingFor(incumbent, target?.role ?? null, target?.label ?? "Bench")
      : null;
  const beforeChemistry = slotContext ? ratePartialLineup(slotContext.lineup).synergy : null;
  const afterChemistry = slotContext
    ? ratePartialLineup(slotContext.candidateLineup).synergy
    : null;
  const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);
  const [comparing, setComparing] = useState(false);

  const squad = lineup ?? slotContext?.lineup;
  const placed = squad ? ALL_REFS.find((ref) => valueAt(squad, ref) === speciesId) : undefined;
  const placedRole =
    squad && placed?.kind === "starter"
      ? FORMATIONS[squad.formation].slots[placed.index].role
      : null;
  const contextRole = target?.role ?? placedRole ?? sp.bestRoles[0];
  const axes = contextRole === "GK" ? GK_AXES : OUTFIELD_AXES;

  const offerIds = offers !== undefined && offers.ids.length > 1 ? offers.ids : null;
  const offerIndex = offerIds?.indexOf(speciesId) ?? -1;
  const step = (by: number) => {
    if (offers === undefined || offerIds === null || offerIndex === -1) return;
    offers.onShow(offerIds[(offerIndex + by + offerIds.length) % offerIds.length]!);
  };
  const canCompare =
    showRatings && offerIds !== null && offerIndex !== -1 && offerIds.length <= OFFER_LINES.length;
  const compared = canCompare && comparing ? offerIds.map(speciesById) : null;

  const adjusted = scout
    ? ATTRS.filter((attr) => (scout.adjustments[attr] ?? 0) !== 0).map(
        (attr) => `${attr} ${scout.baseline[attr]}, review ${signed(scout.adjustments[attr]!)}`,
      )
    : [];

  useEffect(() => {
    if (!historyEntry) return;
    if (!onDossierEntry()) {
      window.history.pushState({ ...window.history.state, [DOSSIER_ENTRY]: true }, "");
    }
    const onPop = () => {
      if (!onDossierEntry()) ref.current?.close();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [historyEntry]);

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
    axes
      .map(
        ({ x, y }, i) =>
          `${(140 + x * values[i]!).toFixed(2)},${(140 + y * values[i]!).toFixed(2)}`,
      )
      .join(" ");
  const axisText = (player: Species) =>
    axes.map(({ attr }) => `${attr} ${player.attrs[attr]}`).join(", ");

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      data-testid="scouting-dossier"
      onClose={(e) => {
        e.stopPropagation();
        // Ignore cleanup and queued close events from StrictMode's previous mount.
        if (!active.current || e.currentTarget.open) return;
        if (historyEntry && onDossierEntry()) window.history.back();
        onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
        if (offerIndex !== -1 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          e.preventDefault();
          step(e.key === "ArrowLeft" ? -1 : 1);
        }
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
              <PlayerImage dexId={sp.id} size={56} alt="" />
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

        {offerIds !== null && offerIndex !== -1 ? (
          <div className={s.offerNav} role="group" aria-label="Round offers">
            <button
              type="button"
              className="btn btn--sm"
              aria-label="Previous offer"
              onClick={() => step(-1)}
            >
              Prev
            </button>
            <span
              className={`num ${s.offerCount}`}
              data-testid="dossier-offer-count"
              aria-hidden="true"
            >
              {offerIndex + 1} of {offerIds.length}
            </span>
            <span className="visually-hidden" aria-live="polite">
              {`${sp.name}, offer ${offerIndex + 1} of ${offerIds.length}`}
            </span>
            <button
              type="button"
              className="btn btn--sm"
              aria-label="Next offer"
              onClick={() => step(1)}
            >
              Next
            </button>
            {canCompare ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label="Compare offers"
                aria-pressed={comparing}
                onClick={() => setComparing((on) => !on)}
              >
                Compare
              </button>
            ) : null}
          </div>
        ) : null}

        {slotContext ? (
          <p className={s.comparison} data-testid="dossier-slot">
            <strong>In slot: {slotLabel(slotContext.lineup, slotContext.slot)}.</strong>{" "}
            {target ? `${ROLE_NAME[target.role]}, ` : ""}
            {
              SUITABILITY_LABEL[
                getSlotSuitability(sp, slotContext.lineup.formation, slotContext.slot)
              ]
            }{" "}
            fit.
          </p>
        ) : null}

        {incumbent ? (
          <p className={s.comparison} role="note" aria-label="Incumbent comparison">
            Compared with <strong>{incumbent.name}</strong> in this slot.{" "}
            {showRatings
              ? "Deltas are candidate minus incumbent."
              : "Numeric comparisons are hidden."}
          </p>
        ) : null}

        {showRatings && candidateRating && incumbentRating ? (
          <section className={s.section} aria-label="Slot comparison">
            <p className={s.comparison} aria-label="Slot role rating comparison">
              {target?.role ?? `Best role (${candidateRating.role} vs ${incumbentRating.role})`}{" "}
              ROLE RATING {candidateRating.score} vs {incumbentRating.score} (
              {signed(candidateRating.score - incumbentRating.score)})
            </p>
            <p className={s.comparison} aria-label="Chemistry comparison">
              {beforeChemistry !== null && afterChemistry !== null
                ? `Chemistry ${(afterChemistry * 100).toFixed(1)}% vs ${(beforeChemistry * 100).toFixed(1)}% (${signed(Number(((afterChemistry - beforeChemistry) * 100).toFixed(1)))} percentage points).`
                : "Chemistry unavailable until a starter link is filled."}
            </p>
            <p className={s.roleSub}>
              Candidate minus incumbent. Chemistry uses the actual placement or swap and currently
              filled starter links.
            </p>
          </section>
        ) : null}

        <section className={s.section} aria-label="Role fit mini pitch">
          <h3 className={s.sectionTitle}>Role Fit on the Pitch</h3>
          <div className={s.miniPitch}>
            {([["W", "ST"], ["WM", "AM"], ["WB", "CM", "DM"], ["FB", "CB"], ["GK"]] as const).map(
              (roles, index) => (
                <div className={s.miniLine} key={index}>
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={s.miniRole}
                      data-tier={
                        bestSet.has(role) ? "best" : worstSet.has(role) ? "worst" : "neutral"
                      }
                    >
                      <strong>{role}</strong>{" "}
                      {showRatings ? (
                        <span className="num">{Math.round(sp.quality[role] * 100)}</span>
                      ) : (
                        SUITABILITY_LABEL[
                          bestSet.has(role) ? "recommended" : worstSet.has(role) ? "bad" : "ok"
                        ]
                      )}
                    </span>
                  ))}
                </div>
              ),
            )}
          </div>
          <p className={s.roleSub}>
            Attacking roles at the top, goalkeeper at the bottom.{" "}
            {showRatings
              ? "Numbers are role ratings."
              : "Best, OK and Poor are qualitative role fits."}
          </p>
        </section>

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
                {compared
                  ? `${compared.map((offer) => `${offer.name}: ${axisText(offer)}.`).join(" ")} Scale 0 to 99.`
                  : `${sp.name}: ${axisText(sp)}. Scale 0 to 99.${incumbent ? ` ${incumbent.name}: ${axisText(incumbent)}. Dashed outline.` : ""}`}
              </desc>
              <g aria-hidden="true">
                {[33, 66, 99].map((radius) => (
                  <polygon
                    key={radius}
                    className={s.radarGrid}
                    points={radarPoints(axes.map(() => radius))}
                  />
                ))}
                {axes.map(({ attr, x, y }) => (
                  <line
                    key={attr}
                    className={s.radarGrid}
                    x1={140}
                    y1={140}
                    x2={140 + x * 99}
                    y2={140 + y * 99}
                  />
                ))}
                {compared ? (
                  compared.map((offer, i) => (
                    <polygon
                      key={offer.id}
                      className={s.radarOffer}
                      data-player="offer"
                      data-name={offer.name}
                      data-index={i}
                      data-current={offer.id === speciesId || undefined}
                      strokeDasharray={OFFER_LINES[i]!.dash}
                      points={radarPoints(axes.map(({ attr }) => offer.attrs[attr]))}
                    />
                  ))
                ) : (
                  <>
                    <polygon
                      className={s.radarCandidate}
                      data-player="candidate"
                      points={radarPoints(axes.map(({ attr }) => sp.attrs[attr]))}
                    />
                    {incumbent ? (
                      <polygon
                        className={s.radarIncumbent}
                        data-player="incumbent"
                        points={radarPoints(axes.map(({ attr }) => incumbent.attrs[attr]))}
                      />
                    ) : null}
                  </>
                )}
                {axes.map(({ attr, x, y }) => (
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
            {compared ? (
              <div className={s.radarLegend} data-testid="dossier-compare-legend">
                {compared.map((offer, i) => (
                  <span key={offer.id} className={s.offerLegend} data-index={i}>
                    <svg width="24" height="8" aria-hidden="true">
                      <line x1="0" y1="4" x2="24" y2="4" strokeDasharray={OFFER_LINES[i]!.dash} />
                    </svg>
                    {offer.name} ({OFFER_LINES[i]!.name})
                  </span>
                ))}
              </div>
            ) : (
              <div className={s.radarLegend}>
                <span className={s.candidateLegend}>{sp.name} (solid)</span>
                {incumbent ? (
                  <span className={s.incumbentLegend}>{incumbent.name} (dashed)</span>
                ) : null}
                <span>Actual attributes, 0 to 99 scale</span>
              </div>
            )}
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
                      <span>
                        {tier === "best" ? (
                          <>
                            <span aria-hidden="true">★</span> {SUITABILITY_LABEL.recommended}
                          </>
                        ) : (
                          SUITABILITY_LABEL[tier === "worst" ? "bad" : "ok"]
                        )}
                      </span>
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
            {showRatings ? (
              <>
                <p className={s.review} role="note" aria-label="Review changes">
                  {adjusted.length === 0
                    ? "The review kept every attribute at its baseline."
                    : adjusted.join("; ")}
                </p>
                {adjusted.length > 0 ? (
                  <p className={s.roleSub}>
                    The first number is the computed baseline, then the scout review&apos;s change.
                  </p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
