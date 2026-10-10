"use client";

import { Pitch } from "@/components/pitch/Pitch";
import { createDraft, type Seed } from "@/engine";

const draft = createDraft(
  { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
  "x" as Seed,
);

export function Placeholder() {
  return <Pitch formation="4-3-3" lineup={draft.lineup} onSlotTap={() => {}} />;
}
