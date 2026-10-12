export const THEME_KEY = "pokedraft:theme";

export type Theme = "system" | "light" | "dark";

export const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_KEY}";var r=localStorage.getItem(k);if(r){var t=JSON.parse(r);if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
