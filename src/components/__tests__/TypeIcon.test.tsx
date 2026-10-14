// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TYPES } from "@/data/pokedex";
import { TypeIcon } from "../TypeIcon";
import { typeLabel } from "@/ui/labels";

afterEach(cleanup);

describe("TypeIcon", () => {
  it("renders with correct accessibility label and title for fire", () => {
    render(<TypeIcon type="fire" size={16} />);
    const icon = screen.getByRole("img", { name: "Fire" });
    expect(icon).toBeTruthy();
    expect(icon.getAttribute("title")).toBe("Fire");
    expect(icon.style.border).toContain("1.5px solid");
  });

  it("renders distinct icons for all 18 Pokemon types", () => {
    for (const type of TYPES) {
      const { container, unmount } = render(<TypeIcon type={type} size={15} />);
      const icon = screen.getByRole("img", { name: typeLabel(type) });
      expect(icon).toBeTruthy();
      expect(container.querySelector("svg")).toBeTruthy();
      unmount();
    }
  });

  it("supports custom size and className", () => {
    render(<TypeIcon type="water" size={24} className="custom-icon" />);
    const icon = screen.getByRole("img", { name: "Water" });
    expect(icon.classList.contains("custom-icon")).toBe(true);
    expect(icon.style.width).toBe("24px");
    expect(icon.style.height).toBe("24px");
  });
});
