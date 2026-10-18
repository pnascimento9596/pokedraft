import type { PokemonType } from "@/data/pokedex";

export interface AbilityMeta {
  readonly name: string;
  readonly flavor: string;
}

const ABILITY_CATALOG: Record<string, { flavor: string }> = {
  blaze: { flavor: "Ignites fiery strike power on clutch goals!" },
  torrent: { flavor: "Surges through defense with unstoppable pressure!" },
  overgrow: { flavor: "Roots deep defense and curling set-pieces!" },
  static: { flavor: "Paralyzes oncoming attackers with lightning tackles!" },
  "lightning-rod": {
    flavor: "Intercepts crosses and powers up counter-attacks!",
  },
  "speed-boost": { flavor: "Accelerates past the back line on every break!" },
  intimidate: { flavor: "Unnerves rival strikers with overwhelming presence!" },
  pressure: { flavor: "Suffocates the opposition's midfield build-up!" },
  levitate: { flavor: "Glides effortlessly above sliding challenges!" },
  "inner-focus": {
    flavor: "Rock-solid composure under heavy match pressure!",
  },
  synchronize: {
    flavor: "Mirrors rival tactics and anticipates through-balls!",
  },
  technician: { flavor: "Crafts pinpoint dribbles and surgical finishes!" },
  "super-luck": { flavor: "Bends shots off the post into the top corner!" },
  sniper: { flavor: "Drills laser-focused rockets past the keeper!" },
  sturdy: { flavor: "Stands firm as an unyielding wall on the goal line!" },
  "swift-swim": { flavor: "Glides across wet turf with dazzling agility!" },
  chlorophyll: { flavor: "Powers relentless box-to-box stamina in the sun!" },
  "solar-power": { flavor: "Uncorks blistering volleys with radiant energy!" },
  "huge-power": { flavor: "Blasts unstoppable cannonballs on target!" },
  "pure-power": { flavor: "Cracks thunderous shots off both feet!" },
  "sheer-force": { flavor: "Overpowers markers with raw athletic dominance!" },
  adaptability: { flavor: "Seamlessly shifts tempo and exploits open space!" },
  "magic-guard": { flavor: "Impervious to fatigue and opponent pressing!" },
  protean: { flavor: "Shape-shifts positioning to fool every defender!" },
  libero: { flavor: "Roams dynamically from sweeper to lethal poacher!" },
  "beast-boost": { flavor: "Grows stronger with every goal and tackle!" },
  regenerator: { flavor: "Recharges sprint stamina whenever tracking back!" },
  "thick-fat": { flavor: "Shrugs off bruising contact like a freight train!" },
  multiscale: { flavor: "Deflects close-range shots with armored shielding!" },
  moxie: { flavor: "Runs riot after finding the back of the net!" },
  unburden: { flavor: "Explodes in open field with sudden turbo burst!" },
  guts: { flavor: "Fights through physical duels with fierce grit!" },
  prankster: { flavor: "Delivers deceptive dummy runs and cheeky lobs!" },
  "magic-bounce": { flavor: "Reflects opponent pressure right back at them!" },
  "iron-fist": { flavor: "Unleashes hammer strikes that rip the net!" },
  aerilate: { flavor: "Launches acrobatic bicycle kicks from the air!" },
  pixilate: { flavor: "Sprinkles fairy dust on sweeping curling efforts!" },
  refrigerate: { flavor: "Freezes the goalkeeper with icy cold finishes!" },
  galvanize: { flavor: "Charges every ground pass with electric pace!" },
  "serene-grace": { flavor: "Floats through challenges with effortless flair!" },
  "shadow-tag": { flavor: "Locks down opposing playmakers in man-marking!" },
  drought: { flavor: "Bakes the pitch with blazing attacking tempo!" },
  drizzle: { flavor: "Controls wet pitch tempo with slick one-twos!" },
  "sand-stream": { flavor: "Blinds markers in swirling transitional chaos!" },
  "snow-warning": { flavor: "Chills rival offenses with a frozen backline!" },
  trace: { flavor: "Copies opponent star moves and counters instantly!" },
  infiltrator: { flavor: "Ghosting into blind spots behind the defense!" },
  "clear-body": { flavor: "Ignores heavy pressing without losing balance!" },
  defiant: { flavor: "Rallies furiously whenever team goes behind!" },
  competitive: { flavor: "Elevates clinical finishing when under pressure!" },
  contrary: { flavor: "Turns tough match situations into attacking gold!" },
  unaware: { flavor: "Calmly shuts down elite attackers without flinching!" },
};

const TYPE_FLAVORS: Record<PokemonType, string> = {
  fire: "Heats up the pitch with explosive striking power!",
  water: "Controls pitch rhythm with fluid passing currents!",
  electric: "Sparks lightning acceleration on the attack!",
  grass: "Weaves resilient teamwork and curling strikes!",
  psychic: "Foresees rival passing angles with tactical vision!",
  ice: "Freezes opposing forwards with ice-cold discipline!",
  dragon: "Dominates the stadium with mythical pitch command!",
  dark: "Strikes stealthily from defense to offense!",
  fighting: "Wins physical duels and powers through challenges!",
  ghost: "Haunts open spaces and slips through the defensive line!",
  steel: "Shields the backline with impenetrable armor!",
  rock: "Anchors set-pieces with colossal aerial presence!",
  ground: "Shakes the turf with earth-shattering tackles!",
  flying: "Glides above the press with majestic aerial control!",
  poison: "Wears down opponent stamina with venomous pressure!",
  bug: "Swarms rival ball-carriers with relentless hustle!",
  fairy: "Enchants the crowd with breathtaking skill moves!",
  normal: "Executes textbook technique and clinical fundamentals!",
};

export function getAbilityMeta(
  abilityId: string,
  abilityName: string,
  primaryType: PokemonType,
): AbilityMeta {
  const normalized = abilityId.toLowerCase().trim();
  const entry = ABILITY_CATALOG[normalized];
  if (entry) {
    return {
      name: abilityName,
      flavor: entry.flavor,
    };
  }

  return {
    name: abilityName,
    flavor: `${abilityName}: ${TYPE_FLAVORS[primaryType] ?? TYPE_FLAVORS.normal}`,
  };
}
