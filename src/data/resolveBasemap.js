import { pinLatLng } from "./statusMap.js";

/** @typedef {import("../bombus/bombus").Hive} Hive */

const catalogBrand = Symbol("BasemapCatalog");
const selectionBrand = Symbol("BasemapSelection");

/** @type {readonly ["still", "satellite", "sample"]} */
const ORDER = ["still", "satellite", "sample"];

const STILL_STATES = new Set(["open", "shown", "failed"]);
const TILE_STATES = new Set(["open", "soft", "failed"]);

const STILL_NEXT = {
  "still-shown": { open: "shown", shown: "shown", failed: "failed" },
  "still-failed": { open: "failed", shown: "shown", failed: "failed" },
};
const TILES_NEXT = {
  "tiles-soft": { open: "soft", soft: "soft", failed: "failed" },
  "tiles-hard": { open: "failed", soft: "failed", failed: "failed" },
};

export const PROBE_ZOOM = 16;
export const INITIAL_LATCH = Object.freeze({ still: "open", tiles: "open" });

export const STATUS_SOFT = "Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.";
export const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
export const STATUS_NONE = "Satélite ao vivo indisponível no momento.";
export const STATUS_LIMITED_TILES = "Sem imagem da propriedade. Mostrando satélite com detalhe limitado.";
export const STATUS_LIMITED_SAMPLE = "Sem imagem da propriedade. Mostrando a imagem de exemplo.";

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Parse wire `farm.basemap` into a catalog.
 * Top-level `image` and `bounds` are the farm still. `fallback` becomes kind `sample`.
 *
 * @param {unknown} raw
 */
export function parseFarmBasemap(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("basemap must be an object");
  }
  if (Object.hasOwn(raw, "still")) {
    throw new Error("basemap.still is not a slot. Put the farm picture on basemap.image and basemap.bounds.");
  }
  if (Object.hasOwn(raw, "tiles")) {
    throw new Error("basemap.tiles is not a slot. Put tiles on basemap.satellite.");
  }
  const stillPair = readImagePair(raw, "basemap", false);
  const catalog = {
    still: stillPair == null ? null : Object.freeze({ kind: "still", ...stillPair }),
    satellite: raw.satellite == null ? null : Object.freeze({ kind: "satellite", ...parseSatellite(raw.satellite) }),
    sample: raw.fallback == null ? null : Object.freeze({ kind: "sample", ...parseSample(raw.fallback) }),
  };
  return stamp(catalogBrand, catalog);
}

/**
 * Pick one tagged selection. Satellite paint has no bounds. Still paint has no tiles.
 *
 * @param {object} catalog
 * @param {{ latch: { still: string, tiles: string }, hives: Hive[] }} demand
 */
export function selectBasemap(catalog, demand) {
  if (!catalog || catalog[catalogBrand] !== true) {
    throw new Error("selectBasemap requires a parsed basemap catalog");
  }
  if (demand == null || typeof demand !== "object") {
    throw new Error("selectBasemap requires latch and hives");
  }
  const { latch, hives } = demand;
  assertLatch(latch, "selectBasemap requires a load latch");
  if (!Array.isArray(hives)) throw new Error("selectBasemap requires hives");

  for (const kind of ORDER) {
    if (kind === "still" && catalog.still && latch.still !== "failed") {
      return stamp(selectionBrand, {
        kind: "still",
        paint: imagePaint(catalog.still),
        probeUrl: null,
        status: null,
      });
    }
    if (kind === "satellite" && catalog.satellite && latch.tiles !== "failed") {
      return stamp(selectionBrand, satelliteSelection(catalog.satellite, catalog.sample, latch, hives));
    }
    if (kind === "sample" && catalog.sample) {
      return stamp(selectionBrand, {
        kind: "sample",
        paint: imagePaint(catalog.sample),
        probeUrl: null,
        status: latch.tiles === "failed" ? STATUS_IMAGE : STATUS_LIMITED_SAMPLE,
      });
    }
  }
  return stamp(selectionBrand, {
    kind: "empty",
    paint: undefined,
    probeUrl: null,
    status: emptyStatus(latch),
  });
}

/**
 * Idempotent latch step. Returns the same reference when both fields stay put.
 *
 * @param {{ still: string, tiles: string }} latch
 * @param {{ type: string }} event
 */
export function nextLoadLatch(latch, event) {
  assertLatch(latch, "nextLoadLatch requires a load latch");
  if (event == null || typeof event.type !== "string") {
    throw new Error("nextLoadLatch requires a load event");
  }
  if (event.type === "reset") return INITIAL_LATCH;
  const stillStep = STILL_NEXT[event.type];
  const tilesStep = TILES_NEXT[event.type];
  if (!stillStep && !tilesStep) throw new Error(`unknown load event ${event.type}`);
  const still = stillStep ? stillStep[latch.still] : latch.still;
  const tiles = tilesStep ? tilesStep[latch.tiles] : latch.tiles;
  if (still === latch.still && tiles === latch.tiles) return latch;
  return Object.freeze({ still, tiles });
}

export function isBasemapSelection(selection) {
  return Boolean(selection && selection[selectionBrand] === true);
}

function emptyStatus(latch) {
  if (latch.tiles === "failed") return STATUS_NONE;
  if (latch.still === "failed") return STATUS_LIMITED_SAMPLE;
  return null;
}

function satelliteSelection(satellite, sample, latch, hives) {
  const centre = farmCentre(hives, sample);
  return {
    kind: "satellite",
    paint: {
      tiles: satellite.tiles,
      minZoom: satellite.minZoom,
      maxZoom: satellite.maxZoom,
      attribution: satellite.attribution,
    },
    probeUrl: centre ? tileUrl(satellite.tiles, centre, PROBE_ZOOM) : null,
    preloadUrls: Object.freeze(centre ? preloadTileUrls(satellite.tiles, centre) : []),
    status: latch.tiles === "soft" ? STATUS_SOFT : STATUS_LIMITED_TILES,
  };
}

function imagePaint(arm) {
  const paint = {
    image: arm.image,
    bounds: arm.bounds.map((pair) => [pair[0], pair[1]]),
  };
  if (arm.attribution != null) paint.attribution = arm.attribution;
  if (arm.alt != null) paint.alt = arm.alt;
  return paint;
}

function stamp(brand, value) {
  if (value.paint) Object.freeze(value.paint);
  Object.defineProperty(value, brand, { value: true });
  return Object.freeze(value);
}

function assertLatch(latch, message) {
  if (!latch || !STILL_STATES.has(latch.still) || !TILE_STATES.has(latch.tiles)) {
    throw new Error(message);
  }
}

function readImagePair(raw, slot, rejectTileFields) {
  const hasImage = Object.hasOwn(raw, "image");
  const hasBounds = Object.hasOwn(raw, "bounds");
  if (!hasImage && !hasBounds) return null;
  if (rejectTileFields) {
    const field = ["tiles", "maxZoom", "minZoom"].find((name) => Object.hasOwn(raw, name));
    if (field) throw new Error(`${slot}.${field} is not allowed`);
  }
  if (!hasImage) throw new Error(`${slot}.bounds requires ${slot}.image`);
  if (typeof raw.image !== "string" || raw.image.length === 0) {
    throw new Error(`${slot}.image is required`);
  }
  if (!hasBounds) throw new Error(`${slot}.image requires ${slot}.bounds`);
  const record = {
    image: raw.image,
    bounds: parseBounds(raw.bounds, slot),
  };
  if (raw.attribution != null) {
    if (typeof raw.attribution !== "string") throw new Error(`${slot}.attribution must be a string`);
    record.attribution = raw.attribution;
  }
  if (raw.alt != null) {
    if (typeof raw.alt !== "string") throw new Error(`${slot}.alt must be a string`);
    record.alt = raw.alt;
  }
  return record;
}

function parseSample(slot) {
  if (slot == null || typeof slot !== "object" || Array.isArray(slot)) {
    throw new Error("basemap.fallback must be an object");
  }
  const sample = readImagePair(slot, "basemap.fallback", true);
  if (sample == null) throw new Error("basemap.fallback.image is required");
  return sample;
}

function parseSatellite(slot) {
  if (slot == null || typeof slot !== "object" || Array.isArray(slot)) {
    throw new Error("basemap.satellite must be an object");
  }
  if (Object.hasOwn(slot, "image") || Object.hasOwn(slot, "bounds")) {
    const field = Object.hasOwn(slot, "image") ? "image" : "bounds";
    throw new Error(`basemap.satellite.${field} is not allowed`);
  }
  const tiles = slot.tiles;
  for (const token of ["{z}", "{x}", "{y}"]) {
    if (typeof tiles !== "string" || !tiles.includes(token)) {
      throw new Error(`basemap.satellite.tiles must contain ${token}`);
    }
  }
  if (typeof slot.maxZoom !== "number" || !Number.isFinite(slot.maxZoom)) {
    throw new Error("basemap.satellite.maxZoom must be a number");
  }
  if (typeof slot.attribution !== "string" || slot.attribution.length === 0) {
    throw new Error("basemap.satellite.attribution is required");
  }
  if (slot.minZoom != null && (typeof slot.minZoom !== "number" || !Number.isFinite(slot.minZoom))) {
    throw new Error("basemap.satellite.minZoom must be a number");
  }
  // EOX licence text has to name the same mosaic year as the s2cloudless URL.
  const urlYear = /s2cloudless-(\d{4})/.exec(tiles);
  if (urlYear) {
    const attrYear = /Sentinel data (\d{4})/.exec(slot.attribution);
    if (!attrYear || attrYear[1] !== urlYear[1]) {
      throw new Error(`basemap.satellite attribution year must match tiles mosaic year ${urlYear[1]}`);
    }
  }
  return {
    tiles,
    minZoom: slot.minZoom == null ? 0 : slot.minZoom,
    maxZoom: slot.maxZoom,
    attribution: slot.attribution,
  };
}

function parseBounds(bounds, slot) {
  if (!Array.isArray(bounds) || bounds.length !== 2) {
    throw new Error(`${slot}.bounds must be [[south, west], [north, east]]`);
  }
  const box = bounds.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new Error(`${slot}.bounds must be [[south, west], [north, east]]`);
    }
    return [pair[0], pair[1]];
  });
  const [[south, west], [north, east]] = box;
  if (south >= north || west >= east) {
    throw new Error(`${slot}.bounds must run south to north and west to east`);
  }
  return box;
}

export function farmCentre(hives = [], fallback = null) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let count = 0;
  for (const hive of hives) {
    const pin = pinLatLng(hive);
    if (!pin) continue;
    const [lat, lng] = pin;
    count += 1;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (count > 0) return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
  if (!fallback) return null;
  const [[south, west], [north, east]] = fallback.bounds;
  return [(south + north) / 2, (west + east) / 2];
}

function tileXY(lat, lng, z) {
  const n = 2 ** z;
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const s = Math.sin((clamped * Math.PI) / 180);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n);
  return { x, y, n };
}

function fillTemplate(template, z, x, y) {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)).replace("{s}", "a");
}

export function tileUrl(template, [lat, lng], z) {
  const { x, y } = tileXY(lat, lng, z);
  return fillTemplate(template, z, x, y);
}

export function preloadTileUrls(template, centre, z = PROBE_ZOOM) {
  const { x, y, n } = tileXY(centre[0], centre[1], z);
  const urls = [fillTemplate(template, z, x, y)];
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = (x + dx + n) % n;
    const ny = y + dy;
    if (ny < 0 || ny >= n) continue;
    urls.push(fillTemplate(template, z, nx, ny));
  }
  return urls;
}
