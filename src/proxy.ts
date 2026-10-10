import { NextResponse, type NextRequest } from "next/server";
import { decodeToken } from "./engine";
import { PASSCODE_COOKIE, cookieMatches, isPublicPath } from "./passcode";

const SHARE_PATH = /^\/r\/([^/]+)$/;

// A page that streams has already sent 200, so an undecodable share link is answered here,
// before the body starts. Tokens that decode but fail the replay keep the friendly 200 page.
function brokenShareLink(pathname: string): boolean {
  const m = SHARE_PATH.exec(pathname);
  if (m === null) return false;
  try {
    decodeToken(decodeURIComponent(m[1]!));
    return false;
  } catch {
    return true;
  }
}

function pass(request: NextRequest): NextResponse {
  return brokenShareLink(request.nextUrl.pathname)
    ? NextResponse.rewrite(new URL("/run-not-found", request.url))
    : NextResponse.next();
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
