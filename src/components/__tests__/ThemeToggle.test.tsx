// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

const theme = () => document.documentElement.getAttribute("data-theme");
const metaColor = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = "#000000";
  document.head.replaceChildren(meta);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
  it("renders Auto on the server and the stored choice on the client's first render", () => {
    localStorage.setItem("pokedraft:theme", JSON.stringify("dark"));
    expect(renderToString(<ThemeToggle />)).toContain(">Auto</button>");
    render(<ThemeToggle />);
    expect(screen.getByRole("button").textContent).toBe("Night");
  });

  it("toggling updates the theme-color meta and resolves Auto to the OS scheme (catches a status bar left on the OS colour after an explicit choice)", () => {
    localStorage.setItem("pokedraft:theme", JSON.stringify("dark"));
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect([button.textContent, theme(), metaColor()]).toEqual(["Day", "light", "#E7EAE2"]);
    fireEvent.click(button);
    expect([button.textContent, theme(), metaColor()]).toEqual(["Auto", "dark", "#0B1220"]);
    expect(localStorage.getItem("pokedraft:theme")).toBe('"system"');
  });
});
