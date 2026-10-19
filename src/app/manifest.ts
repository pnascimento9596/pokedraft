import type { MetadataRoute } from "next";
import { THEME_COLOR_DARK } from "@/design/theme-color";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pokedraft",
    short_name: "pokedraft",
    description: "Draft Pokémon into a soccer formation and play a cup.",
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLOR_DARK,
    theme_color: THEME_COLOR_DARK,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
