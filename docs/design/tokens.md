# Pokedraft warm theme tokens

## Authority and installation

The verbatim source is [theme-source-biotraxiq.md](theme-source-biotraxiq.md). `src/design/tokens.css` installs section 3 unchanged, then mirrors the dark blocks under `prefers-color-scheme: dark` with an explicit-light exclusion. Game roles and compatibility aliases follow in the same token file. The user's mobile typography overrides take precedence over the source's desktop type sizes.

Inter is the only web font family, loaded with next/font at 400, 600 and 700, display swap and its metric-matched Arial fallback. Next's verified metrics are size-adjust 107.12%, ascent 90.44%, descent 22.52%, line gap 0%. Figures inherit tabular numerals globally. Controls retain a 44 px minimum and text inputs use 16 px to avoid iOS zoom.

## Accessibility corrections and role boundaries

All four source AA corrections remain: light viz-2, dark accent-hover, explicit chart tick text-soft and the light/dark heat ceilings. The source explicitly permits darkening border-control after verification. Its original light value measures 2.7946:1 on surface, so the installed override is `#7C856F`.

Ordinary text roles are checked on canvas and all three module surfaces. Action foreground is checked on both action fills; status text is checked on its status background. This preserves semantic pairings: pale button text is never treated as ordinary text on a pale module.

Viz-1 through viz-7 and risk-mark are checked at 3:1 on surface. Viz-8 is the source's heat-fill-only sand, which measures 1.6524:1 on light surface and cannot be an independent mark. Color lint forbids using it in application components. The contrast gate checks the numbers on its permitted heat fills at both endpoints. Decorative navigation glyphs repeat their adjacent text labels; they use the source's 14% icon-tile tint and are hidden from assistive technology.

Dark accent reaches only 2.6993:1 against surface, despite its passing foreground text. The primary button therefore has a palette-derived link-colored boundary in dark. The shared focus role uses link, which passes on all page surfaces; pitch focus uses the warm pitch line. This keeps a visible AA boundary without changing the exact source accent values.

## Game roles

| Role | Light | Dark | Purpose and check |
| --- | --- | --- | --- |
| pitch | `#476147` | `#2D4431` | Muted moss/logo-green field; warm line and name text are checked against it |
| pitch-stripe | `#496349` | `#2E4632` | Relative luminance steps 4.6141% and 5.6486%; enforced within 4 to 6% |
| pitch-line | `#F3EFE4` | `#F3EFE4` | Warm off-white, no pure white; solid field markings and state boundaries pass 3:1 |
| pitch-line-soft | `rgba(243,239,228,.34)` | same | Decorative goal fill; the goal's informative outline uses the solid line token |
| risk-text | `#913D35` | `#E3A197` | Derived from risk-mark, for small loss/weakness text where the mark color alone fails AA |
| action-border | accent | link | Primary action boundary reaches 3:1 on surface |
| focus | link | link | Text/control focus on page surfaces; pitch supplies its own warm line |

The pitch frame will use surface-emphasis, border-emphasis and shadow-raised. That application belongs to the draft/pitch restyle. Wins use ok-text/ok-bg/ok-border, draws use neutral surfaces and text, and losses use the risk family.

Type chips use an 18-color muted palette, a 999 px pill radius, 16% tinted surface background and a matching text/border color. The contrast gate checks the entire allowed tint range, including 14% and 18%. Hue and lightness are derived from the plum, clay, moss, slate, teal and risk families; saturation is capped at 48%. The old saturated type colors are retired.

## Color-blindness verification

The [comparison sheet](../reports/dispatch-8/cvd/type-palette.svg) shows all eighteen labeled chips side by side in normal vision, protanopia and deuteranopia, in both themes. The simulation uses the [Machado, Oliveira and Fernandes severity-one matrices](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) in linear sRGB. Separation uses Euclidean Oklab distance, scaled by 100, following the color-space equations in [W3C CSS Color 4](https://www.w3.org/TR/css-color-4/#color-conversion-code).

The engineering guard requires every pair to retain at least 4.0 on that scale in each simulation. This is a regression threshold, not a claim that a simulation substitutes for a user's vision. Measured minima: light normal 4.7158, protanopia 4.2112, deuteranopia 4.0846; dark normal 4.1170, protanopia 4.0005, deuteranopia 4.0014. Each chip also keeps its type name, so its identity does not depend on hue. The [raw report](../reports/dispatch-8/cvd/report.json) identifies the closest pairs.

## Compatibility and retirement

Existing night/bg/panel/ink/flood/grass tokens resolve to the new semantic roles during the page-by-page migration. The mapping is recorded in [dispatch-8.md](../decisions/dispatch-8.md). The 1200x630 card and OG renderer use the source light palette in `src/design/card-tokens.ts`, with bundled Inter400/600/700. Its score, record and formation use explicit tabular digit cells because the static font subset has proportional advances. The content and image model are preserved.

## CI commands

- `pnpm check:theme-contrast`: text at 4.5:1, marks and control boundaries at 3:1, all type-pill tint endpoints and pitch stripe steps.
- `pnpm check:theme-colors`: no stray hex colors in application code; sand is reserved for heat fills.
- `pnpm check:theme-cvd`: all eighteen colors, both themes, both red-green deficiency simulations.

Ratios below are unrounded during validation. Displayed rounding never turns a failure into a pass.

## Type palette

| Role | Light | Dark | Lowest pill text ratio |
| --- | --- | --- | ---: |
| --type-normal | #363126 | #BBA986 | 4.8964 |
| --type-fighting | #764257 | #D1BF99 | 5.4020 |
| --type-flying | #10102D | #BAB0E3 | 5.4144 |
| --type-poison | #3D3248 | #D3BAD8 | 5.9362 |
| --type-ground | #2A2713 | #CEB173 | 5.3146 |
| --type-rock | #474E2C | #DDE3B0 | 6.0127 |
| --type-bug | #2D4418 | #C7CE73 | 6.1854 |
| --type-ghost | #3C3088 | #99A4D1 | 4.6756 |
| --type-steel | #384D9F | #CEEBEE | 5.3116 |
| --type-fire | #6C584B | #D9D792 | 4.7330 |
| --type-water | #202A5B | #CED7EE | 6.9117 |
| --type-grass | #32483D | #5BC355 | 5.0229 |
| --type-electric | #5A5B20 | #ECEECE | 4.9860 |
| --type-psychic | #7F3974 | #EECECF | 5.2776 |
| --type-ice | #10212D | #61B8A6 | 4.8192 |
| --type-dragon | #1D1844 | #A8B0C2 | 5.1056 |
| --type-dark | #2D1310 | #F6F6EF | 8.4076 |
| --type-fairy | #71286E | #D8BDBA | 5.9768 |

## Lowest checked ratio per role

| Role | Ratio | Context | Required |
| --- | ---: | --- | ---: |
| --text | 4.6588 | dark / viz-8 heat fill 0.48 | 4.5 |
| --text-soft | 9.4882 | light / --canvas | 4.5 |
| --text-muted | 5.1997 | dark / --surface-sunken | 4.5 |
| --text-faint | 4.7621 | dark / --surface-sunken | 4.5 |
| --link | 5.2461 | light / --canvas | 4.5 |
| --accent-fg | 5.4338 | dark / --accent | 4.5 |
| --ok-text | 6.8367 | light / --ok-bg | 4.5 |
| --risk-text | 5.2916 | light / risk pill tint | 4.5 |
| --viz-1 | 3.4111 | light / --surface | 3 |
| --viz-2 | 3.0074 | light / --surface | 3 |
| --viz-3 | 3.3006 | light / --surface | 3 |
| --viz-4 | 3.8467 | light / --surface | 3 |
| --viz-5 | 3.0490 | light / --surface | 3 |
| --viz-6 | 3.9148 | light / --surface | 3 |
| --viz-7 | 3.4397 | light / --surface | 3 |
| --risk-mark | 4.4794 | dark / --surface | 3 |
| --border-control | 3.5158 | light / --surface | 3 |
| --focus | 5.8131 | light / --surface | 3 |
| --action-border | 7.9809 | light / --surface | 3 |
| --type-normal | 4.8964 | dark / type pill 0.18 | 4.5 |
| --type-fighting | 5.4020 | light / type pill 0.18 | 4.5 |
| --type-flying | 5.4144 | dark / type pill 0.18 | 4.5 |
| --type-poison | 5.9362 | dark / type pill 0.18 | 4.5 |
| --type-ground | 5.3146 | dark / type pill 0.18 | 4.5 |
| --type-rock | 6.0127 | light / type pill 0.18 | 4.5 |
| --type-bug | 6.1854 | dark / type pill 0.18 | 4.5 |
| --type-ghost | 4.6756 | dark / type pill 0.18 | 4.5 |
| --type-steel | 5.3116 | light / type pill 0.18 | 4.5 |
| --type-fire | 4.7330 | light / type pill 0.18 | 4.5 |
| --type-water | 6.9117 | dark / type pill 0.18 | 4.5 |
| --type-grass | 5.0229 | dark / type pill 0.18 | 4.5 |
| --type-electric | 4.9860 | light / type pill 0.18 | 4.5 |
| --type-psychic | 5.2776 | light / type pill 0.18 | 4.5 |
| --type-ice | 4.8192 | dark / type pill 0.18 | 4.5 |
| --type-dragon | 5.1056 | dark / type pill 0.18 | 4.5 |
| --type-dark | 8.4076 | dark / type pill 0.18 | 4.5 |
| --type-fairy | 5.9768 | dark / type pill 0.18 | 4.5 |
| --pitch-line | 5.7764 | light / --pitch-stripe | 3 |

## Static share renderer

`src/design/card-tokens.ts` mirrors the light palette for Satori, which cannot resolve CSS variables. Its canvas, surface, emphasis, sunken, border, action/foreground, ok, pitch/stripe and warm line values are identical to the checked CSS roles. Card names use accent-fg on accent; body/figures use text or muted on canvas; the Team Score action uses accent-fg on accent. The same contrast roles apply. The 1200x630 renderer uses only Inter400/600/700 with local licensed subsets; next/font remains the sole browser family. No calculations, content or image pack pixels changed.

### Final type application

Module h1 uses source `clamp(1.3rem, 2vw, 1.9rem)`; h2 uses the mobile17/23 anddesktop15/21 overrides. Browserfigures inherit tabular numerals. The static PNG renderer uses Inter with equal0.67em digit cells for score, record andformation, because its text doesnot inherit browserCSS. Sharecontent/size/models stay unchanged.
