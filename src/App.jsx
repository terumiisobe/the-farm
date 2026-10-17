import { useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import example from "./data/example-farm.json";
import eoxFarm from "./data/mock-eox-farm.json";
import stillFarm from "./data/mock-still-farm.json";
import {
  INITIAL_LATCH,
  nextLoadLatch,
  parseFarmBasemap,
  selectBasemap,
} from "./data/resolveBasemap.js";
import { farmViewKey, resolveFarmView } from "./data/resolveFarmView.js";
import { pinLatLng, toHive } from "./data/statusMap.js";

// Replace with the bot's real number, e.g. "https://wa.me/5511999999999".
const WHATSAPP_URL = "https://wa.me/";
const PROBE_TIMEOUT_MS = 8000;
/** Neighbour preload floods Network while debugging zoom; viewport tiles + one probe are enough. */
const PRELOAD_NEIGHBOUR_TILES = false;

function bundledFarm(search) {
  const name = new URLSearchParams(search).get("farm");
  if (name === "eox") return eoxFarm;
  if (name === "still") return stillFarm;
  return example;
}

function farmLatchKey(farm) {
  if (!farm || typeof farm !== "object") return "local";
  if (farm.id != null && String(farm.id) !== "") return String(farm.id);
  const image = farm.basemap && typeof farm.basemap.image === "string" ? farm.basemap.image : "";
  return image || "local";
}

export default function App() {
  const [farm, setFarm] = useState(null);
  const [latch, setLatch] = useState(INITIAL_LATCH);

  useEffect(() => {
    // TODO: load from your backend instead of the bundled file.
    const payload = bundledFarm(window.location.search);
    setFarm({ ...payload, hives: payload.hives.map(toHive) });
  }, []);

  const latchKey = farmLatchKey(farm);
  useEffect(() => {
    setLatch(INITIAL_LATCH);
  }, [latchKey]);

  const hives = useMemo(() => {
    if (!farm) return [];
    return (farm.hives ?? []).flatMap((hive) => (pinLatLng(hive) ? [toHive(hive)] : []));
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
  const view = located && selection ? resolveFarmView(located, selection) : null;
  const satelliteLive = selection != null && selection.kind === "satellite" && latch.tiles !== "failed";
  // A soft latch rebuilds the selection. The URL string stays put, so the probe does not start again.
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

  if (!located || !selection || !view) return null;

  return (
    <Dashboard
      farmName="Meliponário Isobe"
      hives={hives}
      sections={located.sections}
      basemap={selection.paint}
      basemapStatus={selection.status}
      whatsappUrl={WHATSAPP_URL}
      maxZoom={view.maxZoom}
      minZoom={view.minZoom}
      center={view.center}
      zoom={view.zoom}
      mapKey={farmViewKey(located, view, selection.kind)}
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
