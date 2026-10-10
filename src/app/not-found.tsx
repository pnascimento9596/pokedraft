import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <Link href="/" className="btn btn--primary">
        Back to the start
      </Link>
    </main>
  );
}
