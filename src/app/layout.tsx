import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pokedraft",
  description: "Draft Pokémon into a soccer formation and play a cup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
