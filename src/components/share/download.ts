// What the PNG card renders: a finished run (`t`, any replayable token, builder tokens are
// friendlies) or a builder lineup that may be incomplete (`b`, see `builderToken`).
export type CardSource = { readonly t: string } | { readonly b: string };

export function cardHref(source: CardSource): string {
  const q = new URLSearchParams("t" in source ? { t: source.t } : { b: source.b });
  return `/card?${q.toString()}`;
}

// Contract stub. The results workstream implements the fetch and the file save.
export async function downloadCard(source: CardSource, filename: string): Promise<void> {
  void source;
  void filename;
}
