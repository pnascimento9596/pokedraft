"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ModuleCard } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import { ERROR_BODY, ERROR_TITLE } from "@/ui/labels";
import s from "./not-found.module.css";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}

// Reload rather than retry: a reload restores the run from its checkpoint, while a retry renders
// the same client state that just threw.
// Next passes { error, retry }; this page uses neither.
const ErrorPage: (props: ErrorProps) => ReactNode = () => {
  return (
    <main className="page">
      <ModuleCard
        className={s.module}
        eyebrow="Page error"
        title={ERROR_TITLE}
        headingLevel={1}
        description={ERROR_BODY}
        icon={<NavIcon family="play" />}
      >
        <div className={s.actions}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </ModuleCard>
    </main>
  );
};

export default ErrorPage;
