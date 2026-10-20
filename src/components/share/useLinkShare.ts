"use client";

import { useState } from "react";
import { SHARE_SAID, absoluteUrl, shareLink, type LinkShare, type ShareOutcome } from "./shareLink";

interface Shown {
  readonly said: string;
  readonly manual: string | null;
}

const NOTHING: Shown = { said: "", manual: null };

/** Shares a link and keeps what the player should see: the status line, and the link itself when
 * it has to be copied by hand. */
export function useLinkShare() {
  const [shown, setShown] = useState<Shown>(NOTHING);

  const share = async (link: LinkShare): Promise<ShareOutcome> => {
    const how = await shareLink(link);
    setShown({ said: SHARE_SAID[how], manual: how === "manual" ? absoluteUrl(link.path) : null });
    return how;
  };

  const clear = () => setShown(NOTHING);

  return { ...shown, share, clear };
}
