import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { resolveBasemap } from "./resolveBasemap.js";

const EOX_TILES = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";
const EOX_ATTR = "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)";
const SAMPLE_ATTR = "Imagem de satélite: exemplo · coordenadas ilustrativas";
const SAMPLE_ALT = "Imagem de satélite da propriedade";
const SAMPLE_IMAGE = "/assets/farm-basemap.jpg";
const SAMPLE_BOUNDS = [[-23.949258, -46.988093], [-23.946742, -46.983907]];
const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
const STATUS_NONE = "Satélite ao vivo indisponível no momento.";
const TILE_KEYS = ["attribution", "maxZoom", "minZoom", "tiles"];
const IMAGE_KEYS = ["alt", "attribution", "bounds", "image"];

const SAT = {
  tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
  maxZoom: 18,
  attribution: "Example attribution",
};
const FB = {
  image: SAMPLE_IMAGE,
  bounds: [[-1, -1], [1, 1]],
  attribution: SAMPLE_ATTR,
  alt: SAMPLE_ALT,
};

describe("resolveBasemap", () => {
  it("paints the locked EOX 2025 tiles for the sample farm", () => {
    const healthy = resolveBasemap(example.basemap, { hives: example.hives });

    expect(healthy.basemap.tiles).toBe(EOX_TILES);
    expect(healthy.basemap.attribution).toBe(EOX_ATTR);
    expect(healthy.basemap.maxZoom).toBe(18);
    expect(healthy.basemap.minZoom).toBe(0);
    expect(Object.keys(healthy.basemap).sort()).toEqual(TILE_KEYS);
    expect(healthy.status).toBe(null);
    expect(healthy.probeUrl).toBe(
      "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/18/149041/96857.jpg",
    );
  });

  it("paints the saved farm image when tiles have failed", () => {
    const failed = resolveBasemap(example.basemap, { hives: example.hives, tilesFailed: true });

    expect(failed.basemap.image).toBe(SAMPLE_IMAGE);
    expect(failed.basemap.bounds).toEqual(SAMPLE_BOUNDS);
    expect(failed.basemap.attribution).toBe(SAMPLE_ATTR);
    expect(failed.basemap.alt).toBe(SAMPLE_ALT);
    expect(Object.keys(failed.basemap).sort()).toEqual(IMAGE_KEYS);
    expect(failed.probeUrl).toBe(null);
    expect(failed.status).toBe(STATUS_IMAGE);

    failed.basemap.bounds[0][0] = 0;
    expect(example.basemap.fallback.bounds[0][0]).toBe(-23.949258);
  });

  it("returns exactly one mode for every slot combination", () => {
    const probe = "https://tiles.example/18/130343/131800.jpg";
    const cases = [
      { config: { satellite: SAT, fallback: FB }, tilesFailed: false, keys: TILE_KEYS, probeUrl: probe, status: null },
      { config: { satellite: SAT, fallback: FB }, tilesFailed: true, keys: IMAGE_KEYS, probeUrl: null, status: STATUS_IMAGE },
      { config: { satellite: { ...SAT, alt: "leak" } }, tilesFailed: false, keys: TILE_KEYS, probeUrl: probe, status: null },
      { config: { satellite: SAT }, tilesFailed: false, keys: TILE_KEYS, probeUrl: probe, status: null },
      { config: { satellite: SAT }, tilesFailed: true, keys: null, probeUrl: null, status: STATUS_NONE },
      { config: { fallback: { ...FB, foo: "leak" } }, tilesFailed: false, keys: IMAGE_KEYS, probeUrl: null, status: null },
      { config: { fallback: FB }, tilesFailed: true, keys: IMAGE_KEYS, probeUrl: null, status: null },
      { config: {}, tilesFailed: false, keys: null, probeUrl: null, status: null },
      { config: {}, tilesFailed: true, keys: null, probeUrl: null, status: null },
    ];

    for (const entry of cases) {
      const result = resolveBasemap(entry.config, {
        hives: [{ lat: 1, lng: 1 }],
        tilesFailed: entry.tilesFailed,
      });
      expect(result.probeUrl).toBe(entry.probeUrl);
      expect(result.status).toBe(entry.status);
      if (entry.keys == null) {
        expect(result.basemap).toBe(undefined);
      } else {
        expect(Object.keys(result.basemap).sort()).toEqual(entry.keys);
      }
    }
  });

  it("announces a plain map when tiles fail and there is no fallback image", () => {
    const result = resolveBasemap(
      { satellite: example.basemap.satellite },
      { hives: example.hives, tilesFailed: true },
    );

    expect(result.basemap).toBe(undefined);
    expect(result.probeUrl).toBe(null);
    expect(result.status).toBe(STATUS_NONE);
  });

  it("shows a static farm with no status and no probe", () => {
    const result = resolveBasemap(
      { fallback: example.basemap.fallback },
      { hives: example.hives },
    );

    expect(result.basemap.image).toBe(SAMPLE_IMAGE);
    expect(result.basemap.bounds).toEqual(SAMPLE_BOUNDS);
    expect(Object.keys(result.basemap).sort()).toEqual(IMAGE_KEYS);
    expect(result.status).toBe(null);
    expect(result.probeUrl).toBe(null);
  });

  it("probes the hive box, then the fallback centre, at satellite maxZoom", () => {
    const noHives = resolveBasemap(
      { satellite: SAT, fallback: FB },
      { hives: [] },
    );
    expect(noHives.probeUrl).toBe("https://tiles.example/18/131072/131072.jpg");

    const noTarget = resolveBasemap({ satellite: SAT }, { hives: [] });
    expect(noTarget.basemap.tiles).toBe(SAT.tiles);
    expect(noTarget.probeUrl).toBe(null);
    expect(noTarget.status).toBe(null);

    const zoomed = resolveBasemap(
      { satellite: { ...SAT, maxZoom: 16 }, fallback: FB },
      { hives: [{ lat: 0, lng: 0 }] },
    );
    expect(zoomed.basemap.maxZoom).toBe(16);
    expect(zoomed.probeUrl).toBe("https://tiles.example/16/32768/32768.jpg");
  });

  it("rejects a flat basemap, a mixed slot, a broken template, and a mismatched mosaic year", () => {
    expect(() => resolveBasemap({ image: SAMPLE_IMAGE, bounds: SAMPLE_BOUNDS })).toThrow(/basemap\.image/);
    expect(() => resolveBasemap({
      satellite: { ...SAT, image: SAMPLE_IMAGE },
    })).toThrow(/basemap\.satellite\.image/);
    expect(() => resolveBasemap({
      fallback: { ...FB, tiles: SAT.tiles },
    })).toThrow(/basemap\.fallback\.tiles/);
    expect(() => resolveBasemap({
      satellite: { tiles: "https://tiles.example/{z}/{y}.jpg", maxZoom: 18, attribution: "Example" },
    })).toThrow(/\{x\}/);
    expect(() => resolveBasemap({
      satellite: {
        tiles: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        maxZoom: 18,
        attribution: EOX_ATTR,
      },
    })).toThrow(/mosaic year 2024/);
  });
});
