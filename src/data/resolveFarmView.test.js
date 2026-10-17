import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { farmViewKey, resolveFarmView } from "./resolveFarmView.js";

const SATELLITE = { satellite: { maxZoom: 18 } };
const BOUNDS_500_M = [[-15.002245777937478, -48.00232500040516], [-14.997754222062522, -47.99767499959484]];
const BOUNDS_5_KM = [[-15.022457779374776, -48.02325000405161], [-14.977542220625224, -47.97674999594839]];

describe("resolveFarmView", () => {
  it("lets HiveMap fit hive GPS and takes maxZoom from the satellite slot", () => {
    const farm = {
      basemap: {
        satellite: { maxZoom: 18 },
        fallback: { maxZoom: 21, image: "/assets/farm-basemap.jpg", bounds: BOUNDS_500_M },
      },
      center: [-15, -48],
      bounds: BOUNDS_500_M,
      hives: [
        { lat: null, lng: null },
        { latitude: -23.1, longitude: -46.2 },
        { lat: Number.NaN, lng: 1 },
      ],
    };

    expect(resolveFarmView(farm)).toEqual({ maxZoom: 18, source: "hives" });
    expect(resolveFarmView(example)).toEqual({ maxZoom: 18, source: "hives" });
  });

  it("returns the given centre and a zoom of 16 when the bounds span about 500 m", () => {
    const farm = {
      basemap: SATELLITE,
      center: [-15, -48],
      bounds: BOUNDS_500_M,
      hives: [{ lat: null, lng: null }],
    };
    const before = JSON.parse(JSON.stringify(farm));

    expect(resolveFarmView(farm)).toEqual({
      maxZoom: 18,
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });
    expect(farm).toEqual(before);
    expect(farm.basemap.bounds).toBeUndefined();
  });

  it("keeps a wide farm inside the calm zoom band", () => {
    expect(resolveFarmView({
      basemap: SATELLITE,
      center: [-15, -48],
      bounds: BOUNDS_5_KM,
    })).toEqual({
      maxZoom: 18,
      source: "bounds",
      center: [-15, -48],
      zoom: 15,
    });
  });

  it("uses zoom 16 for a centre with no bounds, and never past satellite maxZoom", () => {
    expect(resolveFarmView({
      basemap: SATELLITE,
      center: [-15, -48],
      address: "",
    })).toEqual({
      maxZoom: 18,
      source: "center",
      center: [-15, -48],
      zoom: 16,
    });

    expect(resolveFarmView({
      basemap: { satellite: { maxZoom: 14 } },
      center: [-15, -48],
      bounds: BOUNDS_500_M,
    })).toEqual({
      maxZoom: 14,
      source: "bounds",
      center: [-15, -48],
      zoom: 14,
    });
  });

  it("does not invent coordinates from an address", () => {
    const addressed = resolveFarmView({
      basemap: SATELLITE,
      address: "Sítio exemplo",
      hives: [{ lat: null, lng: null }, { latitude: null, longitude: null }],
      center: [null, null],
    });
    const empty = resolveFarmView({
      basemap: SATELLITE,
      address: "",
      hives: [{ lat: null, lng: 4 }],
    });
    const absent = resolveFarmView({
      basemap: SATELLITE,
      hives: [],
    });

    expect(addressed).toEqual({ maxZoom: 18, source: "placeholder" });
    expect(empty).toEqual(absent);
    expect(absent).toEqual({ maxZoom: 18, source: "placeholder" });
  });

  it("does not read maxZoom from the image fallback", () => {
    expect(resolveFarmView({
      basemap: { fallback: { maxZoom: 21, image: "/assets/farm-basemap.jpg", bounds: BOUNDS_500_M } },
      hives: [{ lat: "1", lng: "2" }],
    })).toEqual({ source: "hives" });

    expect(resolveFarmView({
      basemap: { fallback: { image: "/assets/farm-basemap.jpg", bounds: BOUNDS_500_M } },
      bounds: BOUNDS_500_M,
    })).toEqual({
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });
  });

  it("changes the map key when hive GPS changes and keeps it for the same pins", () => {
    const here = {
      id: "api-1",
      basemap: SATELLITE,
      hives: [{ lat: -10.5, lng: -40.5 }, { lat: null, lng: null }, { lat: -10, lng: -40 }],
    };
    expect(farmViewKey(here, resolveFarmView(here))).toBe("api-1:hives:2:-10.5:-40.5:-10:-40");

    const moved = {
      id: "api-1",
      basemap: SATELLITE,
      hives: [{ lat: -1, lng: -2 }],
    };
    expect(farmViewKey(moved, resolveFarmView(moved))).toBe("api-1:hives:1:-1:-2:-1:-2");
    expect(farmViewKey({ basemap: SATELLITE }, { maxZoom: 18, source: "placeholder" })).toBe("farm:placeholder");
  });
});
