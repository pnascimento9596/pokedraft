import type { Metadata } from "next";
import Link from "next/link";
import { Barlow_Semi_Condensed, Big_Shoulders } from "next/font/google";
import { ImageSettings } from "@/components/ImageSettings";
import { PackCredit } from "@/components/PackCredit";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// next/font has no fallback metrics for Big Shoulders, so the fallback face lives in globals.css.
const shoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-shoulders",
  adjustFontFallback: false,
});
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-barlow",
});

const SITE_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_HOST ? `https://${SITE_HOST}` : "http://localhost:3000"),
  title: "pokedraft",
  description: "Draft Pokémon into a soccer formation and play a cup.",
  robots: { index: false, follow: false },
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
            <Link href="/daily">Daily</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/how-to-play">How to play</Link>
            <Link href="/history">History</Link>
            <ImageSettings />
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
          <PackCredit />
        </footer>
      </body>
    </html>
  );
}
