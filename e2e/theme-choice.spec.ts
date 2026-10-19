import { expect, test } from "@playwright/test";

for (const system of ["light", "dark"] as const)
  test(`theme toggle remembers explicit choice and Auto follows ${system} preference`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: system });
    await page.goto("/");
    const root = page.locator("html");
    await page.getByRole("button", { name: "Theme: auto. Change theme", exact: true }).click();
    await expect(root).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Theme: night. Change theme", exact: true }).click();
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(231, 234, 226)");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Theme: day. Change theme", exact: true }),
    ).toBeVisible();
    await expect(root).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("pokedraft:theme"))).toBe('"light"');
    await page.getByRole("button", { name: "Theme: day. Change theme", exact: true }).click();
    // Auto writes the theme it resolved to, so the boot script and the toggle agree on one value.
    await expect(root).toHaveAttribute("data-theme", system);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      system === "light" ? "rgb(231, 234, 226)" : "rgb(11, 18, 32)",
    );
    await page.emulateMedia({ colorScheme: system === "light" ? "dark" : "light" });
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      system === "light" ? "rgb(11, 18, 32)" : "rgb(231, 234, 226)",
    );
    await expect(root).toHaveAttribute("data-theme", system === "light" ? "dark" : "light");
  });
