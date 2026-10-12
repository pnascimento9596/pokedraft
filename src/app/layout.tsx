import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Announcer } from "@/components/Announcer";
import { ImageSettings } from "@/components/ImageSettings";
import { PackCredit } from "@/components/PackCredit";
import { SiteNav } from "@/components/SiteNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAV_ICONS, NavIcon, type NavFamily } from "@/components/ui/nav-icons";
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "@/design/theme-color";
import { THEME_BOOT_SCRIPT } from "@/ui/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
});

const SITE_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_HOST ? `https://${SITE_HOST}` : "http://localhost:3000"),
  title: "pokedraft",
  description: "Draft Pokémon into a soccer formation and play a cup.",
  robots: { index: false, follow: false },
};

// The page draws under the notch and the home indicator; globals.css pads the edges with the
// safe-area insets.
export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <header className="site-header">
          <Link href="/" className="site-header__brand">
            pokedraft
          </Link>
          <SiteNav>
            {(Object.keys(NAV_ICONS) as NavFamily[]).map((family) => (
              <Link key={family} href={NAV_ICONS[family].href}>
                <NavIcon family={family} />
                {NAV_ICONS[family].label}
              </Link>
            ))}
            <ImageSettings />
            <ThemeToggle />
          </SiteNav>
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
        <Announcer />
      </body>
    </html>
  );
}
