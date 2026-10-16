import type { PokemonType } from "@/data/pokedex";

export interface AbilityMeta {
  readonly name: string;
  readonly flavor: string;
  readonly element: PokemonType;
}

const ABILITY_CATALOG: Record<string, { flavor: string; element?: PokemonType }> = {
  blaze: { flavor: "Ignites fiery strike power on clutch goals!", element: "fire" },
  torrent: { flavor: "Surges through defense with unstoppable pressure!", element: "water" },
  overgrow: { flavor: "Roots deep defense and curling set-pieces!", element: "grass" },
  static: { flavor: "Paralyzes oncoming attackers with lightning tackles!", element: "electric" },
  "lightning-rod": {
    flavor: "Intercepts crosses and powers up counter-attacks!",
    element: "electric",
  },
  "speed-boost": { flavor: "Accelerates past the back line on every break!", element: "flying" },
  intimidate: { flavor: "Unnerves rival strikers with overwhelming presence!", element: "dark" },
  pressure: { flavor: "Suffocates the opposition's midfield build-up!", element: "psychic" },
  levitate: { flavor: "Glides effortlessly above sliding challenges!", element: "flying" },
  "inner-focus": {
    flavor: "Rock-solid composure under heavy match pressure!",
    element: "fighting",
  },
  synchronize: {
    flavor: "Mirrors rival tactics and anticipates through-balls!",
    element: "psychic",
  },
  technician: { flavor: "Crafts pinpoint dribbles and surgical finishes!", element: "normal" },
  "super-luck": { flavor: "Bends shots off the post into the top corner!", element: "dark" },
  sniper: { flavor: "Drills laser-focused rockets past the keeper!", element: "water" },
  sturdy: { flavor: "Stands firm as an unyielding wall on the goal line!", element: "rock" },
  "swift-swim": { flavor: "Glides across wet turf with dazzling agility!", element: "water" },
  chlorophyll: { flavor: "Powers relentless box-to-box stamina in the sun!", element: "grass" },
  "solar-power": { flavor: "Uncorks blistering volleys with radiant energy!", element: "fire" },
  "huge-power": { flavor: "Blasts unstoppable cannonballs on target!", element: "normal" },
  "pure-power": { flavor: "Cracks thunderous shots off both feet!", element: "fighting" },
  "sheer-force": { flavor: "Overpowers markers with raw athletic dominance!", element: "fighting" },
  adaptability: { flavor: "Seamlessly shifts tempo and exploits open space!", element: "normal" },
  "magic-guard": { flavor: "Impervious to fatigue and opponent pressing!", element: "psychic" },
  protean: { flavor: "Shape-shifts positioning to fool every defender!", element: "water" },
  libero: { flavor: "Roams dynamically from sweeper to lethal poacher!", element: "fire" },
  "beast-boost": { flavor: "Grows stronger with every goal and tackle!", element: "dragon" },
  regenerator: { flavor: "Recharges sprint stamina whenever tracking back!", element: "grass" },
  "thick-fat": { flavor: "Shrugs off bruising contact like a freight train!", element: "ice" },
  multiscale: { flavor: "Deflects close-range shots with armored shielding!", element: "dragon" },
  moxie: { flavor: "Runs riot after finding the back of the net!", element: "dark" },
  unburden: { flavor: "Explodes in open field with sudden turbo burst!", element: "flying" },
  guts: { flavor: "Fights through physical duels with fierce grit!", element: "fighting" },
  prankster: { flavor: "Delivers deceptive dummy runs and cheeky lobs!", element: "dark" },
  "magic-bounce": { flavor: "Reflects opponent pressure right back at them!", element: "psychic" },
  "iron-fist": { flavor: "Unleashes hammer strikes that rip the net!", element: "fighting" },
  aerilate: { flavor: "Launches acrobatic bicycle kicks from the air!", element: "flying" },
  pixilate: { flavor: "Sprinkles fairy dust on sweeping curling efforts!", element: "fairy" },
  refrigerate: { flavor: "Freezes the goalkeeper with icy cold finishes!", element: "ice" },
  galvanize: { flavor: "Charges every ground pass with electric pace!", element: "electric" },
  "serene-grace": { flavor: "Floats through challenges with effortless flair!", element: "fairy" },
  "shadow-tag": { flavor: "Locks down opposing playmakers in man-marking!", element: "ghost" },
  drought: { flavor: "Bakes the pitch with blazing attacking tempo!", element: "fire" },
  drizzle: { flavor: "Controls wet pitch tempo with slick one-twos!", element: "water" },
  "sand-stream": { flavor: "Blinds markers in swirling transitional chaos!", element: "rock" },
  "snow-warning": { flavor: "Chills rival offenses with a frozen backline!", element: "ice" },
  trace: { flavor: "Copies opponent star moves and counters instantly!", element: "psychic" },
  infiltrator: { flavor: "Ghosting into blind spots behind the defense!", element: "ghost" },
  "clear-body": { flavor: "Ignores heavy pressing without losing balance!", element: "steel" },
  defiant: { flavor: "Rallies furiously whenever team goes behind!", element: "fighting" },
  competitive: { flavor: "Elevates clinical finishing when under pressure!", element: "psychic" },
  contrary: { flavor: "Turns tough match situations into attacking gold!", element: "grass" },
  unaware: { flavor: "Calmly shuts down elite attackers without flinching!", element: "water" },
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
      element: entry.element ?? primaryType,
    };
  }

  return {
    name: abilityName,
    flavor: `${abilityName}: ${TYPE_FLAVORS[primaryType] ?? TYPE_FLAVORS.normal}`,
    element: primaryType,
  };
}
