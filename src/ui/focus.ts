/**
 * Moves focus to the page's main heading after a screen change without a route change, so a
 * keyboard or screen reader user starts on the new screen instead of on a button that is gone.
 * The heading takes focus from script only (tabindex -1) and the page does not scroll.
 */
export function focusHeading(): void {
  const heading = document.querySelector<HTMLElement>("h1");
  if (heading === null) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}
