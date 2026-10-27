import example from "./example-farm.json";
import { toStatusKey } from "./statusMap.js";

/**
 * @typedef {import("../bombus/bombus").Section} Section
 * @typedef {import("../bombus/bombus").Hive} Hive
 */

/**
 * @typedef {Hive & { code: string, lat: number, lng: number }} MapHive
 */

/**
 * @typedef {{
 *   code: string | null,
 *   status: string,
 *   addedAt?: string,
 *   lastInspection?: string,
 *   notes?: string,
 *   missing: "pin" | "code",
 * }} OffMapHive
 */

/**
 * @typedef {[number, number]} LatLng
 * @typedef {[LatLng, LatLng]} GeoBounds
 */

/**
 * @typedef {{
 *   image: string,
 *   bounds: GeoBounds,
 *   attribution?: string,
 *   alt?: string,
 * }} StillOverlay
 */

/**
 * @typedef {{
 *   name: string,
 *   address: string,
 *   updatedAt: string | null,
 *   hives: MapHive[],
 *   offMap: OffMapHive[],
 *   sections: Section[],
 *   basemap: object,
 *   center?: LatLng,
 *   bounds?: GeoBounds,
 * }} Farm
 */

/**
 * @typedef {(
 *   | { kind: "example" }
 *   | { kind: "api", url: string, userId: string }
 *   | { kind: "misconfigured", problem: string }
 * )} FarmSource
 */

/**
 * @typedef {(
 *   | { phase: "loading" }
 *   | { phase: "ready", farm: Farm }
 *   | { phase: "failed", reason: "unauthorized" | "not-found" | "unavailable" }
 * )} FarmLoad
 */

/** @type {{ phase: "loading" }} */
export const LOADING = Object.freeze({ phase: "loading" });

const LOAD_TIMEOUT_MS = 15000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const FAILED = {
  unauthorized: Object.freeze({ phase: "failed", reason: "unauthorized" }),
  "not-found": Object.freeze({ phase: "failed", reason: "not-found" }),
  unavailable: Object.freeze({ phase: "failed", reason: "unavailable" }),
};

/** Operator still corners (SW / NE). Used when the GET snapshot omits basemap.image. */
export const OPERATOR_STILL_BOUNDS = Object.freeze([
  Object.freeze([-25.762862, -49.189754]),
  Object.freeze([-25.761621, -49.188175]),
]);

/** Local still painted under API hives when the snapshot has no farm picture. */
export const OPERATOR_STILL = Object.freeze({
  image: "/assets/farm-basemap.png",
  bounds: OPERATOR_STILL_BOUNDS,
  attribution: "Imagem da propriedade",
});

/** Local EOX + sample arms. Still defaults to OPERATOR_STILL when the snapshot omits one. */
export const LOCAL_FARM_BASEMAP = Object.freeze({
  satellite: example.basemap.satellite,
  fallback: example.basemap.fallback,
});

let cachedExample;

/**
 * @param {Record<string, string | undefined>} env
 * @returns {FarmSource}
 */
export function readFarmSource(env) {
  const base = typeof env?.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL.trim() : "";
  if (!base) {
    return {
      kind: "misconfigured",
      problem: "VITE_API_BASE_URL is required",
    };
  }

  const id = digits(env.VITE_MELIPONARIO_ID);
  const userId = digits(env.VITE_USER_ID);
  const missing = [];
  if (!id) missing.push("VITE_MELIPONARIO_ID");
  if (!userId) missing.push("VITE_USER_ID");
  if (missing.length > 0) {
    const names = missing.length === 1 ? missing[0] : `${missing[0]} and ${missing[1]}`;
    return {
      kind: "misconfigured",
      problem: `${names} must be digits when VITE_API_BASE_URL is set`,
    };
  }

  return {
    kind: "api",
    url: `${base.replace(/\/+$/, "")}/v1/meliponarios/${id}`,
    userId,
  };
}

/**
 * @param {FarmSource} source
 * @returns {FarmLoad | null}
 */
export function localFarmLoad(source) {
  if (source.kind === "example") return exampleLoad();
  if (source.kind === "misconfigured") return FAILED.unavailable;
  return null;
}

/**
 * @param {FarmSource} source
 * @param {{ signal?: AbortSignal, fetch?: typeof globalThis.fetch }} [opts]
 * @returns {Promise<FarmLoad>}
 */
export async function loadFarm(source, { signal, fetch: fetchImpl = globalThis.fetch } = {}) {
  try {
    if (source.kind === "misconfigured") {
      console.error(source.problem);
      return FAILED.unavailable;
    }
    const local = localFarmLoad(source);
    if (local) return local;
    return await fetchFarm(source, { signal, fetch: fetchImpl });
  } catch (err) {
    console.error(err);
    return FAILED.unavailable;
  }
}

async function fetchFarm(source, { signal, fetch: fetchImpl }) {
  const request = requestSignal(signal, LOAD_TIMEOUT_MS);
  try {
    const res = await fetchImpl(source.url, {
      headers: {
        "X-User-Id": source.userId,
        Accept: "application/json",
      },
      signal: request.signal,
    });
    if (res.status === 401) return FAILED.unauthorized;
    if (res.status === 404) return FAILED["not-found"];
    if (!res.ok) return FAILED.unavailable;
    return {
      phase: "ready",
      farm: readyFarmFromParsed(parseSnapshot(await res.json()), {
        localBasemap: LOCAL_FARM_BASEMAP,
        sections: [],
      }),
    };
  } catch (err) {
    if (signal?.aborted) return LOADING;
    console.error(err);
    return FAILED.unavailable;
  } finally {
    request.clear();
  }
}

function requestSignal(parent, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof timer.unref === "function") timer.unref();
  const stop = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onParentAbort);
  };
  const onParentAbort = () => {
    stop();
    controller.abort();
  };
  if (parent?.aborted) onParentAbort();
  else if (parent) parent.addEventListener("abort", onParentAbort, { once: true });
  return { signal: controller.signal, clear: stop };
}

function exampleLoad() {
  if (!cachedExample) {
    cachedExample = {
      phase: "ready",
      farm: readyFarmFromParsed(parseSnapshot(example), {
        localBasemap: LOCAL_FARM_BASEMAP,
        sections: Array.isArray(example.sections) ? example.sections : [],
      }),
    };
  }
  return cachedExample;
}

/**
 * Sole writer of `farm.basemap`. Merges a validated still overlay onto local satellite + sample.
 *
 * @param {{
 *   name: string,
 *   address: string,
 *   updatedAt: string | null,
 *   hives: MapHive[],
 *   offMap: OffMapHive[],
 *   center?: LatLng,
 *   bounds?: GeoBounds,
 *   still: StillOverlay | null,
 * }} parsed
 * @param {{ localBasemap: { satellite: object, fallback: object }, sections: Section[] }} options
 * @returns {Farm}
 */
export function readyFarmFromParsed(parsed, options) {
  const { localBasemap, sections } = options;
  const farm = {
    name: parsed.name,
    address: parsed.address,
    updatedAt: parsed.updatedAt,
    hives: parsed.hives,
    offMap: parsed.offMap,
    sections,
    basemap: composeFarmBasemapWire(localBasemap, parsed.still),
  };
  if (parsed.center) farm.center = parsed.center;
  if (parsed.bounds) farm.bounds = parsed.bounds;
  return farm;
}

/**
 * @param {{ satellite: object, fallback: object }} local
 * @param {StillOverlay | null} still
 */
export function composeFarmBasemapWire(local, still) {
  const overlay = still == null ? OPERATOR_STILL : still;
  return {
    satellite: local.satellite,
    fallback: local.fallback,
    image: overlay.image,
    bounds: overlay.bounds,
    ...(overlay.attribution != null ? { attribution: overlay.attribution } : {}),
    ...(overlay.alt != null ? { alt: overlay.alt } : {}),
  };
}

/**
 * @param {unknown} json
 */
export function parseSnapshot(json) {
  if (json == null || typeof json !== "object" || Array.isArray(json)) {
    throw new SnapshotError("snapshot must be an object");
  }
  const body = /** @type {Record<string, unknown>} */ (json);
  if (typeof body.farmName !== "string") throw new SnapshotError("farmName must be a string");
  if (typeof body.address !== "string") throw new SnapshotError("address must be a string");
  if (!(typeof body.updatedAt === "string" || body.updatedAt === null)) {
    throw new SnapshotError("updatedAt must be a string or null");
  }
  if (!Array.isArray(body.hives)) throw new SnapshotError("hives must be an array");

  const hives = [];
  const offMap = [];
  for (const raw of body.hives) {
    const parsed = parseHive(raw);
    if (parsed.kind === "map") hives.push(parsed.hive);
    else offMap.push(parsed.hive);
  }

  const still = Object.hasOwn(body, "basemap")
    ? parseStillBasemapOverlay(body.basemap)
    : null;
  const center = Object.hasOwn(body, "center") ? parseFarmCenter(body.center) : undefined;
  const bounds = Object.hasOwn(body, "bounds") ? parseFarmBounds(body.bounds) : undefined;

  return {
    name: body.farmName,
    address: body.address,
    updatedAt: body.updatedAt,
    hives,
    offMap,
    still,
    ...(center ? { center } : {}),
    ...(bounds ? { bounds } : {}),
  };
}

/**
 * @param {unknown} basemapField
 * @returns {StillOverlay | null}
 */
function parseStillBasemapOverlay(basemapField) {
  if (basemapField == null) return null;
  if (typeof basemapField !== "object" || Array.isArray(basemapField)) {
    throw new SnapshotError("basemap must be an object");
  }
  const raw = /** @type {Record<string, unknown>} */ (basemapField);
  if (Object.hasOwn(raw, "still")) {
    throw new SnapshotError("basemap.still is not a slot. Put the farm picture on basemap.image and basemap.bounds.");
  }
  if (Object.hasOwn(raw, "tiles")) {
    throw new SnapshotError("basemap.tiles is not a slot. Put tiles on basemap.satellite.");
  }

  const hasImage = Object.hasOwn(raw, "image");
  const hasBounds = Object.hasOwn(raw, "bounds");
  if (!hasImage && !hasBounds) return null;
  if (!hasImage) throw new SnapshotError("basemap.bounds requires basemap.image");
  if (!hasBounds) throw new SnapshotError("basemap.image requires basemap.bounds");
  if (typeof raw.image !== "string" || raw.image.length === 0) {
    throw new SnapshotError("basemap.image must be a non-empty string");
  }

  /** @type {StillOverlay} */
  const still = {
    image: raw.image,
    bounds: parseGeoBounds(raw.bounds, "basemap.bounds"),
  };
  if (raw.attribution != null) {
    if (typeof raw.attribution !== "string") {
      throw new SnapshotError("basemap.attribution must be a string");
    }
    still.attribution = raw.attribution;
  }
  if (raw.alt != null) {
    if (typeof raw.alt !== "string") throw new SnapshotError("basemap.alt must be a string");
    still.alt = raw.alt;
  }
  return still;
}

/**
 * @param {unknown} value
 * @returns {LatLng}
 */
function parseFarmCenter(value) {
  if (!Array.isArray(value) || value.length !== 2
    || !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new SnapshotError("center must be [lat, lng]");
  }
  return [value[0], value[1]];
}

/**
 * @param {unknown} value
 * @returns {GeoBounds}
 */
function parseFarmBounds(value) {
  return parseGeoBounds(value, "bounds");
}

/**
 * @param {unknown} bounds
 * @param {string} label
 * @returns {GeoBounds}
 */
function parseGeoBounds(bounds, label) {
  if (!Array.isArray(bounds) || bounds.length !== 2) {
    throw new SnapshotError(`${label} must be [[south, west], [north, east]]`);
  }
  const box = bounds.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2
      || !pair.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new SnapshotError(`${label} must be [[south, west], [north, east]]`);
    }
    return /** @type {LatLng} */ ([pair[0], pair[1]]);
  });
  const [[south, west], [north, east]] = box;
  if (south >= north || west >= east) {
    throw new SnapshotError(`${label} must run south to north and west to east`);
  }
  return /** @type {GeoBounds} */ (box);
}

function parseHive(raw) {
  const record = raw != null && typeof raw === "object" && !Array.isArray(raw)
    ? /** @type {Record<string, unknown>} */ (raw)
    : {};
  const code = typeof record.code === "string" && record.code.trim() !== "" ? record.code.trim() : null;
  const pinned = typeof record.lat === "number"
    && Number.isFinite(record.lat)
    && typeof record.lng === "number"
    && Number.isFinite(record.lng);
  const status = toStatusKey(record.status);
  const extra = hiveDetails(record);

  if (!pinned) {
    return { kind: "off", hive: { code, status, ...extra, missing: "pin" } };
  }
  if (code == null) {
    return { kind: "off", hive: { code: null, status, ...extra, missing: "code" } };
  }
  const hive = {
    code,
    lat: record.lat,
    lng: record.lng,
    status,
    ...extra,
  };
  if (typeof record.section === "string" && record.section.trim() !== "") {
    hive.section = record.section.trim();
  }
  return { kind: "map", hive };
}

function hiveDetails(record) {
  const extra = {};
  const addedAt = optionalDate(record.addedAt);
  if (addedAt) extra.addedAt = addedAt;
  const lastInspection = optionalDate(record.lastInspection);
  if (lastInspection) extra.lastInspection = lastInspection;
  if (typeof record.notes === "string") extra.notes = record.notes;
  return extra;
}

function optionalDate(value) {
  return typeof value === "string" && DATE.test(value) ? value : undefined;
}

function digits(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

class SnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = "SnapshotError";
  }
}
