/** Copies `${origin}${path}` and returns the line to announce. */
export async function copyLink(path: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(`${location.origin}${path}`);
    return "Link copied";
  } catch {
    return "Could not copy the link";
  }
}
