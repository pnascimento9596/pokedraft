"use client";

import type { ReactNode } from "react";
import { ERROR_BODY, ERROR_TITLE } from "@/ui/labels";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}

// The root layout failed, so none of its CSS or theme reached this document: inline styles only,
// following the OS scheme.
const BUTTON = {
  minHeight: 44,
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid currentColor",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
} as const;

// Next passes { error, retry }; this page uses neither.
const GlobalError: (props: ErrorProps) => ReactNode = () => {
  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        <title>pokedraft</title>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>{ERROR_TITLE}</h1>
          <p style={{ margin: "0 0 16px" }}>{ERROR_BODY}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={BUTTON} onClick={() => window.location.reload()}>
              Reload
            </button>
            {/* A full page load on purpose: the root layout that client navigation needs just failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={BUTTON}>
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
