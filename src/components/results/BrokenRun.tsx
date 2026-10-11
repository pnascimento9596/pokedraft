import Link from "next/link";
import { ModuleCard, StatusNote } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import s from "./ResultsView.module.css";

export function BrokenRun() {
  return (
    <ModuleCard
      className={s.broken}
      data-testid="run-error"
      headingLevel={1}
      eyebrow="Replay"
      title="Run not found"
      description="This run could not be restored."
      icon={<NavIcon family="play" />}
    >
      <StatusNote title="Replay unavailable">
        This run link is broken or from an older version.
      </StatusNote>
      <Link href="/" className="btn btn--primary">
        Play a new run
      </Link>
    </ModuleCard>
  );
}
