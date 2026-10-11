import type { CSSProperties } from "react";
import type { PokemonType } from "@/engine";
import { typeLabel } from "@/ui/labels";

export function TypeChip({ type }: { readonly type: PokemonType }) {
  return (
    <span
      className="type-chip"
      style={
        {
          "--type-color": `var(--type-${type})`,
          "--type-ink": `var(--type-${type}-ink)`,
        } as CSSProperties
      }
    >
      {typeLabel(type)}
    </span>
  );
}
