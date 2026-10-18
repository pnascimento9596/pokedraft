// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.resetModules();
});

it("special reveal plays a distinct rising three-note cue only after sound is enabled", async () => {
  const frequencies: number[] = [];
  class AudioContextStub {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator() {
      return {
        type: "",
        frequency: { setValueAtTime: (value: number) => frequencies.push(value) },
        connect: () => ({ connect: () => {} }),
        start: () => {},
        stop: () => {},
      };
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

function crowdContext() {
  const log: string[] = [];
  class AudioContextStub {
    state = "running";
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    createBuffer(_channels: number, length: number) {
      log.push(`buffer:${length}`);
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      log.push("source");
      return {
        buffer: null,
        loop: false,
        connect: (n: unknown) => n,
        start: () => log.push("source:start"),
        stop: () => log.push("source:stop"),
        disconnect: () => {},
        onended: null,
      };
    }
    createBiquadFilter() {
      return { type: "", frequency: { value: 0 }, Q: { value: 0 }, connect: (n: unknown) => n };
    }
    createGain() {
      const param = {
        value: 0,
        setValueAtTime: () => {},
        setTargetAtTime: (v: number) => log.push(`target:${v}`),
        linearRampToValueAtTime: (v: number, t: number) => log.push(`ramp:${v}@${t}`),
        cancelScheduledValues: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      return { gain: param, connect: (n: unknown) => n, disconnect: () => {} };
    }
  }
  vi.stubGlobal("AudioContext", AudioContextStub);
  return log;
}

it("the crowd bed stays silent while sound is off (catches a crowd that plays with the toggle off)", async () => {
  const log = crowdContext();
  const sound = await import("../sound");
  sound.startCrowdBed();
  sound.setCrowdLevel(0.09);
  expect(log).toEqual([]);
});

it("turning sound off stops a running crowd bed (catches a crowd that outlives the toggle)", async () => {
  const log = crowdContext();
  const sound = await import("../sound");
  sound.setSoundEnabled(true);
  sound.startCrowdBed();
  sound.startCrowdBed();
  expect(log.filter((l) => l === "source:start")).toEqual(["source:start"]);
  sound.setSoundEnabled(false);
  expect(log.filter((l) => l === "source:stop")).toEqual(["source:stop"]);
  sound.setCrowdLevel(0.09);
  expect(log.filter((l) => l === "target:0.09")).toEqual([]);
});

it("a roar ramps up, holds and releases on its own envelope, in seconds", async () => {
  const log = crowdContext();
  const sound = await import("../sound");
  sound.setSoundEnabled(true);
  sound.startCrowdBed();
  sound.crowdRoar({ peak: 0.32, attackMs: 150, holdMs: 2400, releaseMs: 2400 });
  expect(log.filter((l) => l.startsWith("ramp:"))).toEqual(["ramp:0.32@0.15", "ramp:0@4.95"]);
});
