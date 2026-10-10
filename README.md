# pokedraft

A private, non-commercial fan game for one friend group. Players draft Pokémon into a soccer
formation, get a Team Score, and play a cup.

Pokémon data comes from [PokéAPI](https://github.com/PokeAPI/pokeapi). Creature pictures come from
[PokeAPI/sprites](https://github.com/PokeAPI/sprites). Pokémon is a trademark of Nintendo,
Creatures, and Game Freak. This project is not affiliated with them.

See `CLAUDE.md` for the engineering contract and `STATE.md` for current measured state.

## Run

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

The game, builder and daily screens work without any environment variables. Anything that touches
the leaderboard database needs these (never commit them; `.env*` is git-ignored):

| Variable           | Used by                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`     | the leaderboard API and `pnpm db:*` scripts (Neon, pooled)                          |
| `IP_HASH_SECRET`   | keys the stored IP hash, at least 32 characters; submissions fail closed without it |
| `FRIENDS_PASSCODE` | optional, turns on the friends gate                                                 |

## Test

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # the CI ladder
pnpm test:e2e                                            # Playwright against `next start` on port 3400
pnpm check:image-seam && pnpm check:image-packs          # image guards (also in CI)
LIVE_URL=https://<deployment> pnpm test:live             # read-only checks against a deployment
```

## Import an image pack

Creature pictures live in packs under `public/creatures/<packId>/` (`pack.json` plus
`<dexId 4 digits>.<png|webp>`). `src/data/image-packs.json` is generated; never edit it by hand.

```sh
node scripts/images/import-pack.mjs \
  --src <folder of images> --pack <id> --style <pixel|art> \
  --author "<who made them>" --license "<license and credit text>" \
  [--label "<name in the picker>"] [--source "<where they came from>"] [--map <file,dexId csv>]
```

Files map to Dex ids by number or by exact English species name (or the CSV). Anything else is
reported as unmatched and never guessed. A rerun on the same source writes identical bytes. The
importer prints coverage and writes `docs/reports/image-pack-<id>.md`. `author` and `license` are
required and show in the site footer. Only `PlayerImage.tsx` and `PlayerPicture.tsx` may draw a
creature picture.

## Deploy

Vercel project `pokedraft`, Git-linked to `main`. **Merging to `main` deploys to production**; there
is no staging gate. Pull requests get a Preview deployment on the Neon `preview` branch.

1. Open a PR, get CI green and an independent review (see `CLAUDE.md`).
2. If the PR changes the schema, apply the migration to production first with `pnpm db:migrate`
   (rollback scripts live in `drizzle/rollback/`).
3. Squash merge pinned to the reviewed head: `gh pr merge <n> --squash --match-head-commit <sha>`.
4. Check that the production deployment SHA equals the squash SHA, then run `pnpm test:live`.

Hosting assumptions (client IP header, secrets, preview database) are in `CLAUDE.md`.
