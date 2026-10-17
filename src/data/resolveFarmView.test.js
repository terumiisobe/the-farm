import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { INITIAL_LATCH, nextLoadLatch, parseFarmBasemap, selectBasemap } from "./resolveBasemap.js";
import { farmViewKey, resolveFarmView } from "./resolveFarmView.js";

const BOUNDS_500_M = [[-15.002245777937478, -48.00232500040516], [-14.997754222062522, -47.99767499959484]];
const BOUNDS_5_KM = [[-15.022457779374776, -48.02325000405161], [-14.977542220625224, -47.97674999594839]];
const STILL_IMAGE = "/assets/farm-basemap.jpg";

function satellite(maxZoom = 18) {
  return {
    tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
    maxZoom,
    attribution: "Example attribution",
  };
}

function select(farm, latch = INITIAL_LATCH) {
  return selectBasemap(parseFarmBasemap(farm.basemap ?? {}), {
    latch,
    hives: Array.isArray(farm.hives) ? farm.hives : [],
  });
}

function viewOf(farm, latch = INITIAL_LATCH) {
  return resolveFarmView(farm, select(farm, latch));
}

describe("resolveFarmView", () => {
  it("lets HiveMap fit hive GPS and takes maxZoom from the satellite selection", () => {
    const farm = {
      basemap: {
        satellite: satellite(18),
        fallback: { image: STILL_IMAGE, bounds: BOUNDS_500_M },
      },
      center: [-15, -48],
      bounds: BOUNDS_500_M,
      hives: [
        { lat: null, lng: null },
        { latitude: -23.1, longitude: -46.2 },
        { lat: Number.NaN, lng: 1 },
      ],
    };

    expect(viewOf(farm)).toEqual({ maxZoom: 18, source: "hives" });
    expect(viewOf(example)).toEqual({ maxZoom: 18, source: "hives" });
    expect(farm.basemap.bounds).toBeUndefined();
  });

  it("fits hive pins on a still and leaves centre and maxZoom off the view", () => {
    const farm = {
      id: "pic",
      basemap: {
        image: STILL_IMAGE,
        bounds: BOUNDS_500_M,
        satellite: satellite(18),
      },
      hives: [{ lat: -15, lng: -48 }, { lat: null, lng: null }],
      address: "",
    };
    const selection = select(farm);
    const view = resolveFarmView(farm, selection);

    expect(selection.kind).toBe("still");
    expect(view).toEqual({ source: "hives" });
    expect(view.center).toBeUndefined();
    expect(view.maxZoom).toBeUndefined();
    expect(farmViewKey(farm, view, selection.kind)).toBe("pic:hives:1:-15:-48:-15:-48:still");
  });

  it("uses farm centre and bounds before the still box", () => {
    const withBoth = {
      basemap: { image: STILL_IMAGE, bounds: [[-1, -1], [1, 1]], satellite: satellite() },
      center: [-15, -48],
      bounds: BOUNDS_500_M,
      address: "",
    };
    expect(viewOf(withBoth)).toEqual({
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });

    const centreOnly = {
      basemap: { image: STILL_IMAGE, bounds: [[-1, -1], [1, 1]] },
      center: [-15, -48],
      address: "",
    };
    expect(viewOf(centreOnly)).toEqual({
      source: "center",
      center: [-15, -48],
      zoom: 16,
    });
  });

  it("fits the still box when the farm has no pins and no place", () => {
    const farm = {
      id: "pic",
      basemap: {
        image: STILL_IMAGE,
        bounds: BOUNDS_500_M,
        satellite: satellite(18),
        fallback: { image: STILL_IMAGE, bounds: [[-1, -1], [1, 1]] },
      },
      hives: [],
      address: "",
    };
    const selection = select(farm);
    const view = resolveFarmView(farm, selection);

    expect(selection.kind).toBe("still");
    expect(selection.paint.bounds).toEqual(BOUNDS_500_M);
    expect(view).toEqual({
      source: "still",
      center: [-15, -48],
      zoom: 16,
    });
    expect(farmViewKey(farm, view, selection.kind)).toBe("pic:still:-15:-48:16:still");
  });

  it("returns the given centre and a zoom of 16 when the bounds span about 500 m", () => {
    const farm = {
      basemap: { satellite: satellite() },
      center: [-15, -48],
      bounds: BOUNDS_500_M,
      hives: [{ lat: null, lng: null }],
    };
    const before = JSON.parse(JSON.stringify(farm));

    expect(viewOf(farm)).toEqual({
      maxZoom: 18,
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });
    expect(farm).toEqual(before);
    expect(farm.basemap.bounds).toBeUndefined();
  });

  it("keeps a wide farm inside the calm zoom band", () => {
    expect(viewOf({
      basemap: { satellite: satellite() },
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
    expect(viewOf({
      basemap: { satellite: satellite() },
      center: [-15, -48],
      address: "",
    })).toEqual({
      maxZoom: 18,
      source: "center",
      center: [-15, -48],
      zoom: 16,
    });

    expect(viewOf({
      basemap: { satellite: satellite(14) },
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
    const addressed = viewOf({
      basemap: { satellite: satellite() },
      address: "Sítio exemplo",
      hives: [{ lat: null, lng: null }, { latitude: null, longitude: null }],
      center: [null, null],
    });
    const empty = viewOf({
      basemap: { satellite: satellite() },
      address: "",
      hives: [{ lat: null, lng: 4 }],
    });
    const absent = viewOf({
      basemap: { satellite: satellite() },
      hives: [],
    });

    expect(addressed).toEqual({ maxZoom: 18, source: "placeholder" });
    expect(empty).toEqual(absent);
    expect(absent).toEqual({ maxZoom: 18, source: "placeholder" });
  });

  it("does not read maxZoom or sample bounds while satellite is selected", () => {
    const tiles = {
      basemap: {
        satellite: satellite(18),
        fallback: { image: STILL_IMAGE, bounds: BOUNDS_500_M },
      },
      hives: [],
      address: "",
    };
    const selection = select(tiles);
    expect(selection.kind).toBe("satellite");
    expect(selection.paint.bounds).toBeUndefined();
    expect(resolveFarmView(tiles, selection)).toEqual({ maxZoom: 18, source: "placeholder" });

    const pins = viewOf({
      basemap: { fallback: { image: STILL_IMAGE, bounds: BOUNDS_500_M } },
      hives: [{ lat: "1", lng: "2" }],
    });
    expect(pins).toEqual({ source: "hives" });

    const farmBox = viewOf({
      basemap: { fallback: { image: STILL_IMAGE, bounds: [[-1, -1], [1, 1]] } },
      bounds: BOUNDS_500_M,
    });
    expect(farmBox).toEqual({
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });
  });

  it("fits the sample image when tiles have failed and the farm has no place", () => {
    const farm = {
      basemap: {
        satellite: satellite(),
        fallback: { image: STILL_IMAGE, bounds: BOUNDS_500_M },
      },
      hives: [],
      address: "",
    };
    const latch = nextLoadLatch(INITIAL_LATCH, { type: "tiles-hard" });
    const selection = select(farm, latch);

    expect(selection.kind).toBe("sample");
    expect(resolveFarmView(farm, selection)).toEqual({
      source: "bounds",
      center: [-15, -48],
      zoom: 16,
    });
  });

  it("changes the map key when hive GPS or the basemap kind changes", () => {
    const here = {
      id: "api-1",
      basemap: { satellite: satellite() },
      hives: [{ lat: -10.5, lng: -40.5 }, { lat: null, lng: null }, { lat: -10, lng: -40 }],
    };
    const hereSelection = select(here);
    expect(farmViewKey(here, resolveFarmView(here, hereSelection), hereSelection.kind))
      .toBe("api-1:hives:2:-10.5:-40.5:-10:-40:satellite");

    const moved = {
      id: "api-1",
      basemap: { satellite: satellite() },
      hives: [{ lat: -1, lng: -2 }],
    };
    const movedSelection = select(moved);
    expect(farmViewKey(moved, resolveFarmView(moved, movedSelection), movedSelection.kind))
      .toBe("api-1:hives:1:-1:-2:-1:-2:satellite");

    const empty = { basemap: { satellite: satellite() } };
    const emptySelection = select(empty);
    expect(farmViewKey(empty, resolveFarmView(empty, emptySelection), emptySelection.kind))
      .toBe("farm:placeholder:satellite");
  });

  it("rejects a selection that skipped the parser", () => {
    const farm = { basemap: { satellite: satellite() }, hives: [] };
    const selection = select(farm);
    expect(() => resolveFarmView(farm, { ...selection })).toThrow(/selection/);
    expect(() => resolveFarmView(farm, { kind: "still", paint: { image: STILL_IMAGE, bounds: BOUNDS_500_M } })).toThrow(/selection/);
  });
});
