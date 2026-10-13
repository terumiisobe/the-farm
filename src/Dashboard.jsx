import { HiveMap, BotLink } from "./bombus";

// The app's single screen: farm name + summary on the left, the Bombus mark on the right,
// the view-only map, and one link out to the WhatsApp bot. Plain beige page, nothing else.
export default function Dashboard({ farmName, hives, sections, basemap, updatedAt, whatsappUrl }) {
  const sectorCount = sections?.length ?? 0;
  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>{farmName}</h1>
          <p>
            {sectorCount} {sectorCount === 1 ? "setor" : "setores"} · {hives.length}{" "}
            {hives.length === 1 ? "colmeia" : "colmeias"}
            {updatedAt ? ` · atualizado em ${updatedAt}` : ""}
          </p>
        </div>
        <div className="product">
          <img src="/assets/bombus-bee-transparent.png" alt="" />
          <b>Bombus</b>
          <span>por Meliponário Isobe</span>
        </div>
      </header>

      <HiveMap title="Mapa das colmeias" hives={hives} sections={sections} basemap={basemap} height={600} />

      <BotLink href={whatsappUrl} />
    </div>
  );
}
