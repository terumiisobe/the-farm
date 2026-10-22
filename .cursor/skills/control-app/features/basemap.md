# Basemap

The hive map paints the farm still by default (operator PNG + SW/NE bounds from the GET snapshot, or the local operator still when the snapshot omits a picture). EOX tiles appear only if that still fails to decode.

## Sub-features

- `basemap-still` paints `.bb-map__image` from `/assets/farm-basemap.png` and leaves the status line empty.
- `basemap-eox` paints `.bb-map__tile` from `tiles.maps.eox.at` after a still decode failure (no control-app hook to force that path).

## How to get to it (user POV)

- Open `/` with a healthy farm load (control-app launch starts a local mock GET). The snapshot includes or inherits the operator still, so the basemap is the still.
- There is no `/?farm=still` fixture route.

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `control-app doctor` has passed on `/`.
- `public/assets/farm-basemap.png` is present.

- **See the still.** Load the root page. Run `control-app browser goto --path /` and `control-app browser wait --role application --name "/Mapa das colmeias/"`. Run `control-app browser eval --js "({tile:!!document.querySelector('.bb-map__tile'), src:document.querySelector('.bb-map__image')&&document.querySelector('.bb-map__image').getAttribute('src'), status:(document.querySelector('p.map-status')||{}).textContent||''})"`. `tile` is false, `src` is `/assets/farm-basemap.png`, and `status` is empty. Run `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/basemap/still-primary.png"`. The shot shows the still under the farm header, with hive markers on it.
- **EOX fallback (`basemap-eox`).** Not driveable in this harness: there is no request-block or still-fail action. Treat as verified-unreachable unless product adds a fail hook. Do not use a removed `farm=still` query.

## Gotchas

- Launch points Vite at the skill mock API (`CONTROL_APP_MOCK_BASE_URL`). Do not expect Render CORS for doctor/drive.
- `.bb-map__image` is the georeferenced still. `.bb-map__tile` is an EOX tile.
- An empty status on `/` means the still path ran. The limited-imagery status sentence appears only after still failure.
- Doctor stays on `/`. It expects heading `Meliponário Isobe`, the map, header WhatsApp, and no page scroll.
- Hive 1 on the mock snapshot is `Colmeia 1, Estável`.
