/** @typedef {import("../bombus/bombus").Basemap} Basemap */
/** @typedef {import("../bombus/bombus").Hive} Hive */

const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
const STATUS_NONE = "Satélite ao vivo indisponível no momento.";

/**
 * Picks the one basemap HiveMap should paint, the one tile App should probe, and the status line.
 *
 * @param {unknown} config `farm.basemap` as committed, `{ satellite?, fallback? }`.
 * @param {{ hives?: Hive[], tilesFailed?: boolean }} [opts]
 * @returns {{ basemap: Basemap | undefined, probeUrl: string | null, status: string | null }}
 */
export function resolveBasemap(config, { hives = [], tilesFailed = false } = {}) {
  const { satellite, fallback } = parseConfig(config);
  if (satellite && !tilesFailed) {
    const centre = farmCentre(hives, fallback);
    return {
      basemap: {
        tiles: satellite.tiles,
        minZoom: satellite.minZoom,
        maxZoom: satellite.maxZoom,
        attribution: satellite.attribution,
      },
      probeUrl: centre ? tileUrl(satellite.tiles, centre, satellite.maxZoom) : null,
      status: null,
    };
  }
  const failed = Boolean(satellite) && tilesFailed;
  if (fallback) {
    return {
      basemap: imageBasemap(fallback),
      probeUrl: null,
      status: failed ? STATUS_IMAGE : null,
    };
  }
  return {
    basemap: undefined,
    probeUrl: null,
    status: failed ? STATUS_NONE : null,
  };
}

function parseConfig(config) {
  if (config == null || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("basemap must be an object with satellite and fallback slots");
  }
  for (const field of ["tiles", "image", "bounds"]) {
    if (Object.hasOwn(config, field)) {
      throw new Error(`basemap.${field} is not a slot. Put tiles on basemap.satellite and the image on basemap.fallback`);
    }
  }
  return {
    satellite: config.satellite == null ? null : parseSatellite(config.satellite),
    fallback: config.fallback == null ? null : parseFallback(config.fallback),
  };
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

function parseFallback(slot) {
  if (slot == null || typeof slot !== "object" || Array.isArray(slot)) {
    throw new Error("basemap.fallback must be an object");
  }
  if (Object.hasOwn(slot, "tiles") || Object.hasOwn(slot, "maxZoom") || Object.hasOwn(slot, "minZoom")) {
    const field = Object.hasOwn(slot, "tiles") ? "tiles" : Object.hasOwn(slot, "maxZoom") ? "maxZoom" : "minZoom";
    throw new Error(`basemap.fallback.${field} is not allowed`);
  }
  if (typeof slot.image !== "string" || slot.image.length === 0) {
    throw new Error("basemap.fallback.image is required");
  }
  const fallback = {
    image: slot.image,
    bounds: parseBounds(slot.bounds),
  };
  if (slot.attribution != null) {
    if (typeof slot.attribution !== "string") throw new Error("basemap.fallback.attribution must be a string");
    fallback.attribution = slot.attribution;
  }
  if (slot.alt != null) {
    if (typeof slot.alt !== "string") throw new Error("basemap.fallback.alt must be a string");
    fallback.alt = slot.alt;
  }
  return fallback;
}

function parseBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) {
    throw new Error("basemap.fallback.bounds must be [[south, west], [north, east]]");
  }
  return bounds.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new Error("basemap.fallback.bounds must be [[south, west], [north, east]]");
    }
    return [pair[0], pair[1]];
  });
}

function imageBasemap(fallback) {
  const basemap = {
    image: fallback.image,
    bounds: fallback.bounds.map((pair) => [pair[0], pair[1]]),
  };
  if (fallback.attribution != null) basemap.attribution = fallback.attribution;
  if (fallback.alt != null) basemap.alt = fallback.alt;
  return basemap;
}

function farmCentre(hives, fallback) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let count = 0;
  for (const hive of hives) {
    if (hive == null) continue;
    const lat = Number(hive.lat);
    const lng = Number(hive.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
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

function tileUrl(template, [lat, lng], z) {
  // HiveMap does not export project(), so the probe repeats that Web Mercator grid.
  const n = 2 ** z;
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const s = Math.sin((clamped * Math.PI) / 180);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n);
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)).replace("{s}", "a");
}
