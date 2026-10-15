import { afterEach, describe, expect, it, vi } from "vitest";
import {
  composeFarmBasemapWire,
  loadFarm,
  LOCAL_FARM_BASEMAP,
  localFarmLoad,
  parseSnapshot,
  readyFarmFromParsed,
  readFarmSource,
} from "./farmSnapshot.js";

const STILL_BOUNDS = [
  [-25.762684, -49.189889],
  [-25.761622, -49.188210],
];

const API = {
  kind: "api",
  url: "https://api.test/v1/meliponarios/10",
  userId: "1",
};

const HIVE_12 = {
  code: "12",
  lat: -25.761895097774243,
  lng: -49.189356741758246,
  status: "stable",
  addedAt: "2025-06-30",
  lastInspection: "2026-10-09",
  notes: "Trocar o fundo.",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function silenceErrors() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("readFarmSource", () => {
  it("uses the bundled example when the base URL is unset", () => {
    expect(readFarmSource({})).toEqual({ kind: "example" });
    expect(readFarmSource({ VITE_API_BASE_URL: "  " })).toEqual({ kind: "example" });
    expect(readFarmSource({ VITE_API_BASE_URL: undefined })).toEqual({ kind: "example" });
  });

  it("builds the meliponary URL when all three vars are digits and an origin", () => {
    expect(readFarmSource({
      VITE_API_BASE_URL: "https://api.test/",
      VITE_MELIPONARIO_ID: " 10 ",
      VITE_USER_ID: "1",
    })).toEqual({
      kind: "api",
      url: "https://api.test/v1/meliponarios/10",
      userId: "1",
    });
  });

  it("names each missing id when the base URL is set", () => {
    expect(readFarmSource({ VITE_API_BASE_URL: "https://api.test" })).toEqual({
      kind: "misconfigured",
      problem: "VITE_MELIPONARIO_ID and VITE_USER_ID must be digits when VITE_API_BASE_URL is set",
    });
    expect(readFarmSource({
      VITE_API_BASE_URL: "https://api.test",
      VITE_MELIPONARIO_ID: "10",
      VITE_USER_ID: "abc",
    })).toEqual({
      kind: "misconfigured",
      problem: "VITE_USER_ID must be digits when VITE_API_BASE_URL is set",
    });
    expect(readFarmSource({
      VITE_API_BASE_URL: "https://api.test",
      VITE_MELIPONARIO_ID: "10a",
      VITE_USER_ID: "1",
    })).toEqual({
      kind: "misconfigured",
      problem: "VITE_MELIPONARIO_ID must be digits when VITE_API_BASE_URL is set",
    });
  });
});

describe("loadFarm", () => {
  it("parses the example file into a ready farm with its sections and still", async () => {
    const source = { kind: "example" };
    const load = await loadFarm(source);

    expect(localFarmLoad(source)).toBe(load);
    expect(load.phase).toBe("ready");
    expect(load.farm.name).toBe("Meliponário Isobe");
    expect(load.farm.address).toBe("");
    expect(load.farm.updatedAt).toBe(null);
    expect(load.farm.hives).toHaveLength(21);
    expect(load.farm.offMap).toEqual([]);
    expect(load.farm.sections.map((section) => section.id)).toEqual(["A", "B", "C", "D"]);
    expect(load.farm.basemap.image).toBe("/assets/farm-basemap.png");
    expect(load.farm.basemap.bounds).toEqual(STILL_BOUNDS);
    expect(load.farm.basemap.satellite).toEqual(LOCAL_FARM_BASEMAP.satellite);
    expect(load.farm.basemap.fallback).toEqual(LOCAL_FARM_BASEMAP.fallback);
    expect(load.farm.hives[0]).toEqual({
      code: "1",
      lat: -25.761895097774243,
      lng: -49.189356741758246,
      status: "stable",
      section: "A",
      addedAt: "2024-08-14",
      lastInspection: "2026-10-05",
    });
    expect(load.farm.hives.find((hive) => hive.code === "3")).toEqual({
      code: "3",
      lat: -25.761941528616852,
      lng: -49.18937519230769,
      status: "recovering",
      section: "A",
      addedAt: "2025-02-20",
      lastInspection: "2026-09-28",
      notes: "Poucos potes de pólen. Iniciar alimentação proteica.",
    });
    expect(load.farm.address).toBe("");
  });

  it("maps a 200 snapshot and keeps null pins and null codes off the map", async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, headers: init.headers };
      return jsonResponse(200, {
        farmName: "Sítio Norte",
        address: "",
        updatedAt: "2026-10-09T15:00:00Z",
        hives: [
          HIVE_12,
          {
            code: "13",
            lat: null,
            lng: null,
            status: "developing",
            addedAt: null,
            lastInspection: null,
          },
          {
            code: null,
            lat: -23.1,
            lng: -46.2,
            status: null,
          },
          {
            code: "14",
            lat: 1,
            lng: null,
            status: "Estável",
            addedAt: "not-a-date",
            notes: "manter",
          },
        ],
      });
    };

    expect(await loadFarm(API, { fetch: fetchImpl })).toEqual({
      phase: "ready",
      farm: {
        name: "Sítio Norte",
        address: "",
        updatedAt: "2026-10-09T15:00:00Z",
        hives: [HIVE_12],
        offMap: [
          { code: "13", status: "developing", missing: "pin" },
          { code: null, status: "unknown", missing: "code" },
          { code: "14", status: "stable", notes: "manter", missing: "pin" },
        ],
        sections: [],
        basemap: composeFarmBasemapWire(LOCAL_FARM_BASEMAP, null),
      },
    });
    expect(seen).toEqual({
      url: "https://api.test/v1/meliponarios/10",
      headers: { "X-User-Id": "1", Accept: "application/json" },
    });
  });

  it("maps optional still, center, and bounds onto the ready farm", async () => {
    const fetchImpl = async () => jsonResponse(200, {
      farmName: "Sítio Still",
      address: "",
      updatedAt: null,
      center: [-25.762153, -49.1890495],
      bounds: STILL_BOUNDS,
      basemap: {
        image: "/assets/farm-basemap.png",
        bounds: STILL_BOUNDS,
        attribution: "Imagem da propriedade",
      },
      hives: [HIVE_12],
    });

    const load = await loadFarm(API, { fetch: fetchImpl });
    expect(load.phase).toBe("ready");
    expect(load.farm.center).toEqual([-25.762153, -49.1890495]);
    expect(load.farm.bounds).toEqual(STILL_BOUNDS);
    expect(load.farm.basemap).toEqual(composeFarmBasemapWire(LOCAL_FARM_BASEMAP, {
      image: "/assets/farm-basemap.png",
      bounds: STILL_BOUNDS,
      attribution: "Imagem da propriedade",
    }));
  });

  it("rejects a still image without bounds", async () => {
    const error = silenceErrors();
    const load = await loadFarm(API, {
      fetch: async () => jsonResponse(200, {
        farmName: "Sítio Quebrado",
        address: "",
        updatedAt: null,
        hives: [],
        basemap: { image: "/assets/farm-basemap.png" },
      }),
    });
    expect(load).toEqual({ phase: "failed", reason: "unavailable" });
    expect(error.mock.calls[0][0].name).toBe("SnapshotError");
  });

  it("treats an empty hive list as a ready yard", async () => {
    const fetchImpl = async () => jsonResponse(200, {
      farmName: "Sítio Vazio",
      address: "",
      updatedAt: null,
      hives: [],
    });

    expect(await loadFarm(API, { fetch: fetchImpl })).toEqual({
      phase: "ready",
      farm: {
        name: "Sítio Vazio",
        address: "",
        updatedAt: null,
        hives: [],
        offMap: [],
        sections: [],
        basemap: composeFarmBasemapWire(LOCAL_FARM_BASEMAP, null),
      },
    });
  });

  it("keeps parseSnapshot still-absent payloads valid", () => {
    const parsed = parseSnapshot({
      farmName: "Sem still",
      address: "",
      updatedAt: null,
      hives: [],
    });
    expect(parsed.still).toBe(null);
    expect(readyFarmFromParsed(parsed, {
      localBasemap: LOCAL_FARM_BASEMAP,
      sections: [],
    }).basemap.image).toBeUndefined();
  });

  it("returns unauthorized for 401 and not-found for 404", async () => {
    expect(await loadFarm(API, { fetch: async () => new Response("", { status: 401 }) })).toEqual({
      phase: "failed",
      reason: "unauthorized",
    });
    expect(await loadFarm(API, { fetch: async () => new Response("", { status: 404 }) })).toEqual({
      phase: "failed",
      reason: "not-found",
    });
  });

  it("returns unavailable for network errors, other statuses, and a bad body", async () => {
    const error = silenceErrors();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("offline");
    });

    expect(await loadFarm(API, { fetch: fetchImpl })).toEqual({
      phase: "failed",
      reason: "unavailable",
    });
    expect(await loadFarm(API, { fetch: async () => new Response("", { status: 500 }) })).toEqual({
      phase: "failed",
      reason: "unavailable",
    });
    expect(await loadFarm(API, { fetch: async () => new Response("nope", { status: 200 }) })).toEqual({
      phase: "failed",
      reason: "unavailable",
    });
    expect(await loadFarm(API, {
      fetch: async () => jsonResponse(200, { farmName: 1, address: "", updatedAt: null, hives: [] }),
    })).toEqual({
      phase: "failed",
      reason: "unavailable",
    });
    expect(error.mock.calls.map((call) => call[0].name)).toEqual([
      "TypeError",
      "SyntaxError",
      "SnapshotError",
    ]);
    expect(fetchImpl.mock.calls).toHaveLength(1);
  });

  it("fails a half-set env without fetching", async () => {
    const error = silenceErrors();
    const fetchImpl = vi.fn();
    const source = readFarmSource({ VITE_API_BASE_URL: "https://api.test" });

    expect(localFarmLoad(source)).toEqual({ phase: "failed", reason: "unavailable" });
    expect(await loadFarm(source, { fetch: fetchImpl })).toEqual({
      phase: "failed",
      reason: "unavailable",
    });
    expect(fetchImpl.mock.calls).toEqual([]);
    expect(error.mock.calls).toEqual([[
      "VITE_MELIPONARIO_ID and VITE_USER_ID must be digits when VITE_API_BASE_URL is set",
    ]]);
  });
});
