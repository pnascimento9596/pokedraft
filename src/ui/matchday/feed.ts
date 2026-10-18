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
  /**
   * Calls `paint` after every published frame until the returned function runs. `paint` returns
   * true when the frame shows something the last render does not.
   */
  subscribe(paint: () => boolean): () => void;
}

/** What the match player's frame loop writes to. */
export interface FrameSource extends FrameFeed {
  /** Paints the frame; true when a painter asks for a render. */
  publish(frame: LiveFrame): boolean;
}

export function frameSource(): FrameSource {
  let frame: LiveFrame | null = null;
  const painters = new Set<() => boolean>();
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
      let asked = false;
      for (const paint of painters) asked = paint() || asked;
      return asked;
    },
  };
}
