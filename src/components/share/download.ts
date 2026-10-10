import { readSettings } from "@/images/settings";

// What the PNG card renders: a finished run (`t`, any replayable token, builder tokens are
// friendlies) or a builder lineup that may be incomplete (`b`, see `builderToken`).
export type CardSource = { readonly t: string } | { readonly b: string };

/** The player's picture choices, which the card must follow so the export matches the screen. */
export interface CardLook {
  readonly pack: string | null;
  readonly mirror: boolean;
}

export function cardHref(source: CardSource, look?: CardLook): string {
  const q = new URLSearchParams("t" in source ? { t: source.t } : { b: source.b });
  if (look?.pack) q.set("pack", look.pack);
  if (look && !look.mirror) q.set("mirror", "0");
  return `/card?${q.toString()}`;
}

export async function downloadCard(
  source: CardSource,
  filename: string,
  look: CardLook = readSettings(),
): Promise<void> {
  const res = await fetch(cardHref(source, look));
  if (!res.ok) throw new Error(`card request failed with ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/png")) throw new Error(`card is ${type || "untyped"}, not a PNG`);
  const url = URL.createObjectURL(await res.blob());
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
