// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_BOOT_SCRIPT, THEME_KEY } from "../theme";

const LIGHT = "#E7EAE2";
const DARK = "#0B1220";

// A matchMedia whose dark-scheme answer the test flips, with the listeners it was given.
function stubScheme(dark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const state = { dark };
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === "(prefers-color-scheme: dark)" && state.dark;
    },
    media: query,
    addEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: () => {},
  }));
  return {
    flip(next: boolean) {
      state.dark = next;
      for (const cb of listeners) cb({ matches: next });
    },
  };
}

const theme = () => document.documentElement.getAttribute("data-theme");
const metaColor = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null;

describe("THEME_BOOT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head.replaceChildren();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies a stored light choice and its theme-color under a dark OS", () => {
    stubScheme(true);
    localStorage.setItem(THEME_KEY, JSON.stringify("light"));
    eval(THEME_BOOT_SCRIPT);
    expect(theme()).toBe("light");
    expect(metaColor()).toBe(LIGHT);
  });

  it("applies a stored dark choice and its theme-color under a light OS", () => {
    stubScheme(false);
    localStorage.setItem(THEME_KEY, JSON.stringify("dark"));
    eval(THEME_BOOT_SCRIPT);
    expect(theme()).toBe("dark");
    expect(metaColor()).toBe(DARK);
  });

  it("always sets data-theme: Auto resolves to the OS scheme (catches data-theme left unset under Auto)", () => {
    stubScheme(true);
    localStorage.setItem(THEME_KEY, JSON.stringify("system"));
    eval(THEME_BOOT_SCRIPT);
    expect(theme()).toBe("dark");
    expect(metaColor()).toBe(DARK);
  });

  it("resolves a missing choice to a light OS", () => {
    stubScheme(false);
    eval(THEME_BOOT_SCRIPT);
    expect(theme()).toBe("light");
    expect(metaColor()).toBe(LIGHT);
  });

  it("resolves garbage in storage to the OS scheme", () => {
    stubScheme(true);
    localStorage.setItem(THEME_KEY, "invalid-json{{");
    eval(THEME_BOOT_SCRIPT);
    expect(theme()).toBe("dark");
  });

  it("updates the one theme-color meta in place instead of adding a second", () => {
    stubScheme(false);
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#000000";
    document.head.appendChild(meta);
    eval(THEME_BOOT_SCRIPT);
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(metaColor()).toBe(LIGHT);
  });

  it("keeps Auto live: an OS switch moves data-theme and theme-color, an explicit choice stays (catches a static status bar colour)", () => {
    const os = stubScheme(false);
    eval(THEME_BOOT_SCRIPT);
    os.flip(true);
    expect([theme(), metaColor()]).toEqual(["dark", DARK]);
    localStorage.setItem(THEME_KEY, JSON.stringify("light"));
    os.flip(false);
    os.flip(true);
    expect([theme(), metaColor()]).toEqual(["light", LIGHT]);
  });

  it("does not throw when localStorage access throws, and still follows the OS", () => {
    stubScheme(true);
    const originalGetItem = Storage.prototype.getItem;
    try {
      Storage.prototype.getItem = () => {
        throw new Error("SecurityError: localStorage is not accessible");
      };
      expect(() => {
        eval(THEME_BOOT_SCRIPT);
      }).not.toThrow();
      expect(theme()).toBe("dark");
    } finally {
      Storage.prototype.getItem = originalGetItem;
    }
  });
});
