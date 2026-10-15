import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedRun } from "@/components/results/SharedRun";
import { loadRun } from "./run";
import { runTitle } from "./title";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const title = runTitle(await loadRun(token));
  return { title, openGraph: { title }, twitter: { card: "summary_large_image", title } };
}

export default function RunPage({ params }: PageProps<"/r/[token]">) {
  return (
    <main className="page">
      <Suspense fallback={<p className="kicker page-loading">Loading run</p>}>
        {params.then(async ({ token }) => (
          <SharedRun token={token} run={await loadRun(token)} />
        ))}
      </Suspense>
    </main>
  );
}
