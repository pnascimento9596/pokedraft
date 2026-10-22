import { NextResponse, type NextRequest } from "next/server";
import { decodeToken } from "./engine/token";
import { decodeToken as decodeRetainedToken } from "./engine/versions/v3/src/engine/token";
import { decodeToken as decodeV5Token } from "./engine/versions/v5/src/engine/token";
import { decodeToken as decodeV6Token } from "./engine/versions/v6/src/engine/token";
import { decodeToken as decodeV7Token } from "./engine/versions/v7/src/engine/token";
import { runTokenFromUrl } from "./ui/run-link";

const SHARE_PATH = /^\/r\/([^/]+)$/;

// A page that streams has already sent 200, so an undecodable share link is answered here,
// before the body starts. Tokens that decode but fail the replay keep the friendly 200 page.
// Versions 1 to 4 share the frozen v3 wire schema and versions 5 to 7 have their own frozen
// codecs. Validate with those data-free codecs while leaving the original token intact for replay
// on its own retained engine.
function brokenShareLink(token: string | null): boolean {
  if (token === null) return true;
  try {
    if (/^pd[1234]\./.test(token)) {
      decodeRetainedToken(token.replace(/^pd\d+\./, "pd3."));
    } else if (token.startsWith("pd5.")) {
      decodeV5Token(token);
    } else if (token.startsWith("pd6.")) {
      decodeV6Token(token);
    } else if (token.startsWith("pd7.")) {
      decodeV7Token(token);
    } else {
      decodeToken(token);
    }
    return false;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest): NextResponse {
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

export const config = {
  matcher: ["/((?!_next/static|creatures/|api/health$|api/csp-report$|favicon.ico|robots.txt).*)"],
};
