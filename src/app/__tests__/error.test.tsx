// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "../error";
import GlobalError from "../global-error";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Thrower(): ReactNode {
  throw new Error("boom");
}

class Boundary extends Component<{ children: ReactNode }, { failed: Error | null }> {
  state = { failed: null as Error | null };
  static getDerivedStateFromError(failed: Error) {
    return { failed };
  }
  render() {
    const { failed } = this.state;
    return failed === null ? this.props.children : <ErrorPage error={failed} retry={() => {}} />;
  }
}

describe("error boundary", () => {
  it("error boundary shows the saved copy with Reload and Home (catches a crash that leaves a blank page)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Boundary>
        <Thrower />
      </Boundary>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Something went wrong.");
    expect(screen.getByText("Your run is saved; reload to continue.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  });

  it("global error renders its own document with the same copy and inline styles only (catches a root layout crash with no page)", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("boom")} retry={() => {}} />);
    expect(html.startsWith("<html")).toBe(true);
    expect(html).toContain("<body");
    expect(html).toContain("Something went wrong.");
    expect(html).toContain("Your run is saved; reload to continue.");
    expect(html).toContain(">Reload</button>");
    expect(html).toContain('href="/"');
    expect(html).not.toMatch(/class="/);
  });
});
