"use client";

import { setSoundEnabled, useSoundEnabled } from "./sound";

export function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      aria-pressed={on}
      onClick={() => setSoundEnabled(!on)}
    >
      {on ? "Sound on" : "Sound off"}
    </button>
  );
}
