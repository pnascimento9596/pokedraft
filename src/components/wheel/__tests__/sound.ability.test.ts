// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.resetModules();
});

it("plays a synth family for every type and generic effect, ten families in all (catches a Dragon move that throws instead of sounding)", async () => {
  const notes: string[] = [];
  class AudioContextStub {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator() {
      const osc = {
        type: "",
        frequency: {
          setValueAtTime: (value: number) => notes.push(`${osc.type} ${value}`),
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => ({ connect: () => {} }),
        start: () => {},
        stop: () => {},
      };
      return osc;
    }
    createGain() {
      return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } };
    }
  }
  vi.stubGlobal("AudioContext", AudioContextStub);
  const sound = await import("../sound");
  sound.setSoundEnabled(true);
  const effects = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
    "impact",
    "shield",
    "dive",
  ];
  const heard: Record<string, string> = {};
  for (const effect of effects) {
    notes.length = 0;
    sound.playAbilitySound(effect as never);
    heard[effect] = notes.join(",");
  }
  expect(heard).toEqual({
    normal: "triangle 200",
    fire: "sawtooth 220",
    water: "sine 340",
    electric: "square 880",
    grass: "triangle 480",
    ice: "sine 1046.5",
    fighting: "triangle 200",
    poison: "sine 340",
    ground: "sawtooth 130",
    flying: "sine 1046.5",
    psychic: "sine 660",
    bug: "triangle 480",
    rock: "sawtooth 130",
    ghost: "sine 660",
    dragon: "sawtooth 220",
    dark: "sine 660",
    steel: "square 880",
    fairy: "triangle 480",
    impact: "triangle 200",
    shield: "triangle 330",
    dive: "sine 240",
  });
  expect(new Set(Object.values(heard)).size).toBe(10);
});
