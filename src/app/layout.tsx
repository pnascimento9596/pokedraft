import type { Metadata } from "next";
import Link from "next/link";
import { Barlow_Semi_Condensed, Big_Shoulders } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const shoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-shoulders",
});
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "pokedraft",
  description: "Draft Pokémon into a soccer formation and play a cup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shoulders.variable} ${barlow.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/" className="site-header__brand">
            poke<span>draft</span>
          </Link>
          <nav aria-label="Main">
            <Link href="/how-to-play">How to play</Link>
            <Link href="/history">History</Link>
            <ThemeToggle />
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <p>
            Fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company. Not
            monetized. Data via PokéAPI.
          </p>
          <p>Soccer remix of the All-22 Pokémon Builder idea.</p>
        </footer>
      </body>
    </html>
  );
}
