"use client";

import { PACKS, packById, resolvePack } from "@/images/packs";
import { useImageSettings, writeSettings } from "@/images/settings";

/** Image style picker. Hidden while only one pack is installed. */
export function ImageSettings() {
  const { pack, mirror } = useImageSettings();
  if (PACKS.length < 2) return null;
  const active = resolvePack(null, pack);
  return (
    <details className="image-settings">
      <summary aria-label={`Images: ${active.label}. Open image settings`}>Images</summary>
      <div className="image-settings__panel">
        <label className="image-settings__row">
          <span>Image style</span>
          <select
            value={packById(pack)?.id ?? active.id}
            onChange={(e) => writeSettings({ pack: e.target.value })}
          >
            {PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="image-settings__row image-settings__row--check">
          <input
            type="checkbox"
            checked={mirror}
            onChange={(e) => writeSettings({ mirror: e.target.checked })}
          />
          <span>Face the center</span>
        </label>
      </div>
    </details>
  );
}
