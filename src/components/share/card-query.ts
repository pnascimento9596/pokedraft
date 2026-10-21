import { DEFAULT_PACK_ID, packById } from "@/images/packs";

export function canonicalCardQuery(q: URLSearchParams): string | null {
  const t = q.get("t");
  const b = q.get("b");
  const out = t ? new URLSearchParams({ t }) : b ? new URLSearchParams({ b }) : null;
  if (out === null) return null;
  const pack = q.get("pack");
  if (pack !== null && pack !== DEFAULT_PACK_ID && packById(pack) !== null) {
    out.set("pack", pack);
  }
  if (q.get("mirror") === "0") out.set("mirror", "0");
  return out.toString();
}
