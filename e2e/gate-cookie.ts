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
  readFile?: (path: string) => string,
): GateCookie[] {
  void baseUrl;
  void cookieFile;
  void readFile;
  return [];
}
