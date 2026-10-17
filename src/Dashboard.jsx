import { HiveMap, BotLink } from "./bombus";

/** Bump when the operator still tip on sat-2 changes so `npm run dev` shows a new stamp. */
export const STILL_BUILD = "still-v3";

export default function Dashboard({
  farmName,
  hives,
  sections,
  basemap,
  basemapStatus,
  whatsappUrl,
  maxZoom,
  minZoom,
  center,
  zoom,
  mapKey,
}) {
  return (
    <div className="page">
      <header className="top">
        <h1 className="heading-sm">{farmName}</h1>
        <BotLink className="wa-header" href={whatsappUrl} title="WhatsApp" />
      </header>
      <div className="map-stage">
        <p className="map-status" role="status">{basemapStatus}</p>
        <HiveMap
          key={mapKey}
          hives={hives}
          sections={sections}
          basemap={basemap}
          height="100%"
          maxZoom={maxZoom}
          minZoom={minZoom}
          center={center}
          zoom={zoom}
        />
        <p className="map-build" aria-hidden="true">{STILL_BUILD}</p>
      </div>
    </div>
  );
}
