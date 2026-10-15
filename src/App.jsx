import { useEffect, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import example from "./data/example-farm.json";
import { resolveBasemap } from "./data/resolveBasemap.js";
import { toHive } from "./data/statusMap.js";

// Replace with the bot's real number, e.g. "https://wa.me/5511999999999".
const WHATSAPP_URL = "https://wa.me/";
const PROBE_TIMEOUT_MS = 8000;

export default function App() {
  const [farm, setFarm] = useState(null);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    // TODO: load from your backend instead of the example file, e.g.
    //   fetch("/api/hives").then(r => r.json()).then(list => setFarm({ ...example, hives: list.map(toHive) }));
    setFarm({ ...example, hives: example.hives.map(toHive) });
  }, []);

  const map = farm && resolveBasemap(farm.basemap, { hives: farm.hives, tilesFailed });
  const probeUrl = map ? map.probeUrl : null;

  useEffect(() => {
    if (!probeUrl) return undefined;
    return probeTile(probeUrl, () => setTilesFailed(true));
  }, [probeUrl]);

  if (!farm) return null;

  return (
    <Dashboard
      farmName="Meliponário Isobe"
      hives={farm.hives}
      sections={farm.sections}
      basemap={map.basemap}
      basemapStatus={map.status}
      whatsappUrl={WHATSAPP_URL}
    />
  );
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
