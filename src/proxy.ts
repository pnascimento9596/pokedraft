import { NextResponse, type NextRequest } from "next/server";
import { PASSCODE_COOKIE, cookieMatches, isPublicPath } from "./passcode";

export function proxy(request: NextRequest): NextResponse {
  const passcode = process.env.FRIENDS_PASSCODE;
  if (!passcode) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (cookieMatches(request.cookies.get(PASSCODE_COOKIE)?.value, passcode)) {
    return NextResponse.next();
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
