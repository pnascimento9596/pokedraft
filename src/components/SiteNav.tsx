"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * The main nav. Above 480 px it is an inline row and the Menu button is hidden by CSS. On phones the
 * nav folds behind the Menu button so the header stays one row, and opens as a list of 44 px rows.
 */
export function SiteNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const header = buttonRef.current?.closest("header");
      if (header && e.target instanceof Node && !header.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn--ghost btn--sm site-header__menu"
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => setOpen((v) => !v)}
      >
        Menu
      </button>
      {/* A link navigates without unmounting the layout, so a tap on one closes the menu. Reading
          the pathname instead would suspend the shared layout on the dynamic /r/[token] route. */}
      <nav
        id={navId}
        aria-label="Main"
        data-open={open}
        onClick={(e) => {
          if (e.target instanceof Element && e.target.closest("a") !== null) setOpen(false);
        }}
      >
        {children}
      </nav>
    </>
  );
}
