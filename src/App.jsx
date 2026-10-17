import { useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import example from "./data/example-farm.json";
import { farmCentre, preloadTileUrls, resolveBasemap } from "./data/resolveBasemap.js";
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
  const tilesFailed = tileProbe === "failed";
  const located = farm ? { ...farm, hives } : null;
  const map = located && resolveBasemap(located.basemap, {
    hives,
    tilesFailed,
    softFail: tileProbe === "soft",
  });
  const view = located && resolveFarmView(located);
  const probeUrl = map ? map.probeUrl : null;
  const tiles = map && map.basemap ? map.basemap.tiles : undefined;

  useEffect(() => {
    if (!probeUrl || tilesFailed) return undefined;
    return probeTile(probeUrl, () => {
      setTileProbe((current) => {
        if (current === "failed") return current;
        return probeFailureMode(document.querySelectorAll(".bb-map__tile"));
      });
    });
  }, [probeUrl, tilesFailed]);

  useEffect(() => {
    if (!farm || tilesFailed || !tiles) return undefined;
    const centre = farmCentre(hives, farm.basemap.fallback);
    if (!centre) return undefined;
    const Img = globalThis.Image;
    const images = preloadTileUrls(tiles, centre).map((url) => {
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
  }, [farm, hives, tilesFailed, tiles]);

  if (!located || !map || !view) return null;

  return (
    <Dashboard
      farmName="Meliponário Isobe"
      hives={hives}
      sections={located.sections}
      basemap={map.basemap}
      basemapStatus={map.status}
      whatsappUrl={WHATSAPP_URL}
      maxZoom={view.maxZoom}
      center={view.center}
      zoom={view.zoom}
      mapKey={farmViewKey(located, view)}
    />
  );
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
