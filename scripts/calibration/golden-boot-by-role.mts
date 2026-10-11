// Golden Boot winners by slot role, per formation and bot. Read-only: nothing here changes or
// retunes the engine. Dispatch 7 carryover 4.
//   nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts [--mode cup8] [--runs 5000]
//   pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --render <json>
// The JSON holds counts only, in a fixed key order, so a rerun is byte-identical and its sha256 is
// the proof. Timing and machine facts go to stdout and never into the JSON.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { FORMATIONS } from "@/engine/formations";
import { createEngineRng } from "@/engine/rng";
import {
  DraftError,
  ENGINE_VERSION,
  FORMATION_IDS,
  GENS,
  SQUAD_SIZE,
  type CupResult,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type FormationId,
  type FullLineup,
  type PlayerLine,
  type Role,
  type Seed,
  type SlotRating,
} from "@/engine/types";
import { ROLES } from "@/scouting/types";
import { BOTS, type BotName } from "./bots";

const SCHEMA = "golden-boot-by-role/1";
const PREFIX = "gb7";
const FULL_RUNS = 5000;
const LIMIT_PERCENT = 10;
const MAX_STEPS = 200;
const BOT_ORDER: readonly BotName[] = ["good", "random"];
const CUP_MODES = ["cup8", "kanto151"] as const;
type CupMode = (typeof CUP_MODES)[number];

const BASE_SETTINGS = {
  cup8: { gens: GENS, style: "classic3", order: "squadFirst" },
  kanto151: { order: "squadFirst" },
} as const;

export type Bucket = Role | "bench" | "none";
export type RoleCounts = Record<Role, number>;

export interface Group {
  readonly name: string;
  readonly roles: readonly Role[];
}

// Every Role sits in exactly one group (the test pins that). Groups follow roleLine: back line,
// then the other midfield roles, then the two attacking roles.
export const GROUPS: readonly Group[] = [
  { name: "GK", roles: ["GK"] },
  { name: "CB", roles: ["CB"] },
  { name: "FB+WB", roles: ["FB", "WB"] },
  { name: "DM", roles: ["DM"] },
  { name: "CM+AM+WM", roles: ["CM", "AM", "WM"] },
  { name: "W", roles: ["W"] },
  { name: "ST", roles: ["ST"] },
];
const RULE_NAMES: readonly string[] = ["GK", "CB", "FB+WB", "DM"];
const RULE_GROUPS = GROUPS.filter((g) => RULE_NAMES.includes(g.name));
const REST_GROUPS = GROUPS.filter((g) => !RULE_NAMES.includes(g.name));
const COMBINED = "GK+CB+FB+WB+DM";
const COMBINED_ROLES = RULE_GROUPS.flatMap((g) => g.roles);

export interface Cell {
  runs: number;
  none: number;
  bench: number;
  tiedOnTop: number;
  roles: RoleCounts;
}

export interface Report {
  schema: typeof SCHEMA;
  engine: string;
  mode: CupMode;
  seedPattern: string;
  runsPerCell: number;
  settings: Record<string, unknown>;
  roles: readonly Role[];
  formations: Record<FormationId, { slots: RoleCounts; bots: Record<BotName, Cell> }>;
}

export interface Probe {
  readonly formation: FormationId;
  readonly bot: BotName;
  readonly group: string;
  readonly count: number;
  readonly runs: number;
}

export function winnerBucket(
  slots: readonly Pick<SlotRating, "species" | "role">[],
  boot: Pick<PlayerLine, "species"> | null,
): Bucket {
  if (boot === null) return "none";
  return slots.find((s) => s.species === boot.species)?.role ?? "bench";
}

// Strictly more than LIMIT_PERCENT of the runs, in integers so 500 of 5000 is not over.
export function exceedsLimit(count: number, runs: number): boolean {
  return count * 100 > runs * LIMIT_PERCENT;
}

export function groupCount(cell: Cell, roles: readonly Role[]): number {
  return roles.reduce((sum, role) => sum + cell.roles[role], 0);
}

export function probes(report: Report): Probe[] {
  return FORMATION_IDS.flatMap((formation) =>
    BOT_ORDER.flatMap((bot) => {
      const cell = report.formations[formation].bots[bot];
      const make = (group: string, roles: readonly Role[]): Probe => ({
        formation,
        bot,
        group,
        count: groupCount(cell, roles),
        runs: cell.runs,
      });
      return [...RULE_GROUPS.map((g) => make(g.name, g.roles)), make(COMBINED, COMBINED_ROLES)];
    }),
  );
}

function settingsFor(mode: CupMode, formation: FormationId): DraftSettings {
  return mode === "cup8"
    ? { mode, formation, ...BASE_SETTINGS.cup8 }
    : { mode, formation, ...BASE_SETTINGS.kanto151 };
}

function firstApplicable(state: DraftState, candidates: readonly DraftAction[]): DraftState {
  for (const action of candidates) {
    try {
      return applyAction(state, action);
    } catch (e) {
      if (action.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives")
        continue;
      throw e;
    }
  }
  throw new Error("every candidate action was refused");
}

export function playRun(mode: CupMode, formation: FormationId, bot: BotName, i: number) {
  const seed = `${PREFIX}-${formation}-${bot}-${i}` as Seed;
  const rng = createEngineRng(`play:${PREFIX}:${formation}:${bot}:${i}`);
  let state = createDraft(settingsFor(mode, formation), seed);
  for (let step = 0; state.phase.kind !== "complete"; step++) {
    if (step >= MAX_STEPS) throw new Error(`draft ${seed} did not finish`);
    state = firstApplicable(state, BOTS[bot].decide(state, rng));
  }
  const lineup = toFullLineup(state);
  return { seed, lineup, cup: runCup(lineup, seed, mode) };
}

// Fails loudly when the run is not what the tally assumes. Returns whether the Boot was decided by
// the tie-break (two or more players on the top goal count).
function checkRun(seed: Seed, formation: FormationId, lineup: FullLineup, cup: CupResult): boolean {
  const fail = (what: string): never => {
    throw new Error(`${seed}: ${what}`);
  };
  if (new Set([...lineup.starters, ...lineup.bench]).size !== SQUAD_SIZE)
    fail("a species appears twice in the squad");
  const slots = FORMATIONS[formation].slots;
  cup.rating.slots.forEach((s, i) => {
    if (s.species !== lineup.starters[i] || s.role !== slots[i]!.role)
      fail(`rating slot ${i} does not match the lineup and the formation`);
  });
  const top = Math.max(...cup.players.map((p) => p.goals));
  const boot = cup.awards.goldenBoot;
  if (boot === null) {
    if (top !== 0) fail(`goldenBoot is null but a player scored ${top}`);
    return false;
  }
  if (!cup.players.some((p) => p.species === boot.species && p.goals === top))
    fail(`goldenBoot ${boot.species} (${boot.goals} goals) is not a top scorer (${top} goals)`);
  return cup.players.filter((p) => p.goals === top).length > 1;
}

function zeroRoles(): RoleCounts {
  return Object.fromEntries(ROLES.map((r) => [r, 0])) as RoleCounts;
}

function slotCounts(formation: FormationId): RoleCounts {
  const counts = zeroRoles();
  for (const slot of FORMATIONS[formation].slots) counts[slot.role] += 1;
  return counts;
}

function playCell(mode: CupMode, formation: FormationId, bot: BotName, runs: number): Cell {
  const cell: Cell = { runs: 0, none: 0, bench: 0, tiedOnTop: 0, roles: zeroRoles() };
  for (let i = 1; i <= runs; i++) {
    const { seed, lineup, cup } = playRun(mode, formation, bot, i);
    const tied = checkRun(seed, formation, lineup, cup);
    const bucket = winnerBucket(cup.rating.slots, cup.awards.goldenBoot);
    cell.runs += 1;
    if (tied) cell.tiedOnTop += 1;
    if (bucket === "none") cell.none += 1;
    else if (bucket === "bench") cell.bench += 1;
    else cell.roles[bucket] += 1;
  }
  const total = cell.none + cell.bench + groupCount(cell, ROLES);
  if (total !== cell.runs) throw new Error(`${formation} ${bot}: buckets add to ${total}`);
  return cell;
}

function cellLine(index: number, formation: FormationId, bot: BotName, cell: Cell, secs: number) {
  const roles = ROLES.filter((r) => cell.roles[r] > 0).map((r) => `${r}=${cell.roles[r]}`);
  const rate = (cell.runs / secs).toFixed(1);
  return `[${index}/${FORMATION_IDS.length * BOT_ORDER.length}] ${formation} ${bot} ${cell.runs} runs in ${secs.toFixed(1)} s (${rate} runs/s) none=${cell.none} bench=${cell.bench} ${roles.join(" ")} tiedOnTop=${cell.tiedOnTop}`;
}

function simulate(mode: CupMode, runs: number): Report {
  const formations = {} as Report["formations"];
  let index = 0;
  for (const formation of FORMATION_IDS) {
    const bots = {} as Record<BotName, Cell>;
    for (const bot of BOT_ORDER) {
      const started = performance.now();
      bots[bot] = playCell(mode, formation, bot, runs);
      index += 1;
      console.log(cellLine(index, formation, bot, bots[bot], (performance.now() - started) / 1000));
    }
    formations[formation] = { slots: slotCounts(formation), bots };
  }
  return {
    schema: SCHEMA,
    engine: ENGINE_VERSION,
    mode,
    seedPattern: `${PREFIX}-<formation>-<bot>-<i>, i from 1`,
    runsPerCell: runs,
    settings: { mode, ...BASE_SETTINGS[mode] },
    roles: ROLES,
    formations,
  };
}

// Integer maths so the text never depends on float rounding. Rounds half up to a tenth of a point.
function percent(count: number, runs: number): string {
  const tenths = Math.floor((count * 2000 + runs) / (2 * runs));
  return `${Math.floor(tenths / 10)}.${tenths % 10}%`;
}

const withShare = (count: number, runs: number): string => `${count} (${percent(count, runs)})`;

function markdownTable(head: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)];
}

function rawTable(report: Report, bot: BotName): string[] {
  const head = ["Formation", ...report.roles, "Bench", "No goals"];
  const rows = FORMATION_IDS.map((formation) => {
    const { slots, bots } = report.formations[formation];
    const cell = bots[bot];
    return [
      formation,
      ...report.roles.map((role) =>
        slots[role] === 0 ? "n/a" : withShare(cell.roles[role], cell.runs),
      ),
      withShare(cell.bench, cell.runs),
      withShare(cell.none, cell.runs),
    ];
  });
  return markdownTable(head, rows);
}

function groupedTable(report: Report, bot: BotName): string[] {
  const head = [
    "Formation",
    ...RULE_GROUPS.map((g) => g.name),
    COMBINED,
    ...REST_GROUPS.map((g) => g.name),
    "Bench",
    "No goals",
    "Tied on top",
  ];
  const rows = FORMATION_IDS.map((formation) => {
    const { slots, bots } = report.formations[formation];
    const cell = bots[bot];
    const share = (roles: readonly Role[]) =>
      roles.some((role) => slots[role] > 0) ? withShare(groupCount(cell, roles), cell.runs) : "n/a";
    return [
      formation,
      ...RULE_GROUPS.map((g) => share(g.roles)),
      share(COMBINED_ROLES),
      ...REST_GROUPS.map((g) => share(g.roles)),
      withShare(cell.bench, cell.runs),
      withShare(cell.none, cell.runs),
      withShare(cell.tiedOnTop, cell.runs),
    ];
  });
  return markdownTable(head, rows);
}

function slotsTable(report: Report): string[] {
  const rows = FORMATION_IDS.map((formation) => {
    const { slots } = report.formations[formation];
    return [formation, ...report.roles.map((role) => String(slots[role]))];
  });
  return markdownTable(["Formation", ...report.roles], rows);
}

function probeText(p: Probe): string {
  const share = p.count / p.runs;
  const se = Math.sqrt((share * (1 - share)) / p.runs) * 100;
  return `${percent(p.count, p.runs)} (${p.group}, ${p.formation}, ${p.bot} bot, ${p.count} of ${p.runs}, standard error ${se.toFixed(2)} points)`;
}

export function ruleLines(report: Report): string[] {
  const all = probes(report);
  const highest = (list: readonly Probe[]): Probe =>
    list.reduce((best, p) => (p.count * best.runs > best.count * p.runs ? p : best));
  const single = all.filter((p) => p.group !== COMBINED);
  const combined = all.filter((p) => p.group === COMBINED);
  const over = (list: readonly Probe[]) => list.filter((p) => exceedsLimit(p.count, p.runs));
  const show = (list: readonly Probe[]) =>
    list.length === 0 ? "none" : list.map(probeText).join("; ");
  return [
    `Limit: strictly more than ${LIMIT_PERCENT}% of the ${report.runsPerCell} runs of one cell (one formation and one bot).`,
    `Single-group cells over the limit (${RULE_NAMES.join(", ")}): ${show(over(single))}.`,
    `Combined cells over the limit (${COMBINED}): ${show(over(combined))}.`,
    `Highest single-group share: ${probeText(highest(single))}.`,
    `Highest combined share: ${probeText(highest(combined))}.`,
  ];
}

export function render(report: Report): string {
  const lines: string[] = [];
  for (const bot of BOT_ORDER) {
    lines.push(`### ${bot} bot, by role`, "", ...rawTable(report, bot), "");
    lines.push(`### ${bot} bot, by group`, "", ...groupedTable(report, bot), "");
  }
  lines.push("### Slots per role in each formation", "", ...slotsTable(report), "");
  lines.push("### Rule check", "", ...ruleLines(report).map((l) => `- ${l}`), "");
  return lines.join("\n");
}

function main(): void {
  const { values } = parseArgs({
    options: {
      mode: { type: "string", default: "cup8" },
      runs: { type: "string", default: String(FULL_RUNS) },
      out: { type: "string" },
      render: { type: "string" },
    },
  });
  if (values.render !== undefined) {
    const report = JSON.parse(readFileSync(values.render, "utf8")) as Report;
    if (report.schema !== SCHEMA) throw new Error(`${values.render} is not a ${SCHEMA} file`);
    process.stdout.write(render(report));
    return;
  }
  const mode = CUP_MODES.find((m) => m === values.mode);
  if (mode === undefined) throw new Error(`--mode must be one of ${CUP_MODES.join(", ")}`);
  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
  const out =
    values.out ??
    path.join("scripts", "calibration", "out", `golden-boot-by-role-${mode}-${runs}.json`);

  const cells = FORMATION_IDS.length * BOT_ORDER.length;
  console.log(
    `golden-boot-by-role mode=${mode} runsPerCell=${runs} cells=${cells} engine=${ENGINE_VERSION} node=${process.version} arch=${os.arch()} cores=${os.cpus().length} load=${os
      .loadavg()
      .map((x) => x.toFixed(2))
      .join(",")}`,
  );
  const started = performance.now();
  const report = simulate(mode, runs);
  const secs = (performance.now() - started) / 1000;

  const text = `${JSON.stringify(report, null, 2)}\n`;
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text);
  const rate = (cells * runs) / secs;
  console.log(`throughput ${rate.toFixed(1)} runs/s: ${cells * runs} runs in ${secs.toFixed(1)} s`);
  console.log(
    `estimate for ${FULL_RUNS} runs per cell (${cells * FULL_RUNS} runs): ${((cells * FULL_RUNS) / rate / 60).toFixed(1)} min at this rate`,
  );
  for (const line of ruleLines(report)) console.log(line);
  console.log(`sha256 ${createHash("sha256").update(text).digest("hex")}  ${out}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}
