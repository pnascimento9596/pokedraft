/** The match clock's latest frame, which runs ahead of the props React last rendered. */
export interface LiveFrame {
  readonly clock: number;
  readonly now: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly kicks: number;
  readonly speed: number;
}

/** What the broadcast reads: the newest frame, and a call after each one is published. */
export interface FrameFeed {
  latest(): LiveFrame | null;
  /** Calls `paint` after every published frame until the returned function runs. */
  subscribe(paint: () => void): () => void;
}

/** What the match player's frame loop writes to. */
export interface FrameSource extends FrameFeed {
  publish(frame: LiveFrame): void;
}

export function frameSource(): FrameSource {
  let frame: LiveFrame | null = null;
  const painters = new Set<() => void>();
  return {
    latest: () => frame,
    subscribe(paint) {
      painters.add(paint);
      return () => {
        painters.delete(paint);
      };
    },
    publish(next) {
      frame = next;
      for (const paint of painters) paint();
    },
  };
}
