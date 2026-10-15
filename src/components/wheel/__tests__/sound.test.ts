// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

 afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); vi.resetModules(); });

it("special reveal plays a distinct rising three-note cue only after sound is enabled", async () => {
  const frequencies: number[] = [];
  class AudioContextStub {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator() {
      return { type: "", frequency: { setValueAtTime: (value: number) => frequencies.push(value) }, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} };
    }
    createGain() {
      return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } };
    }
  }
  vi.stubGlobal("AudioContext", AudioContextStub);
  const sound = await import("../sound");
  sound.playSpecialReveal();
  expect(frequencies).toEqual([]);
  sound.setSoundEnabled(true);
  sound.playSpecialReveal();
  expect(frequencies).toEqual([523.25, 659.25, 1046.5]);
});
