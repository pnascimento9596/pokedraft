// Browser storage can be missing or throw (private windows, blocked site data, SSR).
// Every read falls back to the given default and every write is best effort.

export function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable; the app keeps working without persistence
  }
}

// Per-tab storage for state that should survive a reload or Back but not outlive the tab.
export function readSession(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable; the run still plays, it just will not survive a reload
  }
}
