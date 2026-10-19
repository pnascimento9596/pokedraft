"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NavIcon, type NavFamily } from "@/components/ui/nav-icons";

function isCurrent(href: string, pathname: string | null): boolean {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The main nav links, with `aria-current="page"` on the one for `pathname`. */
export function NavLinkList({ pathname }: { readonly pathname: string | null }) {
  return (Object.keys(NAV_ICONS) as NavFamily[]).map((family) => {
    const { href, label } = NAV_ICONS[family];
    return (
      <Link key={family} href={href} aria-current={isCurrent(href, pathname) ? "page" : undefined}>
        <NavIcon family={family} />
        {label}
      </Link>
    );
  });
}

// The layout renders this inside Suspense with `NavLinkList pathname={null}` as the fallback,
// because the pathname of a dynamic route like /r/[token] is not known while prerendering.
export function NavLinks() {
  return <NavLinkList pathname={usePathname()} />;
}
