// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Picker } from "@/components/builder/Picker";
import { createDraft, type Seed, type SpeciesId } from "@/engine";
import { ScoutingDossier } from "../ScoutingDossier";

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness({ mounted = true }: { readonly mounted?: boolean }) {
  const [open, setOpen] = useState(false);
  const dossier =
    open && mounted ? (
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        showRatings={true}
        onClose={() => setOpen(false)}
      />
    ) : null;
  return (
    <>
      <button onClick={() => setOpen(true)}>Scout Pikachu</button>
      {dossier}
    </>
  );
}

function openDossier(strict = false) {
  render(
    strict ? (
      <StrictMode>
        <Harness />
      </StrictMode>
    ) : (
      <Harness />
    ),
  );
  const opener = screen.getByRole("button", { name: "Scout Pikachu" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("ScoutingDossier modal lifecycle", () => {
  it("uses showModal and focuses Close instead of leaving focus behind the dossier", () => {
    openDossier();
    const dialog = screen.getByRole("dialog", { name: "Pikachu" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Close" }));
  });

  it("survives StrictMode effect replay and returns focus to the Scout button on Close", () => {
    const opener = openDossier(true);
    const dialog = screen.getByRole("dialog", { name: "Pikachu" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(showModal).toHaveBeenCalledTimes(2);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes the native dialog and restores its opener when its owner unmounts it", () => {
    const view = render(<Harness />);
    const opener = screen.getByRole("button", { name: "Scout Pikachu" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Pikachu" }) as HTMLDialogElement;
    view.rerender(<Harness mounted={false} />);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it("keeps Escape local without preventing the native cancel action", () => {
    openDossier();
    const onWindowKey = vi.fn();
    window.addEventListener("keydown", onWindowKey);
    try {
      const close = screen.getByRole("button", { name: "Close" });
      const escape = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      fireEvent(close, escape);
      expect(escape.defaultPrevented).toBe(false);
      expect(onWindowKey).toHaveBeenCalledTimes(0);
      expect(screen.getByRole("dialog", { name: "Pikachu" }).tagName).toBe("DIALOG");
      fireEvent(
        screen.getByRole("dialog", { name: "Pikachu" }),
        new Event("cancel", { cancelable: true }),
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      window.removeEventListener("keydown", onWindowKey);
    }
  });

  it.each(["Close", "Escape", "backdrop", "native close"] as const)(
    "%s dismisses only the dossier, preserving Picker and returning focus to Scout",
    (method) => {
      const onPickerClose = vi.fn();
      const historyBack = vi.spyOn(window.history, "back").mockImplementation(() => {});
      const draft = createDraft(
        { mode: "builder", formation: "4-3-3", gens: [1], legendaries: true },
        "dossier" as Seed,
      );
      render(
        <Picker
          state={draft}
          slot={{ kind: "starter", index: 0 }}
          showRatings={false}
          onPick={vi.fn()}
          onClear={vi.fn()}
          onClose={onPickerClose}
        />,
      );
      const picker = screen.getByRole("dialog") as HTMLDialogElement;
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
      const opener = screen.getByRole("button", { name: "Scout Pikachu" });
      opener.focus();
      fireEvent.click(opener);
      const dossier = screen.getByRole("dialog", { name: "Pikachu" }) as HTMLDialogElement;
      const parentCancel = vi.fn();
      picker.addEventListener("cancel", parentCancel);

      if (method === "Close")
        fireEvent.click(within(dossier).getByRole("button", { name: "Close" }));
      if (method === "Escape") {
        fireEvent(dossier, new Event("cancel", { bubbles: true, cancelable: true }));
      }
      if (method === "backdrop") fireEvent.click(dossier);
      if (method === "native close") act(() => dossier.close());

      expect(screen.queryByRole("dialog", { name: "Pikachu" })).toBeNull();
      expect(screen.getByRole("dialog")).toBe(picker);
      expect(picker.open).toBe(true);
      expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("Pikachu");
      expect(document.activeElement).toBe(opener);
      expect(onPickerClose).toHaveBeenCalledTimes(0);
      expect(historyBack).toHaveBeenCalledTimes(0);
      expect(parentCancel).toHaveBeenCalledTimes(0);
    },
  );

  it("does not dismiss on content clicks or reopen when the close callback changes", () => {
    const oldClose = vi.fn();
    const latestClose = vi.fn();
    const view = render(
      <ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={oldClose} />,
    );
    fireEvent.click(screen.getByRole("heading", { name: "Pikachu" }));
    expect(screen.getByRole("dialog", { name: "Pikachu" }).tagName).toBe("DIALOG");
    view.rerender(
      <ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={latestClose} />,
    );
    expect(showModal).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(oldClose).toHaveBeenCalledTimes(0);
    expect(latestClose).toHaveBeenCalledTimes(1);
  });
});

describe("ScoutingDossier blind ratings and theme", () => {
  it("omits numeric attributes, bars and role ratings when ratings are hidden", () => {
    const view = render(
      <ScoutingDossier speciesId={25 as SpeciesId} showRatings={false} onClose={vi.fn()} />,
    );
    const attrs = screen.getByRole("region", { name: "Soccer attributes" });
    const roles = screen.getByRole("region", { name: "Role suitability" });
    expect(attrs.textContent).toContain("Numeric 1 to 99 attributes are hidden");
    expect(attrs.querySelectorAll(".num, [style], [data-high], [data-low]").length).toBe(0);
    expect(roles.querySelectorAll(".num").length).toBe(0);
    expect(roles.textContent).not.toContain("Fit ");
    expect(roles.textContent).toContain("Best");
    view.rerender(
      <ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={vi.fn()} />,
    );
    expect(attrs.querySelectorAll(".num").length).toBe(17);
    expect(attrs.querySelectorAll("[style]").length).toBe(17);
    expect(roles.querySelectorAll(".num").length).toBe(10);
    expect(roles.textContent).toContain("Fit ");
  });

  it("resolves dossier CSS tokens through the app theme or an explicit fallback", () => {
    const css = readFileSync("src/components/scouting/ScoutingDossier.module.css", "utf8");
    const theme = ["src/app/globals.css", "src/design/tokens.css", "src/design/stadium.css"]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const defined = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    const unresolved = [...css.matchAll(/var\((--[\w-]+)\s*([,)])/g)]
      .filter((match) => match[2] !== "," && !defined.has(match[1]))
      .map((match) => match[1]);
    expect(unresolved).toEqual([]);
  });
});
