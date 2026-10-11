"use client";

import { useEffect, useState } from "react";

// The page's one polite live region. It is in the root layout, so it is on the page, empty, before
// anything speaks, and a screen reader hears every change of its text. A region that is inserted
// together with its text can stay silent.

let speak: ((text: string) => void) | null = null;
let queue: string[] = [];

function flush() {
  const text = queue.join(" ");
  queue = [];
  speak?.(text);
}

/** Reads a message out. Messages from the same task are read as one, in order. */
export function announce(message: string): void {
  if (speak === null || message === "") return;
  if (queue.length === 0) queueMicrotask(flush);
  queue.push(message);
}

export function Announcer() {
  const [shown, setShown] = useState("");

  useEffect(() => {
    // The same message twice must still change the text, or the second one is not read.
    speak = (text) => setShown((prev) => (prev === text ? `${text} ` : text));
    return () => {
      speak = null;
      queue = [];
    };
  }, []);

  return (
    <p className="visually-hidden" role="status" aria-live="polite" data-testid="announcer">
      {shown}
    </p>
  );
}
