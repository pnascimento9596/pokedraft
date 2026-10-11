import Link from "next/link";
import { ModuleCard, StatusNote } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";

export default function NotFound() {
  return (
    <main className="page">
      <ModuleCard
        eyebrow="Page unavailable"
        title="Page not found"
        headingLevel={1}
        description="Choose a game from the start page."
        icon={<NavIcon family="play" />}
      >
        <StatusNote title="Nothing here">There is nothing at this address.</StatusNote>
        <Link href="/" className="btn btn--primary">
          Back to the start
        </Link>
      </ModuleCard>
    </main>
  );
}
