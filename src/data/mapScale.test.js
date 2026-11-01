import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { groundSpanMeters, metersPerPixelForBounds } from "./mapScale.js";

/** Operator SW/NE for the farm still. */
const OPERATOR_BOUNDS = [
  [-25.762741, -49.189967],
  [-25.761562, -49.188100],
];

describe("mapScale", () => {
  it("reads ~131 m north-south and ~187 m east-west for the operator still corners", () => {
    const { northSouthM, eastWestM } = groundSpanMeters(OPERATOR_BOUNDS);

    expect(northSouthM).toBeGreaterThan(130);
    expect(northSouthM).toBeLessThan(132);
    expect(eastWestM).toBeGreaterThan(186);
    expect(eastWestM).toBeLessThan(188);
  });

  it("keeps the shipped still bounds on those operator corners", () => {
    expect(example.basemap.bounds).toEqual(OPERATOR_BOUNDS);
    expect(example.basemap.fallback.bounds).toEqual(OPERATOR_BOUNDS);
  });

  it("makes image width times metres-per-pixel recover the east-west ground span", () => {
    const TILE = 256;
    const [[, west], [, east]] = OPERATOR_BOUNDS;
    const worldW = TILE * (east - west) / 360;
    const { eastWestM } = groundSpanMeters(OPERATOR_BOUNDS);

    for (const z of [16, 18, 19, 20]) {
      const mpp = metersPerPixelForBounds(OPERATOR_BOUNDS, z);
      const screenW = worldW * 2 ** z;
      expect(screenW * mpp).toBeCloseTo(eastWestM, 3);
    }
  });
});
