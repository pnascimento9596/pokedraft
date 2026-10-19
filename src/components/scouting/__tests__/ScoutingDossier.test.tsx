// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Picker } from "@/components/builder/Picker";
import { applyAction, createDraft, speciesById, type Seed, type SpeciesId } from "@/engine";
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
      // One Back drops the dossier's own history entry; the sheet's entry stays.
      expect(historyBack).toHaveBeenCalledTimes(1);
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
  it("plots actual six-axis attributes instead of fabricated category averages", () => {
    render(<ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={vi.fn()} />);
    const radar = screen.getByRole("img", { name: "Pikachu attribute radar" });
    expect(radar.tagName.toLowerCase()).toBe("svg");
    expect(radar.querySelector("desc")?.textContent).toBe(
      "Pikachu: PAC 79, SHO 47, PAS 43, DRI 89, DEF 31, PHY 30. Scale 0 to 99.",
    );
    expect([...radar.querySelectorAll("text")].map((label) => label.textContent)).toEqual([
      "PAC",
      "SHO",
      "PAS",
      "DRI",
      "DEF",
      "PHY",
    ]);
    expect(radar.querySelector('[data-player="candidate"]')?.getAttribute("points")).toBe(
      "140.00,61.00 180.70,116.50 177.24,161.50 140.00,229.00 113.15,155.50 114.02,125.00",
    );
    expect(radar.hasAttribute("tabindex")).toBe(false);
  });

  it("compares literal attributes and displayed role ratings against the named incumbent", () => {
    render(
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        compareTo={speciesById(9)}
        showRatings={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Incumbent comparison").textContent).toContain(
      "Compared with Blastoise in this slot",
    );
    const attrs = screen.getByRole("region", { name: "Soccer attributes" });
    expect(attrs.querySelectorAll("[data-delta]").length).toBe(17);
    expect(screen.getByLabelText("PAC difference versus Blastoise").textContent).toBe("+7");
    expect(screen.getByLabelText("SHO difference versus Blastoise").textContent).toBe("-36");
    expect(screen.getByLabelText("PAS difference versus Blastoise").textContent).toBe("-42");
    expect(screen.getByLabelText("DRI difference versus Blastoise").textContent).toBe("+21");
    expect(screen.getByLabelText("DEF difference versus Blastoise").textContent).toBe("-59");
    expect(screen.getByLabelText("PHY difference versus Blastoise").textContent).toBe("-52");
    const roles = screen.getByRole("region", { name: "Role suitability" });
    expect(roles.querySelectorAll("[data-delta]").length).toBe(10);
    expect(screen.getByLabelText("GK rating difference versus Blastoise").textContent).toBe("-74");
    expect(screen.getByLabelText("W rating difference versus Blastoise").textContent).toBe("+12");
    expect(screen.getByLabelText("ST rating difference versus Blastoise").textContent).toBe("-16");
  });

  it("removes the entire radar and comparison numbers when blind ratings are switched off", () => {
    const view = render(
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        compareTo={speciesById(9)}
        showRatings={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "Pikachu attribute radar" }).tagName.toLowerCase()).toBe(
      "svg",
    );
    expect(screen.getByLabelText("PAC difference versus Blastoise").textContent).toBe("+7");
    view.rerender(
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        compareTo={speciesById(9)}
        showRatings={false}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Pikachu" });
    expect(dialog.querySelectorAll("svg, [data-delta]").length).toBe(0);
    expect(screen.queryByRole("region", { name: "Attribute radar" })).toBeNull();
    expect(screen.getByLabelText("Incumbent comparison").textContent).toContain("Blastoise");
    expect(screen.getByRole("region", { name: "Soccer attributes" }).textContent).toContain(
      "attributes are hidden",
    );
  });

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

describe("dossier and picker (4f)", () => {
  const GK_SLOT = { kind: "starter", index: 0 } as const;
  const builderDraft = () =>
    createDraft(
      { mode: "builder", formation: "4-3-3", gens: [1, 2, 3, 4, 5, 6, 7, 8, 9], legendaries: true },
      "dossier-4f" as Seed,
    );
  const radarLabels = () =>
    [...screen.getByRole("img", { name: /attribute radar$/ }).querySelectorAll("text")].map(
      (label) => label.textContent,
    );

  it("GK dossier shows DIV REF HAN GKP KIC AER (catches outfield axes on a goalkeeper slot)", () => {
    const draft = builderDraft();
    render(
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        showRatings={true}
        slotContext={{ slot: GK_SLOT, lineup: draft.lineup, candidateLineup: draft.lineup }}
        onClose={vi.fn()}
      />,
    );
    expect(radarLabels()).toEqual(["DIV", "REF", "HAN", "GKP", "KIC", "AER"]);
    expect(
      screen.getByRole("img", { name: "Pikachu attribute radar" }).querySelector("desc")
        ?.textContent,
    ).toBe("Pikachu: DIV 42, REF 68, HAN 16, GKP 36, KIC 40, AER 34. Scale 0 to 99.");
  });

  it("GK dossier uses the goalkeeper axes for a player drafted in goal (catches outfield axes on a placed keeper)", () => {
    const placed = applyAction(builderDraft(), {
      type: "place",
      species: 25 as SpeciesId,
      slot: GK_SLOT,
    }).lineup;
    render(
      <ScoutingDossier
        speciesId={25 as SpeciesId}
        showRatings={true}
        lineup={placed}
        onClose={vi.fn()}
      />,
    );
    expect(radarLabels()).toEqual(["DIV", "REF", "HAN", "GKP", "KIC", "AER"]);
  });

  it("GK dossier falls back to the best role, so Machamp (best GK) shows the keeper axes", () => {
    render(<ScoutingDossier speciesId={68 as SpeciesId} showRatings={true} onClose={vi.fn()} />);
    expect(radarLabels()).toEqual(["DIV", "REF", "HAN", "GKP", "KIC", "AER"]);
  });

  it("dossier review shows TAK review +3 for Bulbasaur (catches the review adjustment hiding behind the final number)", () => {
    const view = render(
      <ScoutingDossier speciesId={1 as SpeciesId} showRatings={true} onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText("Review changes").textContent).toBe("TAK 35, review +3");
    view.rerender(
      <ScoutingDossier speciesId={1 as SpeciesId} showRatings={false} onClose={vi.fn()} />,
    );
    expect(screen.queryByLabelText("Review changes")).toBeNull();
    expect(screen.getByRole("region", { name: "Scouting report" }).textContent).toContain(
      "Its signature vines earn a small tackling bump",
    );
  });

  it("dossier review says when the review changed nothing (Pikachu has no adjustments)", () => {
    render(<ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Review changes").textContent).toBe(
      "The review kept every attribute at its baseline.",
    );
  });

  it("role fit Best keeps its star out of the accessible name (catches the inline ★ Best left by 4e)", () => {
    render(<ScoutingDossier speciesId={25 as SpeciesId} showRatings={false} onClose={vi.fn()} />);
    const roles = screen.getByRole("region", { name: "Role suitability" });
    const stars = [...roles.querySelectorAll('[aria-hidden="true"]')].map((el) => el.textContent);
    expect(stars).toEqual(["★", "★", "★"]);
    expect(
      [...roles.querySelectorAll('[aria-hidden="true"]')].map(
        (el) => el.parentElement?.textContent,
      ),
    ).toEqual(["★ Best", "★ Best", "★ Best"]);
  });

  function OffersHarness({ showRatings = true }: { readonly showRatings?: boolean }) {
    const [id, setId] = useState(502 as SpeciesId);
    return (
      <ScoutingDossier
        speciesId={id}
        showRatings={showRatings}
        offers={{ ids: [502, 550, 535] as SpeciesId[], onShow: setId }}
        onClose={vi.fn()}
      />
    );
  }

  it("Prev and Next cycle the round's offers with 1 of 3 (catches a dossier stuck on one offer)", () => {
    render(<OffersHarness />);
    const title = () => screen.getByRole("heading", { level: 2 }).textContent;
    expect(screen.getByTestId("dossier-offer-count").textContent).toBe("1 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next offer" }));
    expect(title()).toBe("Basculin");
    expect(screen.getByTestId("dossier-offer-count").textContent).toBe("2 of 3");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(title()).toBe("Tympole");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(title()).toBe("Dewott");
    fireEvent.click(screen.getByRole("button", { name: "Previous offer" }));
    expect(title()).toBe("Tympole");
    expect(screen.getByTestId("dossier-offer-count").textContent).toBe("3 of 3");
  });

  it("Compare draws every offer on the same axes with distinct dash patterns and a named legend (catches colour-only compare)", () => {
    render(<OffersHarness />);
    const compare = screen.getByRole("button", { name: "Compare offers" });
    expect(compare.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(compare);
    expect(compare.getAttribute("aria-pressed")).toBe("true");
    const radar = screen.getByRole("img", { name: "Dewott attribute radar" });
    const polygons = [...radar.querySelectorAll('[data-player="offer"]')];
    expect(polygons.map((p) => p.getAttribute("data-name"))).toEqual([
      "Dewott",
      "Basculin",
      "Tympole",
    ]);
    const dashes = polygons.map((p) => p.getAttribute("stroke-dasharray"));
    expect(new Set(dashes).size).toBe(3);
    expect(radar.querySelector("desc")?.textContent).toBe(
      "Dewott: PAC 55, SHO 67, PAS 69, DRI 64, DEF 54, PHY 60. Basculin: PAC 59, SHO 70, PAS 56, DRI 68, DEF 53, PHY 59. Tympole: PAC 31, SHO 25, PAS 30, DRI 41, DEF 31, PHY 32. Scale 0 to 99.",
    );
    expect(screen.getByTestId("dossier-compare-legend").textContent).toBe(
      "Dewott (solid)Basculin (dashed)Tympole (dotted)",
    );
  });

  it("hides Compare with ratings off but keeps Prev and Next (blind challenges hide the radar)", () => {
    render(<OffersHarness showRatings={false} />);
    expect(screen.queryByRole("button", { name: "Compare offers" })).toBeNull();
    expect(screen.getByRole("button", { name: "Next offer" })).toBeTruthy();
  });

  it("shows no offer tabs without offers (builder and results dossiers; regression guard, no RED: behaviour already correct)", () => {
    render(<ScoutingDossier speciesId={25 as SpeciesId} showRatings={true} onClose={vi.fn()} />);
    expect(screen.queryByTestId("dossier-offer-count")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next offer" })).toBeNull();
  });
});
