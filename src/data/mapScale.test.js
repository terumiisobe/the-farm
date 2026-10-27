import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { groundSpanMeters, metersPerPixelForBounds } from "./mapScale.js";

/** Operator SW/NE for the farm still (PR #4). */
const OPERATOR_BOUNDS = [
  [-25.762862, -49.189754],
  [-25.761621, -49.188175],
];

describe("mapScale", () => {
  it("reads ~138 m north-south and ~158 m east-west for the operator still corners", () => {
    const { northSouthM, eastWestM } = groundSpanMeters(OPERATOR_BOUNDS);

    expect(northSouthM).toBeGreaterThan(137);
    expect(northSouthM).toBeLessThan(139);
    expect(eastWestM).toBeGreaterThan(157);
    expect(eastWestM).toBeLessThan(159);
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
