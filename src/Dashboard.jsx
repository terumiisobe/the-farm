import { HiveMap, BotLink } from "./bombus";

export default function Dashboard({ farmName, hives, sections, basemap, whatsappUrl }) {
  return (
    <div className="page">
      <header className="top">
        <h1 className="heading-sm">{farmName}</h1>
        <BotLink className="wa-header" href={whatsappUrl} title="WhatsApp" />
      </header>
      <div className="map-stage">
        <HiveMap hives={hives} sections={sections} basemap={basemap} height="100%" />
      </div>
    </div>
  );
}
