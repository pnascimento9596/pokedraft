import raw from "./movesets.json";
import type { Move, Moveset, MovesetsArtifact } from "./movesets-schema";

export { DAMAGE_CLASSES, MoveSchema, MovesetsArtifactSchema } from "./movesets-schema";
export type { DamageClass, Move, Moveset } from "./movesets-schema";

// Presentation-only. The build validates the artifact before writing it; nothing here re-parses it.
const artifact = raw as MovesetsArtifact;

function moveOf(id: string): Move {
  return { id, ...artifact.moves[id] };
}

export function movesetFor(speciesId: number): Moveset {
  const row = Number.isInteger(speciesId) ? artifact.species[speciesId - 1] : undefined;
  if (!row || row.id !== speciesId) throw new RangeError(`no moveset for species ${speciesId}`);
  return {
    id: row.id,
    moves: row.moves.map(moveOf),
    keeperMove: row.keeperMove === null ? null : moveOf(row.keeperMove),
  };
}
