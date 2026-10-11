// The route list and the fixtures reader, shared by every audit tool. A tool that measures a route
// reads it from here, so the baseline and the final readback cover exactly the same URLs.
import { readFileSync } from "node:fs";
import { LOCAL_URL, PROD_URL } from "./lib.mjs";

export const TARGETS = {
  prod: { label: "prod", baseUrl: PROD_URL },
  local: { label: "local", baseUrl: LOCAL_URL },
};

// `{token}` is replaced by the pinned share token from fixtures.json.
export const ROUTES = [
  { id: "home", path: "/" },
  { id: "play", path: "/play" },
  { id: "daily", path: "/daily" },
  { id: "leaderboard", path: "/leaderboard" },
  { id: "history", path: "/history" },
  { id: "how-to-play", path: "/how-to-play" },
  { id: "run", path: "/r/{token}" },
];

// The URL the dispatch 5 QA measured (finish-qa.md prints only "/play?mode=kanto151..."). The
// parameters are the ones the e2e specs use for the same challenge.
export const EXTRA_ROUTES = [
  { id: "play-kanto151", path: "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151" },
];

export const NOT_FOUND_ROUTE = { id: "not-found", path: "/definitely-not-a-page" };

export const LIGHTHOUSE_ROUTES = [...ROUTES, ...EXTRA_ROUTES];
export const SCREENSHOT_ROUTES = [...ROUTES, NOT_FOUND_ROUTE];

export const VIEWPORTS = [
  { id: "360x640", width: 360, height: 640, mobile: true, deviceScaleFactor: 3 },
  { id: "390x844", width: 390, height: 844, mobile: true, deviceScaleFactor: 3 },
  { id: "430x932", width: 430, height: 932, mobile: true, deviceScaleFactor: 3 },
  { id: "844x390", width: 844, height: 390, mobile: true, deviceScaleFactor: 3 },
  { id: "1440x900", width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 },
];

export const THEMES = ["light", "dark"];

export function readFixtures() {
  return JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
}

export function routePath(route, fixtures = readFixtures()) {
  return route.path.replace("{token}", encodeURIComponent(fixtures.shareRun.token));
}

export function routeUrl(baseUrl, route, fixtures = readFixtures()) {
  return `${baseUrl}${routePath(route, fixtures)}`;
}

// A short label for tables: the route path with the long token elided.
export function routeLabel(route) {
  return route.path.replace("{token}", "<token>");
}
