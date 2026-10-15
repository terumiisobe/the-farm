import example from "./example-farm.json";
import { toStatusKey } from "./statusMap.js";

/**
 * @typedef {import("../bombus/bombus").Section} Section
 * @typedef {import("../bombus/bombus").Hive} Hive
 */

/**
 * A hive the map can plot. `code` is a non-empty string. `lat` and `lng` are finite numbers.
 * @typedef {Hive & { code: string, lat: number, lng: number }} MapHive
 */

/**
 * A hive the snapshot listed and the map cannot place.
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
 * @typedef {{
 *   name: string,
 *   address: string,
 *   updatedAt: string | null,
 *   hives: MapHive[],
 *   offMap: OffMapHive[],
 *   sections: Section[],
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

let cachedExample;

/**
 * Env boundary. An unset base URL selects the bundled example.
 * A base URL with a missing or non-numeric id is misconfigured, not a throw.
 * @param {Record<string, string | undefined>} env
 * @returns {FarmSource}
 */
export function readFarmSource(env) {
  const base = typeof env?.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL.trim() : "";
  if (!base) return { kind: "example" };

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
 * FarmLoad for sources that need no network. Null when the caller must await `loadFarm`.
 * Example and misconfigured env paint on the first frame, with no loading flash.
 * @param {FarmSource} source
 * @returns {FarmLoad | null}
 */
export function localFarmLoad(source) {
  if (source.kind === "example") return exampleLoad();
  if (source.kind === "misconfigured") return FAILED.unavailable;
  return null;
}

/**
 * Total. Resolves a FarmLoad and never rejects.
 * Same source and same server state produce the same outcome.
 * @param {FarmSource} source
 * @param {{ signal?: AbortSignal, fetch?: typeof globalThis.fetch }} [opts]
 * @returns {Promise<FarmLoad>}
 */
export async function loadFarm(source, { signal, fetch: fetchImpl = globalThis.fetch } = {}) {
  if (source.kind === "misconfigured") {
    console.error(source.problem);
    return FAILED.unavailable;
  }
  const local = localFarmLoad(source);
  if (local) return local;
  return fetchFarm(source, { signal, fetch: fetchImpl });
}

/**
 * @param {{ kind: "api", url: string, userId: string }} source
 * @param {{ signal?: AbortSignal, fetch: typeof globalThis.fetch }} opts
 * @returns {Promise<FarmLoad>}
 */
async function fetchFarm(source, { signal, fetch: fetchImpl }) {
  const timeout = AbortSignal.timeout(LOAD_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetchImpl(source.url, {
      headers: {
        "X-User-Id": source.userId,
        Accept: "application/json",
      },
      signal: combined,
    });
    if (res.status === 401) return FAILED.unauthorized;
    if (res.status === 404) return FAILED["not-found"];
    if (!res.ok) return FAILED.unavailable;
    // API yards have real pins. Example section polygons would frame the wrong ground.
    return {
      phase: "ready",
      farm: { ...parseSnapshot(await res.json()), sections: [] },
    };
  } catch (err) {
    // StrictMode aborts the first mount. That cancel is not a failed load.
    if (!signal?.aborted) console.error(err);
    return FAILED.unavailable;
  }
}

function exampleLoad() {
  if (!cachedExample) {
    cachedExample = {
      phase: "ready",
      farm: {
        ...parseSnapshot(example),
        sections: Array.isArray(example.sections) ? example.sections : [],
      },
    };
  }
  return cachedExample;
}

/**
 * @param {unknown} json
 * @returns {Omit<Farm, "sections">}
 */
function parseSnapshot(json) {
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
  return {
    name: body.farmName,
    address: body.address,
    updatedAt: body.updatedAt,
    hives,
    offMap,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ kind: "map", hive: MapHive } | { kind: "off", hive: OffMapHive }}
 */
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
