import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/passcode";
import { loadRun } from "../r/[token]/run";
import { runTitle } from "../r/[token]/title";
import s from "./page.module.css";

const SHARE = /^\/r\/([^/?#]+)$/;

// Preview bots follow the redirect to this page, so a gated share link still carries the
// run's title and its (public) card image.
export async function generateMetadata({ searchParams }: PageProps<"/gate">): Promise<Metadata> {
  const next = safeNext(firstParam((await searchParams).next));
  const share = SHARE.exec(next);
  if (share === null) return { title: "pokedraft" };
  const token = decodeURIComponent(share[1]!);
  const title = runTitle(loadRun(token));
  const image = `/r/${encodeURIComponent(token)}/opengraph-image`;
  return {
    title,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

async function GateForm({ searchParams }: { searchParams: PageProps<"/gate">["searchParams"] }) {
  const q = await searchParams;
  const next = safeNext(firstParam(q.next));
  const failed = firstParam(q.error) === "1";
  return (
    <form method="post" action="/gate/unlock" className={s.form}>
      <input type="hidden" name="next" value={next} />
      <label className={s.label}>
        <span className="kicker">Friends passcode</span>
        <input
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
          className={s.input}
          data-testid="gate-passcode"
        />
      </label>
      {failed ? (
        <p role="alert" className={s.error}>
          That passcode did not work.
        </p>
      ) : null}
      <button type="submit" className="btn btn--primary">
        Enter
      </button>
    </form>
  );
}

export default function GatePage({ searchParams }: PageProps<"/gate">) {
  return (
    <main className="page">
      <section className={s.gate}>
        <h1>pokedraft is friends only</h1>
        <p>Ask the group for the passcode. You only need it once on this device.</p>
        <Suspense fallback={null}>
          <GateForm searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
