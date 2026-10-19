import type { Metadata } from "next";
import Link from "next/link";
import { DAILY_RULE, LADDER_SHAPE } from "@/ui/labels";
import { ModuleCard, Pill } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import s from "./page.module.css";

export const metadata: Metadata = { title: "How to play pokedraft" };

const SECTIONS: readonly { id: string; title: string; body: readonly string[] }[] = [
  {
    id: "builder",
    title: "The builder",
    body: [
      "Pick a formation and fill all 11 starting spots and 5 bench spots with Pokémon from the generations you switch on. Legendary and Mythical Pokémon stay out until you switch on Legendaries in the settings. You can swap players around, clear a spot, or start over.",
      "Once all 16 spots are filled you get a Team Score and can play a friendly cup with that squad.",
    ],
  },
  {
    id: "cup8",
    title: "The 8-0 Challenge",
    body: [
      "Every round the game rolls a region and then a type, for example Johto and Water. You draft one Pokémon that matches both, then the next round rolls again, until all 16 spots are filled.",
      "In Open you can take any Pokémon that matches the roll. In Classic you choose from just 3 offered. Open is easier than Classic. Your records keep them apart, but the all-time leaderboard ranks every draft setting together and names each run's settings on its row.",
      "A squad can hold at most 3 Legendary or Mythical Pokémon. After the third, they stop appearing in rolls.",
      "You get 3 rerolls for the whole run. Reroll the type to get a different type in the same region. Reroll the region to get a different region, and the type is rolled again, so it can come up the same.",
      "Squad First shows you the roll and lets you choose which spot to fill. Position First makes you commit to a spot before you see the roll.",
    ],
  },
  {
    id: "kanto151",
    title: "The 151 Challenge",
    body: [
      "Only the original 151. Each round rolls a single Pokémon and you place it in your squad. You get 5 rerolls for the whole run. The same cap of 3 Legendary or Mythical Pokémon applies.",
    ],
  },
  {
    id: "daily",
    title: "Daily",
    body: [
      DAILY_RULE,
      "The Daily is an 8-0 Challenge in Open and Squad First with every generation switched on. You choose the formation before you start.",
      "A new Daily starts at midnight New York time. Each nickname can put one run on each day's board.",
    ],
  },
  {
    id: "cup",
    title: "The cup",
    body: [
      "Your squad plays 3 group games. The top 2 in the group go through to the Round of 32, then the Round of 16, the quarter-final, the semi-final and the Final.",
      `${LADDER_SHAPE} Win all 8 games for a flawless 8-0.`,
      "Players can miss a match. When that happens someone from the bench comes in for that game.",
    ],
  },
  {
    id: "live",
    title: "Live match",
    body: [
      "With Manager mode off, Quick sim takes you straight to your results. Live match plays every game out on the pitch.",
      "A live half takes about 25 seconds, and the clock holds on each goal and save so you can see it.",
    ],
  },
  {
    id: "manager",
    title: "Manager mode",
    body: [
      "Switch on Manager mode to make tactics and substitutions from the touchline during each match.",
      "You pick a starting tactic before kickoff. The clock stops at half-time, before extra time and when an injury needs your answer.",
      "Manager mode always plays the match live. A run with at least one touchline decision is marked Coached, and the leaderboard can show coached and uncoached runs apart.",
    ],
  },
  {
    id: "score",
    title: "Team Score",
    body: [
      "Team Score sums up how good your squad is, on a scale from 0 to 1000. It mostly comes from how well each player suits the spot they play, so a natural striker up front beats a goalkeeper played out of position.",
      "On the results screen each player gets a rating from 0 to 100 for their spot. It ranks them against every other Pokémon for that job, so 78 vs other CBs means better than about 78 of every 100 other CBs. The three lowest ratings in your eleven are flagged as weak spots.",
      "Each line counts, your weak spots pull the score down, and neighbours who link up (shared type, same evolution line, same generation, or covering each other's weaknesses) add a bonus. A strong bench helps a little too.",
    ],
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    body: [
      "Finished 8-0 and 151 Challenge runs can go on the leaderboard under a nickname. Friendlies never do.",
      "There is a board for each day's Daily and an all-time board for each challenge. Runs rank by wins, then draws, then Team Score, and the earlier run wins a tie. Each board shows its top 50.",
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
      <ModuleCard
        className={s.header}
        variant="quiet"
        eyebrow="Rules of the game"
        title="How to play"
        headingLevel={1}
        description="Draft Pokémon into a soccer formation, get a Team Score, and take your squad through an 8-game cup."
        icon={<NavIcon family="help" />}
      />
      <nav className={s.toc} aria-label="Sections">
        {SECTIONS.map((sec) => (
          <a key={sec.id} href={`#${sec.id}`} className="chip">
            {sec.title}
          </a>
        ))}
      </nav>
      {SECTIONS.map((sec, i) => (
        <ModuleCard
          key={sec.id}
          id={sec.id}
          className={s.section}
          eyebrow="Game guide"
          title={sec.title}
          description={sec.body[0]!}
          meta={<Pill>{String(i + 1).padStart(2, "0")}</Pill>}
        >
          <div className={s.body}>
            {sec.body.slice(1).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </ModuleCard>
      ))}
      <Link href="/" className={`btn btn--primary ${s.cta}`}>
        Start drafting
      </Link>
    </main>
  );
}
