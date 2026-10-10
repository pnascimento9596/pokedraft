import Link from "next/link";
import s from "./ResultsView.module.css";

export function BrokenRun() {
  return (
    <section className={s.broken} data-testid="run-error">
      <h1>Run not found</h1>
      <p>This run link is broken or from an older version.</p>
      <Link href="/" className="btn btn--primary">
        Play a new run
      </Link>
    </section>
  );
}
