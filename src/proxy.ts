import { NextResponse, type NextRequest } from "next/server";
import { decodeToken } from "./engine/token";
import { RETAINED_TOKEN_VERSIONS } from "./engine/versions/label";
import { PASSCODE_COOKIE, cookieMatches, isPublicPath } from "./passcode";
import { runTokenFromUrl } from "./ui/run-link";

const SHARE_PATH = /^\/r\/([^/]+)$/;

// A page that streams has already sent 200, so an undecodable share link is answered here,
// before the body starts. Tokens that decode but fail the replay keep the friendly 200 page.
// Links from an older engine go through: only that engine's retained bundle can decode them,
// and the page replays them there.
function brokenShareLink(token: string | null): boolean {
  if (token === null) return true;
  try {
    const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
    if (RETAINED_TOKEN_VERSIONS.includes(version)) return false;
    decodeToken(token);
    return false;
  } catch {
    return true;
  }
}

function pass(request: NextRequest): NextResponse {
  if (!SHARE_PATH.test(request.nextUrl.pathname)) return NextResponse.next();
  const token = runTokenFromUrl(request.nextUrl);
  if (brokenShareLink(token)) {
    return NextResponse.rewrite(new URL("/run-not-found", request.url));
  }
  if (/^\/r\/pd\d+$/.test(request.nextUrl.pathname)) {
    const canonical = request.nextUrl.clone();
    canonical.pathname = `/r/${token}`;
    canonical.searchParams.delete("t");
    return NextResponse.rewrite(canonical);
  }
  return NextResponse.next();
}

export function proxy(request: NextRequest): NextResponse {
  const passcode = process.env.FRIENDS_PASSCODE;
  if (!passcode) return pass(request);
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return pass(request);
  if (cookieMatches(request.cookies.get(PASSCODE_COOKIE)?.value, passcode)) {
    return pass(request);
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "PASSCODE_REQUIRED", message: "Enter the friends passcode first." } },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const gate = new URL("/gate", request.url);
  gate.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(gate, 307);
}

export const config = {
  matcher: ["/((?!_next/static|favicon.ico|robots.txt).*)"],
};
