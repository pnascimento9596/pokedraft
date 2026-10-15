type ClubRegion =
  "Kanto" | "Johto" | "Hoenn" | "Sinnoh" | "Unova" | "Kalos" | "Alola" | "Galar" | "Paldea";

// City sources and naming aliases are recorded in docs/dispatches/club-region-identity.md.
const CLUB_REGIONS: ReadonlyMap<string, ClubRegion> = new Map([
  ["viridian-fc", "Kanto"],
  ["cerulean-city", "Kanto"],
  ["vermilion-athletic", "Kanto"],
  ["goldenrod-united", "Johto"],
  ["ecruteak-town", "Johto"],
  ["olivine-rovers", "Johto"],
  ["mahogany-fc", "Johto"],
  ["lilycove-athletic", "Hoenn"],
  ["slateport-united", "Hoenn"],
  ["mauville-city", "Hoenn"],
  ["fortree-rovers", "Hoenn"],
  ["hearthome-city", "Sinnoh"],
  ["jubilife-fc", "Sinnoh"],
  ["veilstone-united", "Sinnoh"],
  ["canalave-athletic", "Sinnoh"],
  ["castelia-city", "Unova"],
  ["nimbasa-united", "Unova"],
  ["driftveil-fc", "Unova"],
  ["opelucid-rovers", "Unova"],
  ["lumiose-fc", "Kalos"],
  ["santalune-town", "Kalos"],
  ["shalour-city", "Kalos"],
  ["coumarine-united", "Kalos"],
  ["hau-oli-city", "Alola"],
  ["konikoni-athletic", "Alola"],
  ["hammerlocke-rovers", "Galar"],
  ["motostoke-united", "Galar"],
  ["wyndon-fc", "Galar"],
  ["mesagoza-fc", "Paldea"],
  ["levincia-city", "Paldea"],
  ["pallet-town", "Kanto"],
  ["pewter-united", "Kanto"],
  ["vermilion-fc", "Kanto"],
  ["lavender-town", "Kanto"],
  ["celadon-city", "Kanto"],
  ["fuchsia-united", "Kanto"],
  ["saffron-city", "Kanto"],
  ["cinnabar-fc", "Kanto"],
  ["indigo-plateau-united", "Kanto"],
]);

export function clubRegion(clubId: string): ClubRegion | undefined {
  return CLUB_REGIONS.get(clubId);
}
