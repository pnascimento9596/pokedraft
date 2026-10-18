import { describe, expect, it } from "vitest";
import {
  cameraAt,
  cameraTransform,
  defaultCamera,
  projectPoint,
  seeks,
  stepCamera,
  visibleBox,
  zoomOf,
  type Camera,
} from "../camera";

// The corner flags in percent of the pitch: the lines sit 1.5 of 100 units in from each end and
// 1.5 of 64 units in from each touchline.
const NEAR_FLAG = { x: 1.5, y: 2.34 };
const FAR_FLAG = { x: 98.5, y: 97.66 };
const FRAME = 1000 / 60;

function run(cam: Camera, target: { x: number; y: number }, wide: boolean, ms: number): Camera {
  let c = cam;
  for (let i = 0; i < Math.round(ms / FRAME); i++) c = stepCamera(c, target, wide, FRAME);
  return c;
}

describe("follow camera clamp (catches a camera that shows the apron outside the pitch)", () => {
  it("camera translation is clamped at the corner flag: the far flag reads translate(-60.00%, -60.00%) scale(1.600)", () => {
    expect(cameraTransform(cameraAt(FAR_FLAG, false))).toBe(
      "translate(-60.00%, -60.00%) scale(1.600)",
    );
  });

  it("camera translation is clamped at the near corner flag: translate(0.00%, 0.00%) scale(1.600)", () => {
    expect(cameraTransform(cameraAt(NEAR_FLAG, false))).toBe(
      "translate(0.00%, 0.00%) scale(1.600)",
    );
  });

  it("on the centre spot the camera centres it: translate(-30.00%, -30.00%) scale(1.600)", () => {
    expect(cameraTransform(cameraAt({ x: 50, y: 50 }, false))).toBe(
      "translate(-30.00%, -30.00%) scale(1.600)",
    );
  });

  it("at the far flag the view is the pitch's last 62.5% each way, 37.5 to 100", () => {
    const box = visibleBox(cameraAt(FAR_FLAG, false));
    expect(box.left).toBeCloseTo(37.5, 6);
    expect(box.top).toBeCloseTo(37.5, 6);
    expect(box.right).toBeCloseTo(100, 6);
    expect(box.bottom).toBeCloseTo(100, 6);
  });

  it("the full pitch has no translation at all: translate(0.00%, 0.00%) scale(1.000)", () => {
    expect(cameraTransform(cameraAt(FAR_FLAG, true))).toBe("translate(0.00%, 0.00%) scale(1.000)");
    expect(visibleBox(cameraAt(FAR_FLAG, true))).toEqual({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    });
  });
});

describe("play badge re-projected through the camera (catches a badge zoomed with the pitch until it is wider than the view)", () => {
  it("at the far corner flag a player at 80%, 70% of the pitch shows at 68%, 52% of the view", () => {
    const p = projectPoint(cameraAt(FAR_FLAG, false), { x: 80, y: 70 });
    expect(p.x).toBeCloseTo(68, 6);
    expect(p.y).toBeCloseTo(52, 6);
  });

  it("on the full pitch a point shows where it stands", () => {
    expect(projectPoint(cameraAt(FAR_FLAG, true), { x: 80, y: 70 })).toEqual({ x: 80, y: 70 });
  });
});

describe("follow camera spring (catches a camera that snaps, overshoots or never settles on the ball)", () => {
  it("settles on a ball 40 points away in about half a second: within 2% after 500 ms, not after 250 ms", () => {
    const start = cameraAt({ x: 30, y: 50 }, false);
    const half = run(start, { x: 70, y: 50 }, false, 250);
    const settled = run(start, { x: 70, y: 50 }, false, 500);
    expect(Math.abs(70 - half.x)).toBeGreaterThan(0.8);
    expect(Math.abs(70 - settled.x)).toBeLessThan(0.8);
  });

  it("never passes the ball on the way (critically damped)", () => {
    let c = cameraAt({ x: 30, y: 50 }, false);
    let most = 0;
    for (let i = 0; i < 120; i++) {
      c = stepCamera(c, { x: 70, y: 50 }, false, FRAME);
      most = Math.max(most, c.x);
    }
    expect(most).toBeLessThanOrEqual(70);
  });

  it("two runs with the same frames land on the same camera, to the bit", () => {
    const a = run(cameraAt({ x: 10, y: 20 }, false), { x: 80, y: 60 }, false, 300);
    const b = run(cameraAt({ x: 10, y: 20 }, false), { x: 80, y: 60 }, false, 300);
    expect(a).toEqual(b);
  });

  it("a frame of no time moves nothing", () => {
    const c = cameraAt({ x: 10, y: 20 }, false);
    expect(stepCamera(c, { x: 80, y: 60 }, false, 0)).toEqual(c);
  });
});

describe("follow camera zoom (catches a zoom that cuts instead of easing over about 400 ms)", () => {
  it("eases from 1.6 to 1.0 over 400 ms: 1.3 halfway, 1.0 once 400 ms have passed", () => {
    const open = cameraAt({ x: 50, y: 50 }, false);
    expect(zoomOf(open)).toBe(1.6);
    expect(zoomOf(run(open, { x: 50, y: 50 }, true, 200))).toBeCloseTo(1.3, 2);
    expect(zoomOf(run(open, { x: 50, y: 50 }, true, 390))).toBeGreaterThan(1);
    expect(zoomOf(run(open, { x: 50, y: 50 }, true, 410))).toBe(1);
  });

  it("eases back from 1.0 to 1.6 over 400 ms", () => {
    const wide = cameraAt({ x: 50, y: 50 }, true);
    expect(zoomOf(run(wide, { x: 50, y: 50 }, false, 410))).toBe(1.6);
  });
});

describe("follow camera default (catches Follow on desktop or under reduced motion)", () => {
  it("Follow below 600px, Full at 600px and up, Full under reduced motion, a stored choice wins", () => {
    expect(defaultCamera({ wide: false, reducedMotion: false, stored: null })).toBe("follow");
    expect(defaultCamera({ wide: true, reducedMotion: false, stored: null })).toBe("full");
    expect(defaultCamera({ wide: false, reducedMotion: true, stored: null })).toBe("full");
    expect(defaultCamera({ wide: true, reducedMotion: true, stored: "follow" })).toBe("follow");
    expect(defaultCamera({ wide: false, reducedMotion: false, stored: "full" })).toBe("full");
  });
});

describe("follow camera seek (catches a camera that pans across the pitch after a seek)", () => {
  it("a clock that runs back, or on by more than a minute in one frame, is a seek", () => {
    expect(seeks(30, 30.2)).toBe(false);
    expect(seeks(30, 29.5)).toBe(true);
    expect(seeks(30, 90)).toBe(true);
  });
});
