import type { Metadata } from "next";
import Link from "next/link";
import s from "./page.module.css";

export const metadata: Metadata = { title: "How to play pokedraft" };

const SECTIONS: readonly { id: string; title: string; body: readonly string[] }[] = [
  {
    id: "builder",
    title: "The builder",
    body: [
      "Pick a formation and fill all 11 starting spots and 5 bench spots with any Pokémon you like. You can swap players around, clear a spot, or start over.",
      "Once all 16 spots are filled you get a Team Score and can play a friendly cup with that squad.",
    ],
  },
  {
    id: "cup8",
    title: "The 8-0 Challenge",
    body: [
      "Every round the game rolls a region and then a type, for example Johto and Water. You draft one Pokémon that matches both, then the next round rolls again, until all 16 spots are filled.",
      "In Open you can take any Pokémon that matches the roll. In Classic you choose from just 3 offered. Open is easier than Classic, so they are tracked separately.",
      "You get 3 rerolls for the whole run. Reroll the type to keep the region, or reroll the region to get a new region and a new type.",
      "Squad First shows you the roll and lets you choose which spot to fill. Position First makes you commit to a spot before you see the roll.",
    ],
  },
  {
    id: "kanto151",
    title: "The 151 Challenge",
    body: [
      "Only the original 151. Each round rolls a single Pokémon and you place it in your squad. You get 5 rerolls for the whole run.",
    ],
  },
  {
    id: "cup",
    title: "The cup",
    body: [
      "Your squad plays 3 group games. The top 2 in the group go through to the Round of 32, then the Round of 16, the quarter-final, the semi-final and the Final.",
      "Opponents get stronger every round, and the ladder gets hard from the quarter-final on. Win all 8 games for a flawless 8-0.",
      "Players can miss a match. When that happens someone from the bench comes in for that game.",
    ],
  },
  {
    id: "score",
    title: "Team Score",
    body: [
      "Team Score sums up how good your squad is. It mostly comes from how well each player suits the spot they play, so a natural striker up front beats a goalkeeper played out of position.",
      "Each line counts, your weakest spots pull the score down, and neighbours who link up (shared type, same evolution line, same generation, or covering each other's weaknesses) add a bonus. A strong bench helps a little too.",
    ],
  },
  {
    id: "fair",
    title: "Fair rolls",
    body: [
      "Every roll comes from the run's seed, decided before anything spins. The wheel only shows a result the game already decided, and a shared run link replays exactly the same draft and cup for anyone who opens it.",
    ],
  },
  {
    id: "friendly",
    title: "Friendlies",
    body: [
      "Cups played from the builder are friendlies. They are marked Friendly (not ranked) and are kept apart from your challenge stats.",
    ],
  },
];

export default function HowToPlayPage() {
  return (
    <main className={`page ${s.page}`}>
      <header className={s.header}>
        <span className="kicker">Rules of the game</span>
        <h1>How to play</h1>
        <p className={s.lede}>
          Draft Pokémon into a soccer formation, get a Team Score, and take your squad through an
          8-game cup.
        </p>
      </header>
      <nav className={s.toc} aria-label="Sections">
        {SECTIONS.map((sec) => (
          <a key={sec.id} href={`#${sec.id}`} className="chip">
            {sec.title}
          </a>
        ))}
      </nav>
      {SECTIONS.map((sec, i) => (
        <section key={sec.id} id={sec.id} className={s.section} aria-labelledby={`${sec.id}-h`}>
          <span className={s.num} aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className={s.body}>
            <h2 id={`${sec.id}-h`}>{sec.title}</h2>
            {sec.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      <Link href="/" className={`btn btn--primary ${s.cta}`}>
        Start drafting
      </Link>
    </main>
  );
}
