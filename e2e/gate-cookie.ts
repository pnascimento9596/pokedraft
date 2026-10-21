import { readFileSync } from "node:fs";
import { PASSCODE_COOKIE } from "../src/passcode";

export interface GateCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
  expires: number;
}

export function gateCookies(
  baseUrl: string | undefined,
  cookieFile: string | undefined,
  readFile: (path: string) => string = (path) => readFileSync(path, "utf8"),
): GateCookie[] {
  if (!baseUrl || !cookieFile) return [];
  try {
    const value = readFile(cookieFile).trim();
    if (!value) return [];
    return [
      {
        name: PASSCODE_COOKIE,
        value,
        domain: new URL(baseUrl).hostname,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        expires: -1,
      },
    ];
  } catch {
    return [];
  }
}
