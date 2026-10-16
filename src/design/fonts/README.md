# Inter

## Browser fonts

The site self-hosts Inter 400, 600 and 700 through next/font/local (`inter.ts`), so `pnpm build` never fetches Google Fonts. The seven `inter-<subset>.woff2` files are the exact subsets next/font/google bundled before: same bytes, same unicode ranges, latin preloaded, and the same metric-matched Arial fallback (declared in `src/app/globals.css`). `scripts/fonts/fetch-inter-woff2.mjs` re-downloads them and rewrites `web-provenance.json` with each source URL and SHA-256. They are licensed under the accompanying OFL.

## Share renderer

ImageResponse requires TTF, OTF or WOFF and cannot use the browser WOFF2 files. These three Inter TTF subsets come from the official Google Fonts CSS API, licensed under the accompanying OFL. They contain printable ASCII and every character in the committed species names, plus the card's labels. Their combined size is 104,780 bytes. URLs, character set and exact SHA-256 hashes are in provenance.json. No second family is introduced and rendering does not fetch fonts from the network.

The immutable fonts are read once at module scope, following [Next ImageResponse's custom font example](https://nextjs.org/docs/app/api-reference/functions/image-response#custom-fonts). Next traces the readFile paths into the server deployment; real PNG route tests and production verification prove the files remain available. The renderer keeps the existing content and 1200x630 size.
