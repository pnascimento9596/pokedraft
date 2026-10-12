"use client";

import { useEffect, useState } from "react";
import { readJson, writeJson } from "@/ui/storage";
import { THEME_KEY, type Theme } from "@/ui/theme";

const NEXT: Readonly<Record<Theme, Theme>> = { system: "dark", dark: "light", light: "system" };
const LABEL: Readonly<Record<Theme, string>> = {
  system: "Auto",
  dark: "Night",
  light: "Day",
};

function apply(theme: Theme): void {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = readJson<Theme>(THEME_KEY, "system");
    const valid: Theme = saved in NEXT ? saved : "system";
    apply(valid);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage after hydration
    setTheme(valid);
  }, []);

  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      aria-label={`Theme: ${LABEL[theme].toLowerCase()}. Change theme`}
      onClick={() => {
        const next = NEXT[theme];
        apply(next);
        writeJson(THEME_KEY, next);
        setTheme(next);
      }}
    >
      {LABEL[theme]}
    </button>
  );
}
