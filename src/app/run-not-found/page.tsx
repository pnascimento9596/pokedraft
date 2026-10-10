import { notFound } from "next/navigation";

// The proxy rewrites undecodable share links here so they answer HTTP 404 with the friendly page.
export default function RunNotFoundRoute(): never {
  notFound();
}
