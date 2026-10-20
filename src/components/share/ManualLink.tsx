"use client";

import { useEffect, useRef } from "react";
import s from "./ManualLink.module.css";

/** The link to copy by hand when neither the share sheet nor the clipboard took it. */
export function ManualLink({ url }: { readonly url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (url !== null) input.current?.focus();
  }, [url]);
  if (url === null) return null;
  return (
    <label className={s.field}>
      Link
      <input
        ref={input}
        className={s.input}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
      />
    </label>
  );
}
