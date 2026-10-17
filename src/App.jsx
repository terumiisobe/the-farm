import { useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import example from "./data/example-farm.json";
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

export default function App() {
  const [farm, setFarm] = useState(null);
  const [tileProbe, setTileProbe] = useState("ok");

  useEffect(() => {
    // TODO: load from your backend instead of the example file, e.g.
    //   fetch("/api/hives").then(r => r.json()).then(list => setFarm({ ...example, hives: list.map(toHive) }));
    setFarm({ ...example, hives: example.hives.map(toHive) });
  }, []);

  const hives = useMemo(() => {
    if (!farm) return [];
    return (farm.hives ?? []).flatMap((hive) => (pinLatLng(hive) ? [toHive(hive)] : []));
  }, [farm]);
  const latch = useMemo(() => {
    if (tileProbe === "failed") return nextLoadLatch(INITIAL_LATCH, { type: "tiles-hard" });
    if (tileProbe === "soft") return nextLoadLatch(INITIAL_LATCH, { type: "tiles-soft" });
    return INITIAL_LATCH;
  }, [tileProbe]);
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
  const preloadKey = satelliteLive ? selection.preloadUrls.join("\n") : "";

  useEffect(() => {
    if (!probeUrl) return undefined;
    return probeTile(probeUrl, () => {
      setTileProbe((current) => {
        if (current === "failed") return current;
        return probeFailureMode(document.querySelectorAll(".bb-map__tile"));
      });
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
