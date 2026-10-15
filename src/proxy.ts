import { NextResponse, type NextRequest } from "next/server";
import { decodeToken } from "./engine/token";
import { decodeToken as decodeRetainedToken } from "./engine/versions/v3/src/engine/token";
import { PASSCODE_COOKIE, cookieMatches, isPublicPath } from "./passcode";
import { runTokenFromUrl } from "./ui/run-link";

const SHARE_PATH = /^\/r\/([^/]+)$/;

// A page that streams has already sent 200, so an undecodable share link is answered here,
// before the body starts. Tokens that decode but fail the replay keep the friendly 200 page.
// Versions 1 to 3 share the frozen v3 wire schema. Validate with that data-free codec while
// leaving the original token intact for replay on its own retained engine.
function brokenShareLink(token: string | null): boolean {
  if (token === null) return true;
  try {
    if (/^pd[123]\./.test(token)) {
      decodeRetainedToken(token.replace(/^pd\d+\./, "pd3."));
    } else {
      decodeToken(token);
    }
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
