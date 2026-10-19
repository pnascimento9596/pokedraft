import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "@/design/theme-color";

export const THEME_KEY = "pokedraft:theme";

export type Theme = "system" | "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint, so data-theme is always set to the effective theme and the
 * one theme-color meta carries its colour. Under Auto it follows OS switches while the page is open.
 * `applyTheme` is the same steps for the toggle; theme.test.ts holds both to the same results.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,q=window.matchMedia("${DARK_QUERY}");function apply(){var t=null;try{t=JSON.parse(localStorage.getItem("${THEME_KEY}"))}catch(e){}if(t!=="light"&&t!=="dark")t=q.matches?"dark":"light";d.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=t==="dark"?"${THEME_COLOR_DARK}":"${THEME_COLOR_LIGHT}"}apply();q.addEventListener("change",apply)}catch(e){}})();`;

export function applyTheme(choice: Theme): void {
  const resolved =
    choice === "system" ? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light") : choice;
  document.documentElement.setAttribute("data-theme", resolved);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta === null) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}
