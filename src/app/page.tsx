import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HomeScreen } from "@/components/home/HomeScreen";
import { SiteFooter } from "@/components/SiteFooter";
import { builderMetadata } from "./builder-metadata";

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const q = await searchParams;
  const b = q.b;
  if (typeof b === "string") {
    return builderMetadata(b);
  }
  return { title: "pokedraft" };
}

async function HomeContent() {
  await connection();
  return <HomeScreen />;
}

export default function Home() {
  return (
    <>
      <main className="page">
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
