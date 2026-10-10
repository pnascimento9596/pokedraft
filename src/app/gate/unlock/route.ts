import { NextResponse, type NextRequest } from "next/server";
import {
  PASSCODE_COOKIE,
  PASSCODE_MAX_AGE,
  passcodeDigest,
  passcodeMatches,
  safeNext,
} from "@/passcode";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const passcode = process.env.FRIENDS_PASSCODE;
  if (!passcode) return NextResponse.redirect(new URL(next, request.url), 303);
  if (!passcodeMatches(String(form.get("passcode") ?? ""), passcode)) {
    const back = new URL("/gate", request.url);
    back.searchParams.set("next", next);
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }
  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(PASSCODE_COOKIE, passcodeDigest(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASSCODE_MAX_AGE,
  });
  return res;
}
