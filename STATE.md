# STATE

Measured ground truth. Updated in the same PR as every merge.

| Field | Value | Source |
|---|---|---|
| Vercel linked | no | not set up in dispatch 1 |
| Species in `pokedex.json` | 1025 | `jq length src/data/pokedex.json`; PokéAPI CSVs pinned at c80757193bd0889054e36f4209762360bdaa4b95 |
| `scouting.json` sha256 | 5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775 | `shasum -a 256 src/data/scouting.json` |
| Sanity panel | 42 of 42 pass | `pnpm vitest run src/scouting/__tests__/panel.test.ts` |
| `type-chart.json` sha256 | acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1 | `shasum -a 256 src/data/type-chart.json`; PokéAPI `type_efficacy.csv` at the pinned commit |
| Engine version | `pokedraft-engine-1` | `ENGINE_VERSION` in `src/engine/types.ts` |
| Engine goldens | cup8 classic3 run (`golden-cup8`): token sha256 f3e0c9c617dcb00878b7ab31d29bcc3f6718ac19b0a713d507a911a4a0bd09a7, replay sha256 13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998; kanto151 run (`golden-kanto151`): token sha256 86a3fd6d55040d5702ae03edf6842b0b0b18ac3b159f3aff01689a034e8d249c, replay sha256 2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489; 20-run Team Score panel pinned | `src/engine/__tests__/goldens.test.ts` |
| Calibration (N 5,000 per row and bot, 0 errors) | 840±20: 3.5% flawless [3.1, 3.9], 6.03 wins; 900±20: 11.9% [11.2, 12.7]; 950±20: 30.0% [29.3, 30.6]; random kanto151 3.65 wins; good bot 811.5 (classic3) / 867.0 (open); misses: classic3 score below 840, best observed 963, builder-leg-off good > oracle | `pnpm calibrate --n 5000`, JSON sha256 7d37938d5c791cc0bb199ff2fb37356f7619a0457ecf50c58e28ad6fff5f08f1; `docs/calibration.md` |
| Last reviewer | GLM 5.3 Flash (`glm-5.3-flash:cloud --think high`), dispatch 2 PR #2 | receipt on the PR, pinned to the reviewed head SHA |
