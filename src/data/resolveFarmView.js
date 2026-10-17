import { isBasemapSelection } from "./resolveBasemap.js";
import { pinLatLng } from "./statusMap.js";

const CALM_MIN_ZOOM = 15;
const CALM_MAX_ZOOM = 16;
const MIN_SPAN_M = 500;
const METERS_PER_DEGREE = 111320;

/**
 * Where HiveMap should look. Hive pins omit centre and zoom so the map fits them.
 * Farm `center` and `bounds` beat a still or sample box. Satellite paint has no bounds to read.
 *
 * @param {unknown} farm
 * @param {object} selection
 * @returns {{ maxZoom?: number, source: "hives" | "center" | "bounds" | "still" | "placeholder", center?: [number, number], zoom?: number }}
 */
export function resolveFarmView(farm, selection) {
  if (!isBasemapSelection(selection)) {
    throw new Error("resolveFarmView requires a basemap selection");
  }
  const record = farm && typeof farm === "object" ? farm : {};
  const maxZoom = selection.kind === "satellite" ? selection.paint.maxZoom : null;
  if (hivePins(record).length > 0) return pack(maxZoom, { source: "hives" });

  const center = pair(record.center);
  const bounds = box(record.bounds);
  if (center && bounds) {
    return pack(maxZoom, { source: "bounds", center, zoom: zoomForBounds(bounds, maxZoom) });
  }
  if (center) return pack(maxZoom, { source: "center", center, zoom: zoomForCenter(maxZoom) });
  if (bounds) {
    return pack(maxZoom, {
      source: "bounds",
      center: midpoint(bounds),
      zoom: zoomForBounds(bounds, maxZoom),
    });
  }
  if (selection.kind === "still" || selection.kind === "sample") {
    const imageBounds = selection.paint.bounds;
    return pack(maxZoom, {
      source: selection.kind === "still" ? "still" : "bounds",
      center: midpoint(imageBounds),
      zoom: zoomForBounds(imageBounds, maxZoom),
    });
  }
  return pack(maxZoom, { source: "placeholder" });
}

/**
 * Remount HiveMap when the farm id, the fitted place, or the basemap kind changes.
 * Source alone stays `hives` when a later payload swaps GPS, so the key also carries the pin box.
 */
export function farmViewKey(farm, view, kind) {
  return `${placeKey(farm, view)}:${kind}`;
}

function placeKey(farm, view) {
  const id = farm && typeof farm === "object" && farm.id != null && String(farm.id) !== ""
    ? String(farm.id)
    : "farm";
  if (!view || view.source == null) return id;
  if (view.source === "hives") {
    const pins = hivePins(farm && typeof farm === "object" ? farm : {});
    if (pins.length === 0) return `${id}:hives:0`;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const [lat, lng] of pins) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    return `${id}:hives:${pins.length}:${minLat}:${minLng}:${maxLat}:${maxLng}`;
  }
  if (view.center) return `${id}:${view.source}:${view.center[0]}:${view.center[1]}:${view.zoom}`;
  return `${id}:${view.source}`;
}

function midpoint(bounds) {
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
}

function pack(maxZoom, fields) {
  return maxZoom == null ? fields : { maxZoom, ...fields };
}

function hivePins(farm) {
  if (!Array.isArray(farm.hives)) return [];
  const pins = [];
  for (const hive of farm.hives) {
    const pin = pinLatLng(hive);
    if (pin) pins.push(pin);
  }
  return pins;
}

function pair(value) {
  if (!Array.isArray(value)) return null;
  return pinLatLng({ lat: value[0], lng: value[1] });
}

function box(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const southWest = pair(value[0]);
  const northEast = pair(value[1]);
  if (!southWest || !northEast) return null;
  return [southWest, northEast];
}

function zoomForCenter(maxZoom) {
  return zoomCeiling(maxZoom);
}

function zoomForBounds(bounds, maxZoom) {
  const ceiling = zoomCeiling(maxZoom);
  const floor = Math.min(CALM_MIN_ZOOM, ceiling);
  const span = Math.max(spanMeters(bounds), MIN_SPAN_M);
  const lat = ((bounds[0][0] + bounds[1][0]) / 2) * Math.PI / 180;
  const z = Math.log2((156543.03392 * Math.cos(lat) * 256) / span);
  if (!Number.isFinite(z)) return ceiling;
  return Math.round(Math.min(ceiling, Math.max(floor, z)));
}

function zoomCeiling(maxZoom) {
  if (maxZoom == null) return CALM_MAX_ZOOM;
  return Math.min(CALM_MAX_ZOOM, maxZoom);
}

function spanMeters(bounds) {
  const [[south, west], [north, east]] = bounds;
  const midLat = ((south + north) / 2) * Math.PI / 180;
  const latM = Math.abs(north - south) * METERS_PER_DEGREE;
  const lngM = Math.abs(east - west) * METERS_PER_DEGREE * Math.cos(midLat);
  return Math.max(latM, lngM);
}
