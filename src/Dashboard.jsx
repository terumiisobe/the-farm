import { Button, HiveMap, BotLink } from "./bombus";

const NOTICES = {
  loading: {
    role: "status",
    text: "Carregando colmeias…",
    retry: false,
  },
  unauthorized: {
    role: "alert",
    text: "Não foi possível confirmar seu acesso a este meliponário.",
    retry: false,
  },
  "not-found": {
    role: "alert",
    text: "Não encontramos este meliponário ou você não tem acesso a ele.",
    retry: false,
  },
  unavailable: {
    role: "alert",
    text: "Não foi possível carregar as colmeias agora.",
    retry: true,
  },
};

export default function Dashboard({ view, whatsappUrl, onRetry }) {
  const title = view.phase === "ready" ? view.farm.name : "Bombus";
  const notice = view.phase === "ready" ? null : NOTICES[view.phase === "failed" ? view.reason : "loading"];

  return (
    <div className="page">
      <header className="top">
        <h1 className="heading-sm">{title}</h1>
        <BotLink className="wa-header" href={whatsappUrl} title="WhatsApp" />
      </header>
      {view.phase === "ready" ? (
        <div className="map-stage">
          <p className="map-status" role="status">{view.basemapStatus}</p>
          <HiveMap
            key={view.mapKey}
            hives={view.farm.hives}
            sections={view.farm.sections}
            basemap={view.basemap}
            height="100%"
            maxZoom={view.maxZoom}
            minZoom={view.minZoom}
            center={view.center}
            zoom={view.zoom}
          />
        </div>
      ) : (
        <div className="load-notice">
          <p role={notice.role}>{notice.text}</p>
          {notice.retry ? (
            <Button type="button" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
