// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlayerImage, StaticPlayerImage } from "@/components/PlayerImage";
import { writeSettings } from "@/images/settings";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("PlayerImage", () => {
  it("renders the default pixel pack as a lazy, async, pixelated <img> of the requested size", () => {
    render(<PlayerImage dexId={25} size={36} alt="Pikachu" />);
    const img = screen.getByAltText("Pikachu") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/creatures/pokeapi-pixel/0025.png");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("width")).toBe("32");
    expect(img.getAttribute("height")).toBe("32");
    expect(img.style.imageRendering).toBe("pixelated");
    expect(screen.getByTestId("player-image").style.width).toBe("36px");
  });

  it("loads eagerly when asked (wheel and export)", () => {
    render(<PlayerImage dexId={25} size={32} alt="Pikachu" eager />);
    expect(screen.getByAltText("Pikachu").getAttribute("loading")).toBe("eager");
  });

  it("uses the pack prop first, and art packs are not pixelated", () => {
    writeSettings({ pack: "pokeapi-pixel" });
    render(<PlayerImage dexId={25} size={40} alt="Pikachu" pack="pokeapi-art" />);
    const img = screen.getByAltText("Pikachu") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/creatures/pokeapi-art/0025.webp");
    expect(img.style.imageRendering).not.toBe("pixelated");
    expect(img.getAttribute("width")).toBe("40");
  });

  it("follows the user's saved pack and re-renders when it changes", () => {
    writeSettings({ pack: "pokeapi-art" });
    render(<PlayerImage dexId={6} size={40} alt="Charizard" />);
    expect(screen.getByAltText("Charizard").getAttribute("src")).toBe(
      "/creatures/pokeapi-art/0006.webp",
    );
    act(() => writeSettings({ pack: "pokeapi-pixel" }));
    expect(screen.getByAltText("Charizard").getAttribute("src")).toBe(
      "/creatures/pokeapi-pixel/0006.png",
    );
  });

  it("falls back to the blank square with the same footprint when the id is not in the pack", () => {
    render(<PlayerImage dexId={9999} size={44} alt="Unknown" />);
    expect(screen.queryByRole("img", { hidden: true, name: "Unknown" })).not.toBeNull();
    expect(document.querySelector("img")).toBeNull();
    const box = screen.getByTestId("player-image");
    expect([box.style.width, box.style.height]).toEqual(["44px", "44px"]);
    expect(box.getAttribute("data-fallback")).toBe("missing");
  });

  it("falls back to the blank square when the file fails to load", () => {
    render(<PlayerImage dexId={25} size={36} alt="Pikachu" />);
    fireEvent.error(screen.getByAltText("Pikachu"));
    expect(document.querySelector("img")).toBeNull();
    const box = screen.getByTestId("player-image");
    expect([box.style.width, box.style.height]).toEqual(["36px", "36px"]);
    expect(box.getAttribute("data-fallback")).toBe("error");
  });
});

describe("StaticPlayerImage (satori renderers)", () => {
  it("draws the given source with fixed dimensions and needs no hooks", () => {
    render(
      <StaticPlayerImage dexId={25} size={52} alt="Pikachu" src="data:image/png;base64,AAAA" />,
    );
    const img = screen.getByAltText("Pikachu");
    expect(img.getAttribute("src")).toBe("data:image/png;base64,AAAA");
    expect(img.getAttribute("width")).toBe("52");
  });
  it("draws the blank square when there is no source", () => {
    render(<StaticPlayerImage dexId={25} size={52} alt="Pikachu" src={null} />);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByTestId("player-image").getAttribute("data-fallback")).toBe("missing");
  });
});
