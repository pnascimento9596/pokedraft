import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Announcer } from "@/components/Announcer";
import { ImageSettings } from "@/components/ImageSettings";
import { NavLinkList, NavLinks } from "@/components/NavLinks";
import { SiteNav } from "@/components/SiteNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_BOOT_SCRIPT } from "@/ui/theme";
import { Inter } from "@/design/fonts/inter";
import "./globals.css";

const SITE_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_HOST ? `https://${SITE_HOST}` : "http://localhost:3000"),
  title: "pokedraft",
  description: "Draft Pokémon into a soccer formation and play a cup.",
  robots: { index: false, follow: false },
};

// The page draws under the notch and the home indicator; globals.css pads the edges with the
// safe-area insets. THEME_BOOT_SCRIPT writes the theme-color meta, so it follows an in-app choice.
export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={Inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="site-header__brand" aria-label="PokeDraft">
            pokedraft
          </Link>
          <SiteNav>
            <Suspense fallback={<NavLinkList pathname={null} />}>
              <NavLinks />
            </Suspense>
            <ImageSettings />
            <ThemeToggle />
          </SiteNav>
        </header>
        <div id="content" tabIndex={-1}>
          {children}
        </div>
        <Announcer />
      </body>
    </html>
  );
}
