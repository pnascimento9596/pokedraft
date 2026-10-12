export function runHref(token: string): string {
  const [version, payload] = token.split(".");
  return `/r/${version}?t=${payload}`;
}

export function runTokenFromUrl(url: Pick<URL, "pathname" | "searchParams">): string | null {
  const match = /^\/r\/([^/]+)$/.exec(url.pathname);
  if (match === null) return null;
  try {
    const token = decodeURIComponent(match[1]!);
    if (!/^pd\d+$/.test(token)) return token;
    const payloads = url.searchParams.getAll("t");
    if (payloads.length !== 1 || !/^[A-Za-z0-9_-]+$/.test(payloads[0]!)) return null;
    return `${token}.${payloads[0]}`;
  } catch {
    return null;
  }
}
