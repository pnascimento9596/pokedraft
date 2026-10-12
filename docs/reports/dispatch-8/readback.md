# Dispatch 8 production readback

The complete warm theme is live at https://pokedraft-woad.vercel.app. This report records the final theme source merge `b6c9bb71f0f12ad56b37e5945c302712dc6388a7`. The documentation closeout PR follows these source and production checks; its own merge identity is recorded in the final lane readback.

## Shipped source PRs

Every source PR received GLM 5.3 Flash cloud review with `--think high`, an exact-head APPROVE and a verified random canary before a pinned squash merge. Full identities are retained in [the PR ledger](closeout/pr-ledger.json).

| PR | Area | Reviewed head | Squash merge |
| --- | --- | --- | --- |
| [#25](https://github.com/pnascimento9596/pokedraft/pull/25) | Health and measurement | `2eda683327f9ff7cd08cdf05b7f7e1211497b2b0` | `56b9f754d88388223725ad2f3512f239b18fd229` |
| [#26](https://github.com/pnascimento9596/pokedraft/pull/26) | Tokens, Inter and primitives | `89b390f0c4e1f7538c8166652d31cc05f91e6dbe` | `e8ce2d332824def968132287e07b8cbbe89b34c2` |
| [#27](https://github.com/pnascimento9596/pokedraft/pull/27) | Home and builder | `249a6dd5151bbe52899600ade150f0ca50a2a970` | `6e7d34e6071f21c976f875a0cbb1b7303407054e` |
| [#28](https://github.com/pnascimento9596/pokedraft/pull/28) | Draft and wheel | `6568b065043fe42d0739676c09c35ed6036b9067` | `bac8beafd762397a638903ae3bcd3e469ae47478` |
| [#29](https://github.com/pnascimento9596/pokedraft/pull/29) | Results and share | `e0c79031d063ee19c9cc84c17e94be0741699242` | `b3ab2c790007494e611918b13b3b5284832f6522` |
| [#30](https://github.com/pnascimento9596/pokedraft/pull/30) | Daily and leaderboard | `b47a8e3eaa80e9f68eafa4e66ad0d81f358833fa` | `f5e225626facc6a1d24fb8b0e5c9ee01e9821515` |
| [#31](https://github.com/pnascimento9596/pokedraft/pull/31) | Leaderboard footer CLS correction | `c8c4d58b66909e6e83c9725a8bf3f71970cc46b5` | `5199e56c10b14cca7e49b0229d86f37639047a75` |
| [#32](https://github.com/pnascimento9596/pokedraft/pull/32) | History, help, gate, 404 and final font geometry | `792c841146a3fcec7aa0304afb61810f57e24315` | `b6c9bb71f0f12ad56b37e5945c302712dc6388a7` |

## Verification

- Final exact-head GitHub Ubuntu CI: 735 unit/component tests in 80 files and 573 passing browser cases, one pass on retry and 51 existing skips (625 total). All static, build and image integrity gates pass.
- Final production: health proves the merge SHA and no-store before testing; live tests, unchanged mobile acceptance on iPhone SE/iPhone 14/Pixel 7, all eight formation guards, route axe/contrast/CLS checks, font HTML/network proof and figures are retained in [closeout receipts](closeout/README.md). The exact new verify-bot row is removed and readback confirms zero remaining rows.
- Results preserve 186 numeric values and leaderboard preserves 10 per theme for the same pinned input fixtures, including exact Team Score, record and board-row text. Engine/scouting/API behavior and all protected image paths remain unchanged, apart from the explicitly authorized health endpoint.
- SX-05 is a passing test with actual picture/name bounds across all formations and three devices. SX-02 ratings-on cold load and SX-06 saved-run reload are exactly zero at 360 and 390 px. Six board cold-load and four delayed-font guards also use strict zero without filtering.
- SX-03 enumerated sixteen rating-label mismatches and fixed their visible-label association. SX-04 was not reproduced in the 56-state enumeration; its positive control proved detection. No invented production fix is claimed.
- All individual final Lighthouse samples have Accessibility 100 and exact CLS 0.000. The original three route CLS guards still retain their inherited sub-0.001 filter; those guards alone do not establish exact zero.

## Token mapping

| Old role | Warm role |
| --- | --- |
| bg, night | canvas |
| panel, bg-raised | surface |
| bg-sunk | surface-sunken |
| line, line-strong, line-field | border, border-strong, border-control |
| ink, ink-soft, ink-faint | text, text-soft/text-muted, text-faint |
| flood/action/focus | accent and link families |
| grass and pitch frame | pitch, pitch-stripe, warm line tokens, emphasis surface/border/shadow |
| old type colors and result states | 18 muted type tokens and ok/neutral/risk families |

The exact source guide is committed in [theme-source-biotraxiq.md](../../design/theme-source-biotraxiq.md); [tokens.md](../../design/tokens.md) records derived tokens and contrast. The original light control border was measured below 3:1, so the source-authorized darker correction is applied. Pitch stripe luminance steps are 4.6141% light and 5.6486% dark. No extra brand palette, gradients beyond pitch stripes or web font family was added.

## Lowest measured contrast by role

Ratios are computed across the checked surfaces, status/type tints and heat cells in both themes. The full role report, including all eighteen types, is [contrast-foundation.json](contrast-foundation.json).

| Role | Lowest ratio | Pair | Minimum |
| --- | ---: | --- | ---: |
| `--text` | 4.6588:1 | dark, viz-8 heat fill 0.48 | 4.5:1 |
| `--text-soft` | 9.4882:1 | light, --canvas | 4.5:1 |
| `--text-muted` | 5.1997:1 | dark, --surface-sunken | 4.5:1 |
| `--text-faint` | 4.7621:1 | dark, --surface-sunken | 4.5:1 |
| `--link` | 5.2461:1 | light, --canvas | 4.5:1 |
| `--accent-fg` | 5.4338:1 | dark, --accent | 4.5:1 |
| `--ok-text` | 6.8367:1 | light, --ok-bg | 4.5:1 |
| `--risk-text` | 5.2916:1 | light, risk pill tint | 4.5:1 |
| `--viz-2` | 3.0074:1 | light, --surface | 3:1 |
| `--border-control` | 3.5158:1 | light, --surface | 3:1 |
| `--pitch-line` | 5.7764:1 | light, --pitch-stripe | 3:1 |

Viz-8 is a heat-fill color only. Its 1.6524:1 light ratio is not an independent mark pass; source lint prevents it being used as a line or ordinary glyph. Heat-cell numbers retain at least 4.6588:1 at the prescribed tint caps.

## Mobile Lighthouse before and after

Baseline [38130597740](https://github.com/pnascimento9596/pokedraft/actions/runs/38130597740) and final [38246671783](https://github.com/pnascimento9596/pokedraft/actions/runs/38246671783) each measure three mobile runs per route against production. Each reported value is the median of those three runs. Raw per-run values and individual Accessibility/CLS gates are retained in the workflow artifacts and summaries.

| Route | Performance before | After | LCP before, ms | After, ms | CLS before | After |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| home | 84 | 85 | 2265.0 | 2112.4 | 0.000 | 0.000 |
| play | 96 | 97 | 2420.8 | 2258.4 | 0.000 | 0.000 |
| daily | 85 | 85 | 2431.4 | 2237.8 | 0.000 | 0.000 |
| leaderboard | 76 | 77 | 3684.5 | 3529.6 | 0.000 | 0.000 |
| history | 98 | 96 | 1960.8 | 1956.6 | 0.000 | 0.000 |
| how-to-play | 97 | 95 | 2379.5 | 2108.7 | 0.000 | 0.000 |
| run | 73 | 76 | 3991.2 | 3760.9 | 0.000 | 0.000 |
| play-kanto151 | 83 | 88 | 2418.4 | 2109.8 | 0.000 | 0.000 |

Baseline and final have matching runner image/version, Node, CPU count, Lighthouse and Chrome.
| Environment | Baseline | Final |
| --- | --- | --- |
| runnerImage | ubuntu24 | ubuntu24 |
| runnerImageVersion | 20261004.327.1 | 20261004.327.1 |
| node | v22.23.3 | v22.23.3 |
| cpus | 4 | 4 |
| lighthouse | 13.5.0 | 13.5.0 |
| chrome | Google Chrome for Testing 156.0.8078.4 | Google Chrome for Testing 156.0.8078.4 |

Font foundation run [38150015655](https://github.com/pnascimento9596/pokedraft/actions/runs/38150015655) retains the intermediate production LCP measurements after Inter and primitives. These measurements include the foundation changes together; they are not an isolated causal font benchmark. Production HTML, styles and network receipts confirm Inter only, 400/600/700, swap and its local metric-matched fallback. Big Shoulders and Barlow are absent.

The failed intermediate Lighthouse run 38174354317 exposed leaderboard footer CLS 0.011626827583050482 in all three samples and was rejected. PR #31 reserved viewport geometry. PR #32 additionally corrected caption/native date font movement caught by Linux delayed-font guards; every final sample must pass exact zero.

## LCP after the Inter foundation

This intermediate measurement includes the font and primitive changes together. Each value is the median of three production mobile runs; it does not isolate a font-only causal effect.

| Route | Baseline LCP, ms | After foundation, ms |
| --- | ---: | ---: |
| home | 2265.0 | 2112.9 |
| play | 2420.8 | 2260.5 |
| daily | 2431.4 | 2382.3 |
| leaderboard | 3684.5 | 1812.3 |
| history | 1960.8 | 1659.0 |
| how-to-play | 2379.5 | 1808.4 |
| run | 3991.2 | 3688.0 |
| play-kanto151 | 2418.4 | 2262.0 |

Final median Performance changes are mixed: history falls from 98 to 96 and How to Play from 97 to 95. LCP medians are lower for every route, but history differs by only about 4 ms and is effectively unchanged. These are three-run observations, not statistical significance claims.

## Type color simulation

All eighteen type pills are checked with the Machado 2009 severity-1.0 protanopia and deuteranopia transforms in linear sRGB. There are 153 pairs per theme/view. The smallest Oklab distance times 100 is:

| Theme | Normal | Protanopia | Deuteranopia |
| --- | ---: | ---: | ---: |
| Light | 4.7158 | 4.2112 | 4.0846 |
| Dark | 4.1170 | 4.0005 | 4.0014 |

The script passes the documented separation threshold of 4.0 and checks AA text on the pill tint. Type names accompany colors. This simulated distance check is a design guard, not a universal claim about human perception. Inspect [the simulation image](cvd/type-palette.svg) and [full pair report](cvd/report.json).

## Screenshots and scope limits

[Before and after screenshot index](screenshots.md) links the production baseline, final production at both widths/themes, per-area paired captures and controlled empty/unavailable states. Final production manifests bind screenshots to the health SHA. Some earlier local area manifests did not record their exact build SHA; their limitation is disclosed in their README files.

### NOT RUN

- Physical iPhone/Android devices and native mobile keyboards. The three device profiles are browser emulation; inherited skips remain explicitly reported.
- Computer Use desktop UI actions. Its configuration and local MCP handshake were verified separately; Playwright provided this lane’s browser evidence.
- Render workspace selection, deliberately left unselected at the user’s request. Production shipping used Vercel.
- A standalone font-only causal benchmark. The baseline, foundation and final three-run measurements are retained with their actual scope.
- Human perception testing of the type palette beyond the documented color-vision simulation.

Architect was skipped because the dispatch fixed the design. Uninstalled portable playbook steps remain listed in the decision log. The lane follows the explore-first, literal-guard, figures-preserved, honest-state and exact-head-review principles; failed runs remain in the evidence trail.
