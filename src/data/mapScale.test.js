import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { groundSpanMeters, metersPerPixelForBounds } from "./mapScale.js";

/** Operator SW/NE for the farm still (PR #4). */
const OPERATOR_BOUNDS = [
  [-25.762684, -49.189889],
  [-25.761622, -49.188210],
];

describe("mapScale", () => {
  it("reads ~118 m north-south and ~168 m east-west for the operator still corners", () => {
    const { northSouthM, eastWestM } = groundSpanMeters(OPERATOR_BOUNDS);

    expect(northSouthM).toBeGreaterThan(117);
    expect(northSouthM).toBeLessThan(119);
    expect(eastWestM).toBeGreaterThan(167);
    expect(eastWestM).toBeLessThan(169);
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
