# BiotraxIQ Inventory Theme: porting guide for another site

Hand this file to the agent applying the theme. Every value below was measured from the production BiotraxIQ `/inventory` page with computed styles, plus four accessibility corrections (marked **AA**). Apply the values exactly. Do not invent new colors, sizes or radii.

## 1. What the theme is

A dense, calm analytics surface: warm green-grey canvas, tan module cards, small 11 px workhorse type, tabular figures, muted multi-hue chart palette, and colored icon tiles that match the navigation. It reads like a premium procurement or finance tool, not a marketing site.

Ten principles carry the look. Tokens alone will not reproduce it.

1. **Modules, not tiles.** Content sits in titled module cards: eyebrow, title, one-line description, then body. Do not use rows of KPI stat cards at the top of a page; put figures inside modules, tables and charts.
2. **Small, dense type.** 11 px for labels, values, cells and tooltips; 10 px for sublabels and footnotes; 15 px module titles. Big numbers are the exception.
3. **Tabular numbers everywhere.** `font-variant-numeric: tabular-nums` on every figure, cell and axis.
4. **Warm palette, one accent family.** Teal for data, link and eyebrow; deep logo green for the primary action. No other saturated brand color.
5. **Quiet depth.** A faint resting shadow on cards, a stronger one only on tooltips and the single emphasized module.
6. **Tight rhythm.** 16 px between modules, 16 px module padding, 37 px table rows.
7. **Icons are colored and boxed.** A 28 px tile with the glyph's color at 14% opacity behind it. The page-header icon equals that page's navigation icon.
8. **Hover explains.** Every chart mark and heat cell has a tooltip with title, key/value rows and a source line.
9. **Honest empty states.** Missing data shows "Unavailable" in a neutral style, never `0` or a blank. In per-item views, omit optional fields that have no value instead of listing them as Unavailable.
10. **Clean copy.** One headline per page (no repeated headings), no raw internal codes or IDs in UI text, no em dashes, money as `$3.99M` at $1M and above and `$600K` below.

## 2. Font

- Family: **Inter** only (Google Fonts, weights 400, 600, 700). No second display or mono face.
- Weights in use: 400 body, 600 titles and labels, 700 eyebrows, pills and table totals.
- Enable `tabular-nums` globally on numeric elements.

## 3. Tokens (paste-ready CSS)

```css
:root {
  /* Surfaces */
  --canvas: #E7EAE2;
  --surface: #F8F4EB;            /* module card */
  --surface-emphasis: #FBF8F1;   /* one dominant module per page, at most */
  --surface-sunken: #F2ECE0;     /* bar tracks, zero heat cell, table header (use at 70%) */

  /* Borders */
  --border: #DCDFD2;             /* card border */
  --border-soft: #E6E8DC;        /* inner dividers, list rules, icon tile outline */
  --border-strong: #CCD2C0;      /* tooltip, neutral pill */
  --border-emphasis: rgba(13,148,136,.30);
  --border-control: #8E9684;     /* inputs: must hold 3:1 against --surface; verify, adjust darker if not */

  /* Text */
  --text: #1E2419;               /* titles, labels, figures */
  --text-soft: #353B30;          /* row values, body copy */
  --text-muted: #565D52;         /* descriptions */
  --text-faint: #5C6256;         /* meta, column headers, axis ticks */
  --link: #096B62;               /* links, eyebrows, provenance lines */

  /* Action */
  --accent: #2E5240;             /* primary button fill, focus ring */
  --accent-hover: #243F2F;
  --accent-fg: #F3F7F2;
  --selected: #D6E5DB;           /* active nav item */

  /* Status */
  --ok-text: #1F5A41; --ok-bg: #E3EFE6; --ok-border: #BBD7C4;
  --info-bg: #E4EDF3;
  --warn-bg: #F4ECDA;
  --risk-mark: #BD4A40;

  /* Data / icon palette */
  --viz-1: #0D9488;  /* primary bars */
  --viz-2: #CD7928;  /* amber line / high risk (AA: replaces #D98A3D in light) */
  --viz-3: #3E9488;  /* teal */
  --viz-4: #8A7396;  /* plum */
  --viz-5: #B08454;  /* clay */
  --viz-6: #6B7C8C;  /* slate */
  --viz-7: #6E8C5A;  /* moss, low risk */
  --viz-8: #C8C19E;  /* sand, moderate risk (heat fill only, never a line) */

  /* Shape */
  --radius-lg: 14px;   /* module card */
  --radius-md: 10px;   /* tile */
  --radius-sm: 8px;    /* tooltip, button, stat well */
  --radius-icon: 7px;  /* icon tile */
  --radius-xs: 5px;    /* heat cell, bar end */

  /* Elevation */
  --shadow-rest: 0 1px 2px rgba(31,40,28,.04), 0 1px 3px rgba(31,40,28,.05);
  --shadow-raised: 0 6px 24px rgba(31,40,28,.08), 0 2px 6px rgba(31,40,28,.05);
}

:root[data-theme="dark"] {
  --canvas: #14180F;
  --surface: #1E241A;
  --surface-emphasis: #222820;
  --surface-sunken: #262D20;
  --border: #313A2A;
  --border-soft: #28311F;
  --border-strong: #404B36;
  --border-emphasis: rgba(45,183,167,.32);
  --text: #EDF0E4;
  --text-soft: #D2D8C5;
  --text-muted: #97A086;
  --text-faint: #8F9981;
  --link: #5FD6C7;
  --accent: #3F6E54;
  --accent-hover: #365F49;       /* AA: the original #4C8364 failed 4.5:1 */
  --accent-fg: #F3F7F2;
  --selected: #1C382F;
  --ok-text: #79C8A0; --ok-bg: #15271D; --ok-border: #2C4636;
  --info-bg: #13222D;
  --warn-bg: #28220F;
  --risk-mark: #D5675C;
  --viz-1: #2DB7A7; --viz-2: #E0A05A; --viz-3: #4FB3A5; --viz-4: #A78CB3;
  --viz-5: #C79A66; --viz-6: #8696A6; --viz-7: #85A86A; --viz-8: #BFBA94;
  --shadow-rest: 0 1px 2px rgba(0,0,0,.30), 0 1px 3px rgba(0,0,0,.24);
  --shadow-raised: 0 8px 28px rgba(0,0,0,.42), 0 2px 8px rgba(0,0,0,.30);
}

body { background: var(--canvas); color: var(--text-soft); font-family: Inter, system-ui, sans-serif; }
```

If the site uses `prefers-color-scheme`, mirror the dark block under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`.

## 4. Type scale

| Role | Size / line height | Weight | Extras | Color |
|---|---|---|---|---|
| Eyebrow (above module title) | 10 / 15 | 700 | uppercase, 0.16em tracking | `--link` |
| Module title (h2) | 15 / 21 | 600 | -0.015em | `--text` |
| Module description | 11 / 17.875 | 400 | | `--text-muted` |
| Label, row label, tile title | 11 / 14.85 | 600 | | `--text` |
| Row value | 11 / 14.85 | 400 | tabular | `--text-soft` |
| Table column header | 11 / 13.75 | 600 | uppercase, 0.06em | `--text-faint` |
| Table total cell | 11 / 14.85 | 700 | tabular | `--text` |
| Meta, axis tick | 11 (10 for SVG ticks) | 400 | | `--text-faint` |
| Sublabel, footnote | 10 / 15 (footnote 16.25) | 400 | | muted or faint |
| Pill / tag | 10 / 15 | 700 | uppercase, 0.08em | status text on status bg |
| Action title | 13 / 17.875 | 600 | | `--text` |
| Button | 13 / 18.85 | 600 | | `--accent-fg` on `--accent` |
| Big figure | 24.8 / 1 | 600 | -0.02em, tabular | `--text` |
| Small figure | 18.4 / 1 | 600 | tabular | `--text` |

Page title (h1, one per page): `clamp(1.3rem, 2vw, 1.9rem)`, 600, `--text`.

## 5. Components

**Module card**
- `background: var(--surface)`, 1 px `--border`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-rest)`.
- Header: 12 px block and 16 px inline padding, bottom rule 1 px `--border-soft`. It holds the eyebrow, title, description, and right-aligned meta.
- Body: 16 px padding. Gaps inside: 12, 8 or 6 px.
- Emphasis variant: at most one per page. Uses `--surface-emphasis`, 1 px `--border-emphasis` and `--shadow-raised`.
- Quiet variant: transparent background, no border.

**Grid**
- Modules sit in a CSS grid with a 16 px gap on both axes.
- Do not stretch a short module across the full width. Size modules to their content, typically half or third columns on desktop and one column at 390 px.

**Tile** (inside a module)
- `--radius-md`, 10 px by 12 px padding, `--surface-sunken` or `--surface` with `--shadow-rest`.

**Icon tile**
- 28 x 28 px, `--radius-icon`, 1 px `--border-soft`.
- Fill: `color-mix(in srgb, <glyph color> 14%, transparent)`, or the matching status background.
- Glyph: lucide icon, 14 px, stroke 2, in a palette color (`--viz-*` or a status color).
- Assign one color per navigation family and use the same icon and color in the page header.

**Pill**
- `border-radius: 999px`, tag type, `--ok-*`, `--info-bg`, `--warn-bg` or neutral (`--surface-sunken` with `--border-strong`).

**Table**
- Rows 37 px (47 px when a row wraps to two lines), 1 px `--border-soft` row rules.
- Header row `--surface-sunken` at 70%.
- Cell padding 4 px inline, 8 px on the first and last column.
- Numbers right-aligned and tabular. Sentence-case body cells, uppercase headers.

**List row**
- 10 px block padding, `--border-soft` rule.
- A trailing lucide `arrow-right` at 14 px, muted, turning `--link` on hover.

**Primary button**
- `--accent` fill, `--accent-fg` text, `--radius-sm`, button type, `--accent-hover` on hover. Focus ring in `--accent`.

**Links**
- `--link`, weight 600 at 11 px inside modules.

**Tooltip**
- Panel `--surface`, 1 px `--border-strong`, `--radius-sm`, 10 by 12 px padding, `--shadow-raised`.
- Title: 11/600 `--text`. Keys: 11/400 `--text-muted`. Values: 11/600 `--text`.
- Source or provenance line: 10/400 `--link`.

**Empty or Unavailable state**
- Neutral sunken background, `--border-strong`, `--text-muted` copy that names why the data is missing. Never a zero, never a red error style for missing data.

## 6. Charts (Recharts or equivalent)

- Primary bars: `--viz-1`, end radius `0 5 5 0` for horizontal bars. Bar tracks are `--surface-sunken`, 8 px high, full radius.
- Cumulative or secondary line: `--viz-2`, 2 px stroke, dots r 3.
- Grid and axis: `--border-soft`, dash `3 4`. Ticks: 10 px `--text-faint`, tabular.
- **AA:** set tick label fill explicitly to `--text-soft`. Recharts defaults to `#666666`, which fails contrast on the dark card.
- Category series order: `--viz-1`, `--viz-3`, `--viz-4`, `--viz-5`, `--viz-6`, `--viz-7`.
- Charts always sit on a card (`--surface`), never directly on the canvas. Several marks fall under 3:1 on the canvas.
- **Heat cells** (matrix or heatmap):
  - Fill: `color-mix(in srgb, <series color> p, var(--surface))`.
  - Light: `p = 16% + 62% x value/max` (ceiling 78%). Dark: `p = 16% + 32% x value/max` (ceiling 48%). These caps are **AA**: higher values make the cell number unreadable.
  - Zero renders `--surface-sunken`. Missing renders a 135deg hatch in `--border-soft`.
  - Cell number: 11/600 `--text`. Cell: 28 px tall, `--radius-xs`.
  - Risk series colors: critical `--risk-mark`, high `--viz-2`, moderate `--viz-8`, low `--viz-7`.

## 7. Accessibility (binding)

- WCAG AA: 4.5:1 for text, 3:1 for chart marks and control borders.
- The four **AA** corrections above are mandatory. Do not copy the original values back.
- Keep a visible focus ring, keyboard access to every tooltip trigger, and `prefers-reduced-motion` respected.

## 8. Instructions for the applying agent

1. **Explore first.** Before editing, list the target site's styling system (CSS variables, Tailwind config, component library), its fonts, chart library, layout grid and every page. Report the mapping from its existing tokens to section 3's names.
2. **Install the tokens once.** Put section 3 in the global stylesheet, or map it into `tailwind.config` `theme.extend` (colors, borderRadius, boxShadow, fontSize). Load Inter. Turn on `tabular-nums` for numeric classes.
3. **Build the primitives.** ModuleCard (with header slots), IconTile, Pill, Table, Tooltip, StatusNote (Unavailable) and a nav icon registry that both the sidebar and page headers read.
4. **Restyle page by page.**
   - Replace top-of-page KPI card rows with modules.
   - Keep every number, calculation and data source unchanged. This is presentation only.
   - Remove debug or internal-ID text from the UI.
5. **Verify each page.**
   - Screenshot at 1440 px and 390 px in light and dark.
   - Check contrast of every text role on every surface, plus chart marks on the card.
   - Grep the rendered text for em dashes and raw codes.
   - Confirm no figure changed versus before.
6. **Do not:**
   - add a second font, gradients, or saturated brand colors outside the palette;
   - use large rounded "button" style KPI blocks or a card inside a card beyond tiles;
   - render missing data as 0;
   - stretch a module wider than its content needs.
