import { beforeEach, describe, expect, it } from "vitest";
import { THEME_BOOT_SCRIPT, THEME_KEY } from "../theme";

describe("THEME_BOOT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies light theme before hydration when localStorage holds light", () => {
    localStorage.setItem(THEME_KEY, JSON.stringify("light"));
    // eslint-disable-next-line no-eval
    eval(THEME_BOOT_SCRIPT);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies dark theme before hydration when localStorage holds dark", () => {
    localStorage.setItem(THEME_KEY, JSON.stringify("dark"));
    // eslint-disable-next-line no-eval
    eval(THEME_BOOT_SCRIPT);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("leaves data-theme unset when localStorage holds system", () => {
    localStorage.setItem(THEME_KEY, JSON.stringify("system"));
    // eslint-disable-next-line no-eval
    eval(THEME_BOOT_SCRIPT);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("leaves data-theme unset when localStorage holds garbage", () => {
    localStorage.setItem(THEME_KEY, "invalid-json{{");
    // eslint-disable-next-line no-eval
    eval(THEME_BOOT_SCRIPT);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("leaves data-theme unset when theme key is missing", () => {
    // eslint-disable-next-line no-eval
    eval(THEME_BOOT_SCRIPT);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("does not throw when localStorage access throws", () => {
    const originalGetItem = Storage.prototype.getItem;
    try {
      Storage.prototype.getItem = () => {
        throw new Error("SecurityError: localStorage is not accessible");
      };
      expect(() => {
        // eslint-disable-next-line no-eval
        eval(THEME_BOOT_SCRIPT);
      }).not.toThrow();
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    } finally {
      Storage.prototype.getItem = originalGetItem;
    }
  });
});
