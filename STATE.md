# STATE

Measured ground truth. Updated in the same PR as every merge.

| Field | Value | Source |
|---|---|---|
| Vercel linked | no | not set up in dispatch 1 |
| Species in `pokedex.json` | 1025 | `jq length src/data/pokedex.json`; PokéAPI CSVs pinned at c80757193bd0889054e36f4209762360bdaa4b95 |
| `scouting.json` sha256 | c3810aad4ec9c7df34f22afce574e277ae04640aacff4aaac7e8ca93620705f7 | `shasum -a 256 src/data/scouting.json` |
| Sanity panel | 42 of 42 pass | `pnpm vitest run src/scouting/__tests__/panel.test.ts` |
| Last reviewer | GLM 5.3 Flash (`glm-5.3-flash:cloud --think high`), dispatch 1 PR | receipt on the PR, pinned to the reviewed head SHA |
