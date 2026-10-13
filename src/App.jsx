import { useEffect, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import example from "./data/example-farm.json";
import { toHive } from "./data/statusMap.js";

// Replace with the bot's real number, e.g. "https://wa.me/5511999999999".
const WHATSAPP_URL = "https://wa.me/";

export default function App() {
  const [farm, setFarm] = useState(null);

  useEffect(() => {
    // TODO: load from your backend instead of the example file, e.g.
    //   fetch("/api/hives").then(r => r.json()).then(list => setFarm({ ...example, hives: list.map(toHive) }));
    setFarm({ ...example, hives: example.hives.map(toHive) });
  }, []);

  if (!farm) return null;

  return (
    <Dashboard
      farmName="Meliponário Isobe"
      hives={farm.hives}
      sections={farm.sections}
      basemap={farm.basemap}
      whatsappUrl={WHATSAPP_URL}
    />
  );
}
