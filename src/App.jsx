import { useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import {
  INITIAL_LATCH,
  nextLoadLatch,
  parseFarmBasemap,
  selectBasemap,
} from "./data/resolveBasemap.js";
import { loadFarm, LOADING, localFarmLoad, readFarmSource } from "./data/farmSnapshot.js";
import { farmViewKey, resolveFarmView } from "./data/resolveFarmView.js";
import { pinLatLng } from "./data/statusMap.js";

const WHATSAPP_URL = "https://wa.me/5541987414789";
const PROBE_TIMEOUT_MS = 8000;
const PRELOAD_NEIGHBOUR_TILES = false;
const SOURCE = readFarmSource(import.meta.env);

function farmLatchKey(farm) {
  if (!farm || typeof farm !== "object") return "local";
  if (farm.id != null && String(farm.id) !== "") return String(farm.id);
  const image = farm.basemap && typeof farm.basemap.image === "string" ? farm.basemap.image : "";
  return image || "local";
}

/**
 * @param {{ source?: import("./data/farmSnapshot.js").FarmSource }} props
 */
export default function App({ source = SOURCE } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState(() => localFarmLoad(source) ?? LOADING);
  const [latch, setLatch] = useState(INITIAL_LATCH);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!localFarmLoad(source)) setLoad(LOADING);
    loadFarm(source, { signal: controller.signal }).then((next) => {
      if (active && !controller.signal.aborted) setLoad(next);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [source, attempt]);

  const farm = load.phase === "ready" ? load.farm : null;
  const latchKey = farmLatchKey(farm);
  useEffect(() => {
    setLatch(INITIAL_LATCH);
  }, [latchKey]);

  const hives = useMemo(() => {
    if (!farm) return [];
    return (farm.hives ?? []).filter((hive) => pinLatLng(hive));
  }, [farm]);
  const catalog = useMemo(
    () => (farm ? parseFarmBasemap(farm.basemap) : null),
    [farm],
  );
  const selection = useMemo(
    () => (catalog ? selectBasemap(catalog, { latch, hives }) : null),
    [catalog, latch, hives],
  );
  const located = farm ? { ...farm, hives } : null;
  const farmView = located && selection ? resolveFarmView(located, selection) : null;
  const satelliteLive = selection != null && selection.kind === "satellite" && latch.tiles !== "failed";
  const probeUrl = satelliteLive ? selection.probeUrl : null;
  const preloadKey = satelliteLive && PRELOAD_NEIGHBOUR_TILES
    ? selection.preloadUrls.join("\n")
    : "";

  useEffect(() => {
    if (!selection || selection.kind !== "still" || latch.still !== "open") return undefined;
    const Img = globalThis.Image;
    const img = new Img();
    const fail = () => setLatch((current) => nextLoadLatch(current, { type: "still-failed" }));
    const show = () => setLatch((current) => nextLoadLatch(current, { type: "still-shown" }));
    img.onload = () => (img.naturalWidth > 0 ? show() : fail());
    img.onerror = fail;
    img.src = selection.paint.image;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [selection, latch.still]);

  useEffect(() => {
    if (!probeUrl) return undefined;
    return probeTile(probeUrl, () => {
      setLatch((current) => nextLoadLatch(current, {
        type: probeFailureMode(document.querySelectorAll(".bb-map__tile")) === "failed"
          ? "tiles-hard"
          : "tiles-soft",
      }));
    });
  }, [probeUrl]);

  useEffect(() => {
    if (!preloadKey) return undefined;
    return preloadImages(preloadKey.split("\n"));
  }, [preloadKey]);

  const view = located && selection && farmView
    ? {
      phase: "ready",
      farm: { ...farm, hives },
      basemap: selection.paint,
      basemapStatus: selection.status,
      maxZoom: farmView.maxZoom,
      minZoom: farmView.minZoom,
      center: farmView.center,
      zoom: farmView.zoom,
      mapKey: farmViewKey(located, farmView, selection.kind),
    }
    : load;

  return (
    <Dashboard
      view={view}
      whatsappUrl={WHATSAPP_URL}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function preloadImages(urls) {
  if (!urls || urls.length === 0) return undefined;
  const Img = globalThis.Image;
  const images = urls.map((url) => {
    const img = new Img();
    img.src = url;
    return img;
  });
  return () => {
    for (const img of images) {
      img.onload = null;
      img.onerror = null;
    }
  };
}

function probeFailureMode(tiles) {
  const list = [...tiles];
  if (list.some((img) => img.complete && img.naturalWidth > 0)) return "soft";
  if (list.length > 0 && list.every((img) => img.complete && img.naturalWidth === 0)) return "failed";
  return "soft";
}

export function probeTile(url, onFail, ImageCtor = globalThis.Image) {
  const img = new ImageCtor();
  let done = false;
  const finish = (failed) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    img.onload = null;
    img.onerror = null;
    if (failed) onFail();
  };
  const timer = setTimeout(() => finish(true), PROBE_TIMEOUT_MS);
  img.onload = () => finish(img.naturalWidth === 0);
  img.onerror = () => finish(true);
  img.src = url;
  return () => finish(false);
}
