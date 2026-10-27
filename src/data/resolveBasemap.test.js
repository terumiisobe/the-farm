import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import {
  INITIAL_LATCH,
  farmCentre,
  nextLoadLatch,
  parseFarmBasemap,
  preloadTileUrls,
  selectBasemap,
  tileUrl,
} from "./resolveBasemap.js";

const EOX_TILES = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";
const EOX_ATTR = "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)";
const SAMPLE_ATTR = "Imagem de satélite: exemplo · coordenadas ilustrativas";
const SAMPLE_ALT = "Imagem de satélite da propriedade";
const SAMPLE_IMAGE = "/assets/farm-basemap.png";
const SAMPLE_BOUNDS = [[-25.762862, -49.189754], [-25.761621, -49.188175]];
const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
const STATUS_NONE = "Satélite ao vivo indisponível no momento.";
const STATUS_SOFT = "Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.";
const STATUS_LIMITED_TILES = "Sem imagem da propriedade. Mostrando satélite com detalhe limitado.";
const STATUS_LIMITED_SAMPLE = "Sem imagem da propriedade. Mostrando a imagem de exemplo.";
const SAMPLE_PROBE = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37624/23813.jpg";
const PRELOAD_URLS = [
  SAMPLE_PROBE,
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37624/23814.jpg",
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37624/23812.jpg",
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37625/23813.jpg",
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37623/23813.jpg",
];
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

function choose(config, latch = INITIAL_LATCH, hives = []) {
  return selectBasemap(parseFarmBasemap(config), { latch, hives });
}

describe("parseFarmBasemap and selectBasemap", () => {
  it("paints the farm still with a null probe and no tile fields", () => {
    const raw = {
      image: SAMPLE_IMAGE,
      bounds: SAMPLE_BOUNDS,
      attribution: "Operador",
      satellite: example.basemap.satellite,
      fallback: example.basemap.fallback,
    };
    const chosen = choose(raw, INITIAL_LATCH, []);

    expect(chosen.kind).toBe("still");
    expect(chosen.paint.image).toBe(SAMPLE_IMAGE);
    expect(chosen.paint.bounds).toEqual(SAMPLE_BOUNDS);
    expect(chosen.paint.attribution).toBe("Operador");
    expect(chosen.paint.tiles).toBeUndefined();
    expect(chosen.probeUrl).toBe(null);
    expect(chosen.status).toBe(null);
    expect(Object.keys(chosen.paint).sort()).toEqual(["attribution", "bounds", "image"]);

    chosen.paint.bounds[0][0] = 0;
    expect(raw.bounds[0][0]).toBe(-25.762862);
  });

  it("keeps the still while it is open or shown", () => {
    const shown = nextLoadLatch(INITIAL_LATCH, { type: "still-shown" });
    expect(choose(stillConfig(), INITIAL_LATCH).kind).toBe("still");
    expect(choose(stillConfig(), shown).kind).toBe("still");
    expect(shown).toEqual({ still: "shown", tiles: "open" });
  });

  it("rejects a still slot, a flat tile url, a half pair, and a reversed box", () => {
    expect(() => parseFarmBasemap({
      still: { image: SAMPLE_IMAGE, bounds: SAMPLE_BOUNDS },
    })).toThrow(/basemap\.image/);
    expect(() => parseFarmBasemap({
      tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
    })).toThrow(/basemap\.satellite/);
    expect(() => parseFarmBasemap({ image: SAMPLE_IMAGE })).toThrow(/basemap\.bounds/);
    expect(() => parseFarmBasemap({ bounds: SAMPLE_BOUNDS })).toThrow(/basemap\.image/);
    expect(() => parseFarmBasemap({
      image: SAMPLE_IMAGE,
      bounds: [[-23.94, -46.98], [-23.95, -46.97]],
    })).toThrow(/south to north/);
    expect(() => parseFarmBasemap({
      image: SAMPLE_IMAGE,
      bounds: [[-23.95, -46.98], [-23.94, -46.99]],
    })).toThrow(/west to east/);
    expect(() => parseFarmBasemap(null)).toThrow(/basemap/);
    expect(() => parseFarmBasemap([])).toThrow(/basemap/);
  });

  it("rejects a mixed slot, a broken template, and a mismatched mosaic year", () => {
    expect(() => parseFarmBasemap({
      satellite: { ...SAT, image: SAMPLE_IMAGE },
    })).toThrow(/basemap\.satellite\.image/);
    expect(() => parseFarmBasemap({
      fallback: { ...FB, tiles: SAT.tiles },
    })).toThrow(/basemap\.fallback\.tiles/);
    expect(() => parseFarmBasemap({
      satellite: { tiles: "https://tiles.example/{z}/{y}.jpg", maxZoom: 18, attribution: "Example" },
    })).toThrow(/\{x\}/);
    expect(() => parseFarmBasemap({
      satellite: {
        tiles: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        maxZoom: 18,
        attribution: EOX_ATTR,
      },
    })).toThrow(/mosaic year 2024/);
  });

  it("paints EOX with no bounds when the payload omits a still", () => {
    const eoxOnly = {
      satellite: example.basemap.satellite,
      fallback: example.basemap.fallback,
    };
    const chosen = choose(eoxOnly, INITIAL_LATCH, example.hives);

    expect(eoxOnly.image).toBeUndefined();
    expect(chosen.kind).toBe("satellite");
    expect(chosen.paint.tiles).toBe(EOX_TILES);
    expect(chosen.paint.attribution).toBe(EOX_ATTR);
    expect(chosen.paint.maxZoom).toBe(18);
    expect(chosen.paint.minZoom).toBe(0);
    expect(chosen.paint.bounds).toBeUndefined();
    expect(chosen.paint.image).toBeUndefined();
    expect(Object.keys(chosen.paint).sort()).toEqual(TILE_KEYS);
    expect(chosen.status).toBe(STATUS_LIMITED_TILES);
    expect(chosen.probeUrl).toBe(SAMPLE_PROBE);
    expect(chosen.preloadUrls).toEqual(PRELOAD_URLS);
  });

  it("falls back to EOX once when the still fails, and a repeat failure is the same latch", () => {
    const catalog = parseFarmBasemap(stillConfig());
    const failed = nextLoadLatch(INITIAL_LATCH, { type: "still-failed" });
    const again = nextLoadLatch(failed, { type: "still-failed" });
    const late = nextLoadLatch(failed, { type: "still-shown" });

    expect(again).toBe(failed);
    expect(late).toBe(failed);
    const chosen = selectBasemap(catalog, { latch: again, hives: [] });
    expect(chosen.kind).toBe("satellite");
    expect(chosen.paint.bounds).toBeUndefined();
    expect(chosen.paint.tiles).toBe(SAT.tiles);
    expect(chosen.status).toBe(STATUS_LIMITED_TILES);
    expect(chosen.probeUrl).toBe("https://tiles.example/16/37624/23813.jpg");
  });

  it("keeps a decoded still when a later failure arrives", () => {
    const shown = nextLoadLatch(INITIAL_LATCH, { type: "still-shown" });
    const stuck = nextLoadLatch(shown, { type: "still-failed" });

    expect(stuck).toBe(shown);
    expect(choose(stillConfig(), stuck).kind).toBe("still");
  });

  it("keeps live tiles on a soft fail and does not return the still", () => {
    const failed = nextLoadLatch(INITIAL_LATCH, { type: "still-failed" });
    const soft = nextLoadLatch(failed, { type: "tiles-soft" });
    const chosen = choose(stillConfig(), soft, example.hives);

    expect(chosen.kind).toBe("satellite");
    expect(chosen.status).toBe(STATUS_SOFT);
    expect(chosen.paint.image).toBeUndefined();
    expect(chosen.paint.bounds).toBeUndefined();
    expect(chosen.paint.tiles).toBe(SAT.tiles);
    expect(chosen.probeUrl).toBe("https://tiles.example/16/37624/23813.jpg");
    expect(nextLoadLatch(soft, { type: "tiles-soft" })).toBe(soft);
  });

  it("paints the saved image only after tiles have hard-failed", () => {
    const hard = nextLoadLatch(INITIAL_LATCH, { type: "tiles-hard" });
    const again = nextLoadLatch(hard, { type: "tiles-hard" });
    const fromSoft = nextLoadLatch(nextLoadLatch(INITIAL_LATCH, { type: "tiles-soft" }), { type: "tiles-hard" });
    const eoxOnly = {
      satellite: example.basemap.satellite,
      fallback: example.basemap.fallback,
    };
    const chosen = choose(eoxOnly, again, example.hives);

    expect(again).toBe(hard);
    expect(fromSoft.tiles).toBe("failed");
    expect(chosen.kind).toBe("sample");
    expect(chosen.paint.image).toBe(SAMPLE_IMAGE);
    expect(chosen.paint.bounds).toEqual(SAMPLE_BOUNDS);
    expect(chosen.paint.attribution).toBe(SAMPLE_ATTR);
    expect(chosen.paint.alt).toBe(SAMPLE_ALT);
    expect(Object.keys(chosen.paint).sort()).toEqual(IMAGE_KEYS);
    expect(chosen.probeUrl).toBe(null);
    expect(chosen.status).toBe(STATUS_IMAGE);

    chosen.paint.bounds[0][0] = 0;
    expect(example.basemap.fallback.bounds[0][0]).toBe(-25.762862);
  });

  it("names limited imagery for a sample that is not covering a tile failure", () => {
    const chosen = choose({ fallback: FB });

    expect(chosen.kind).toBe("sample");
    expect(chosen.status).toBe(STATUS_LIMITED_SAMPLE);
    expect(chosen.probeUrl).toBe(null);
    expect(Object.keys(chosen.paint).sort()).toEqual(IMAGE_KEYS);
  });

  it("returns an empty paint when nothing is left to show", () => {
    expect(choose({}).kind).toBe("empty");
    expect(choose({}).paint).toBeUndefined();
    expect(choose({}).status).toBe(null);
    expect(choose({}).probeUrl).toBe(null);

    const tilesFailed = nextLoadLatch(INITIAL_LATCH, { type: "tiles-hard" });
    expect(choose({ satellite: SAT }, tilesFailed).kind).toBe("empty");
    expect(choose({ satellite: SAT }, tilesFailed).status).toBe(STATUS_NONE);

    const stillFailed = nextLoadLatch(INITIAL_LATCH, { type: "still-failed" });
    expect(choose({}, stillFailed).status).toBe(STATUS_LIMITED_SAMPLE);
    expect(choose({}, nextLoadLatch(stillFailed, { type: "tiles-hard" })).status).toBe(STATUS_NONE);

    const sample = choose({ fallback: FB }, tilesFailed);
    expect(sample.kind).toBe("sample");
    expect(sample.status).toBe(STATUS_IMAGE);
  });

  it("probes the hive box, then the sample centre, and never the still box", () => {
    const failed = nextLoadLatch(INITIAL_LATCH, { type: "still-failed" });
    const hiveProbe = choose(
      { image: SAMPLE_IMAGE, bounds: [[-40, -40], [-39, -39]], satellite: SAT, fallback: FB },
      failed,
      [{ lat: 1, lng: 1 }],
    );
    expect(hiveProbe.probeUrl).toBe("https://tiles.example/16/32585/32950.jpg");

    const sampleProbe = choose(
      { image: SAMPLE_IMAGE, bounds: [[-40, -40], [-39, -39]], satellite: SAT, fallback: FB },
      failed,
      [],
    );
    expect(sampleProbe.probeUrl).toBe("https://tiles.example/16/32768/32768.jpg");
    expect(sampleProbe.preloadUrls).toHaveLength(5);

    const noTarget = choose({ satellite: SAT }, INITIAL_LATCH, []);
    expect(noTarget.probeUrl).toBe(null);
    expect(noTarget.preloadUrls).toEqual([]);
    expect(noTarget.status).toBe(STATUS_LIMITED_TILES);
  });

  it("drops extra keys and refuses a raw payload", () => {
    const tiles = choose({ satellite: { ...SAT, alt: "leak" } }, INITIAL_LATCH, [{ lat: 1, lng: 1 }]);
    expect(Object.keys(tiles.paint).sort()).toEqual(TILE_KEYS);

    const image = choose({ fallback: { ...FB, foo: "leak" } });
    expect(Object.keys(image.paint).sort()).toEqual(IMAGE_KEYS);

    const still = choose({ image: SAMPLE_IMAGE, bounds: [[-2, -2], [2, 2]], minZoom: 4, note: "skip" });
    expect(still.kind).toBe("still");
    expect(still.paint.minZoom).toBeUndefined();
    expect(Object.keys(still.paint).sort()).toEqual(["bounds", "image"]);

    expect(() => selectBasemap(example.basemap, { latch: INITIAL_LATCH, hives: [] })).toThrow(/catalog/);
    expect(() => selectBasemap(parseFarmBasemap({}), { latch: { still: "open", tiles: "nope" }, hives: [] })).toThrow(/latch/);
    expect(() => selectBasemap(parseFarmBasemap({}), { latch: INITIAL_LATCH, hives: null })).toThrow(/hives/);
    expect(() => nextLoadLatch(INITIAL_LATCH, { type: "nope" })).toThrow(/nope/);
    expect(nextLoadLatch(INITIAL_LATCH, { type: "reset" })).toBe(INITIAL_LATCH);
  });
});

describe("tile urls", () => {
  it("shares the sample centre tile and its four neighbours", () => {
    const centre = farmCentre(example.hives, example.basemap.fallback);
    expect(centre).toEqual([-25.762132528219396, -49.18933347802198]);
    expect(tileUrl(EOX_TILES, centre, 16)).toBe(SAMPLE_PROBE);
    expect(preloadTileUrls(EOX_TILES, centre)).toEqual(PRELOAD_URLS);
  });

  it("ignores null pins when it picks a probe centre", () => {
    const onlyNull = farmCentre(
      [{ lat: null, lng: null }, { latitude: null, longitude: 1 }],
      { bounds: [[-2, -4], [0, -2]] },
    );
    expect(onlyNull).toEqual([-1, -3]);

    const mixed = farmCentre(
      [{ lat: null, lng: null }, { latitude: 10, longitude: 20 }],
      null,
    );
    expect(mixed).toEqual([10, 20]);
  });
});

function stillConfig() {
  return {
    image: SAMPLE_IMAGE,
    bounds: [[-40, -40], [-39, -39]],
    satellite: SAT,
    fallback: example.basemap.fallback,
  };
}
