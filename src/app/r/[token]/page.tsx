import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedRun } from "@/components/results/SharedRun";
import { loadRun } from "./run";
import { runMetadata } from "./title";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  return runMetadata(token, await loadRun(token));
}

export default function RunPage({ params, searchParams }: PageProps<"/r/[token]">) {
  return (
    <main className="page">
      <Suspense fallback={<p className="kicker page-loading">Loading run</p>}>
        {Promise.all([params, searchParams]).then(async ([{ token }, query]) => (
          <SharedRun token={token} run={await loadRun(token)} watch={query.watch} at={query.at} />
        ))}
      </Suspense>
    </main>
  );
}
