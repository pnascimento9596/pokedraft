import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { Gamepad2 } from "lucide-react";
import AxeBuilder from "@axe-core/playwright";
import {
  IconTile,
  ListRow,
  ModuleCard,
  Pill,
  PrimaryButton,
  Sheet,
  StatusNote,
  Table,
  Tooltip,
} from "../src/components/ui/primitives";

const examples = {
  module: (
    <ModuleCard eyebrow="Your squad" title="Team Score" description="The current lineup" meta="593">
      <p>Synergy 12</p>
    </ModuleCard>
  ),
  emphasis: (
    <ModuleCard
      variant="emphasis"
      eyebrow="Your squad"
      title="Pitch"
      description="Sixteen players, one team"
    >
      <p>Formation 4-3-3</p>
    </ModuleCard>
  ),
  quiet: (
    <ModuleCard
      variant="quiet"
      eyebrow="Getting started"
      title="Play"
      description="Choose your next challenge"
    >
      <p>Build a team.</p>
    </ModuleCard>
  ),
  icon: <IconTile icon={Gamepad2} />,
  pill: (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Pill>Draw</Pill>
      <Pill tone="ok">Win</Pill>
      <Pill tone="risk">Loss</Pill>
      <Pill tone="info">Friendly</Pill>
      <Pill tone="warn">In progress</Pill>
    </div>
  ),
  table: (
    <Table>
      <caption>Leaderboard</caption>
      <thead>
        <tr>
          <th scope="col">Player</th>
          <th scope="col" data-numeric>
            Team Score
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Misty</th>
          <td data-numeric>845</td>
        </tr>
      </tbody>
    </Table>
  ),
  tooltip: (
    <Tooltip
      label="Synergy details"
      title="Synergy"
      rows={[{ key: "Score", value: 12 }]}
      source="Current lineup"
    />
  ),
  status: <StatusNote>No runs have been saved in this browser.</StatusNote>,
  list: (
    <ListRow href="/history" trailing={<Pill>3 runs</Pill>}>
      History
    </ListRow>
  ),
  button: <PrimaryButton>Play Friendly</PrimaryButton>,
  sheet: (
    <Sheet open title="Pick for GK">
      <ListRow>Bulbasaur</ListRow>
      <PrimaryButton>Choose player</PrimaryButton>
    </Sheet>
  ),
};

for (const width of [390, 1440])
  for (const theme of ["light", "dark"] as const) {
    test.describe(`${width} ${theme}`, () => {
      test.use({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
        reducedMotion: "reduce",
        deviceScaleFactor: 1,
      });
      for (const [name, example] of Object.entries(examples)) {
        test(`${name} visual and accessible contract`, async ({ page }, info) => {
          test.skip(
            info.project.name !== "chromium",
            "primitive gallery uses the desktop renderer at both required widths",
          );
          await page.goto("/", { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          const html = renderToStaticMarkup(example);
          await page.locator("main").evaluate((element, content) => {
            element.innerHTML = `<h1 class="visually-hidden">Theme component</h1><div id="primitive-fixture" style="max-width:640px;margin:80px auto 0">${content}</div>`;
          }, html);
          const fixture =
            name === "sheet"
              ? page.getByRole("dialog", { name: "Pick for GK" })
              : page.locator("#primitive-fixture");
          if (name === "tooltip") {
            await page.keyboard.press("Tab");
            await page.getByRole("button", { name: "Synergy details" }).focus();
            await expect(page.getByRole("tooltip")).toBeVisible();
            await expect(page.locator("main")).toHaveScreenshot(`tooltip-${width}-${theme}.png`, {
              maxDiffPixelRatio: 0.025,
            });
          } else {
            await expect(fixture).toHaveScreenshot(`${name}-${width}-${theme}.png`, {
              maxDiffPixelRatio: 0.025,
            });
          }
          if (name === "button")
            expect(
              await page
                .getByRole("button", { name: "Play Friendly" })
                .evaluate((el) => el.getBoundingClientRect().height),
            ).toBeGreaterThanOrEqual(44);
          if (name === "table")
            expect(
              await page.locator("tbody tr").evaluate((el) => el.getBoundingClientRect().height),
            ).toBeGreaterThanOrEqual(width === 390 ? 44 : 37);
          const accessibility = await new AxeBuilder({ page })
            .options({
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
              },
            })
            .analyze();
          expect(
            accessibility.violations.map((violation) => ({
              id: violation.id,
              nodes: violation.nodes.map((node) => node.target),
            })),
          ).toEqual([]);
        });
      }
    });
  }
