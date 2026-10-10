// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackCredit } from "../PackCredit";
import { PACKS } from "@/images/packs";
import { writeSettings } from "@/images/settings";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  act(() => writeSettings({ pack: null }));
  window.localStorage.clear();
});

const pack = (id: string) => PACKS.find((p) => p.id === id)!;

describe("PackCredit", () => {
  it("credits the default pack's author and license from its pack.json, so the footer always names the art source", () => {
    render(<PackCredit />);
    const text = screen.getByTestId("pack-credit").textContent ?? "";
    expect(text).toContain(pack("pokeapi-pixel").author);
    expect(text).toContain(pack("pokeapi-pixel").license);
    expect(text).toContain("Pixel");
  });

  it("follows the pack the player picked", () => {
    render(<PackCredit />);
    act(() => writeSettings({ pack: "pokeapi-art" }));
    const text = screen.getByTestId("pack-credit").textContent ?? "";
    expect(text).toContain(pack("pokeapi-art").author);
    expect(text).toContain("Official art");
    expect(text).not.toContain("Smogon");
  });

  it("uses no em dash", () => {
    render(<PackCredit />);
    expect(screen.getByTestId("pack-credit").textContent).not.toContain("—");
  });
});
