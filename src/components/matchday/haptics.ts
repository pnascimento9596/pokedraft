const PATTERN = {
  goal: [120],
  red: [70, 90, 70],
  final: [400],
} as const satisfies Readonly<Record<string, readonly number[]>>;

export type Haptic = keyof typeof PATTERN;

/** Android browsers vibrate; Safari has no `navigator.vibrate`, so there this does nothing. */
export function buzz(h: Haptic): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate([...PATTERN[h]]);
}
