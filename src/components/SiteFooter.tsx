import { PackCredit } from "@/components/PackCredit";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company. Not
        monetized. Data via PokéAPI.
      </p>
      <p>Soccer remix of the All-22 Pokémon Builder idea.</p>
      <PackCredit />
    </footer>
  );
}
