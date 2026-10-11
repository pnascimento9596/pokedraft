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

/** How the PNG reached the player: the share sheet, the download link, or a share sheet they closed. */
export type CardDelivery = "shared" | "saved" | "cancelled";

// On a phone the share sheet is where Save Image lives, and iOS handles a download link to a blob
// unevenly. A desktop keeps the plain download, even where it could share files.
async function shareFile(file: File): Promise<CardDelivery | null> {
  if (typeof navigator.share !== "function" || !navigator.canShare?.({ files: [file] }))
    return null;
  if (!window.matchMedia("(pointer: coarse)").matches) return null;
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    // NotAllowedError when a slow render outlived the tap's activation: the link still works.
    return null;
  }
}

function saveWithLink(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
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

export async function downloadCard(
  source: CardSource,
  filename: string,
  look: CardLook = readSettings(),
): Promise<CardDelivery> {
  const res = await fetch(cardHref(source, look));
  if (!res.ok) throw new Error(`card request failed with ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/png")) throw new Error(`card is ${type || "untyped"}, not a PNG`);
  const blob = await res.blob();
  const shared = await shareFile(new File([blob], filename, { type: "image/png" }));
  if (shared !== null) return shared;
  saveWithLink(blob, filename);
  return "saved";
}
