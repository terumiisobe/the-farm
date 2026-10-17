# Basemap

The hive map paints a farm still on `/?farm=still`, and free EOX tiles on `/`.

## Sub-features

- `basemap-still` paints `.bb-map__image` from `/assets/farm-basemap.jpg` and leaves the status line empty.
- `basemap-eox` paints `.bb-map__tile` from `tiles.maps.eox.at` and shows the limited-imagery status.

## How to get to it (user POV)

- Open `/` for the bundled example farm. That payload has no still, so the basemap is EOX.
- Open `/?farm=still` for `src/data/mock-still-farm.json`. That payload includes the sharp still, matching bounds, and hive GPS inside those bounds.

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `control-app doctor` has passed on `/`. Doctor does not open the still fixture.
- `public/assets/farm-basemap.jpg` is the file the still mock points at.

- **See EOX on the default farm.** Load the root page. Run `control-app browser goto --path /` and `control-app browser wait --role application --name "/Mapa das colmeias/"`. Run `control-app browser eval --js "({tile:!!document.querySelector('.bb-map__tile'), image:!!document.querySelector('.bb-map__image'), status:document.querySelector('p.map-status').textContent})"`. `tile` is true, `image` is false, and `status` is `Sem imagem da propriedade. Mostrando satélite com detalhe limitado.` Run `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/basemap/eox-fallback.png"`. The shot shows EOX tiles under the farm header.
- **See the still.** Load the still fixture. Run `control-app browser goto --path "/?farm=still"` and `control-app browser wait --role application --name "/Mapa das colmeias/"`. Run `control-app browser eval --js "({tile:!!document.querySelector('.bb-map__tile'), src:document.querySelector('.bb-map__image')&&document.querySelector('.bb-map__image').getAttribute('src'), status:document.querySelector('p.map-status').textContent})"`. `tile` is false, `src` is `/assets/farm-basemap.jpg`, and `status` is empty. Run `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/basemap/still-primary.png"`. The shot shows the still under the farm header, with hive markers on it.

## Gotchas

- Use `/` for the EOX check. That URL loads `src/data/example-farm.json`. Use `/?farm=still` for the still check. That URL loads `src/data/mock-still-farm.json`.
- The harness has no request-block action. Prove EOX by omitting the still. Do not try to block `tiles.maps.eox.at`.
- `.bb-map__image` is a georeferenced picture. `.bb-map__tile` is an EOX tile. On these two URLs the sample image in `basemap.fallback` stays unused.
- An empty status on `/` means the still path ran. The healthy EOX status is the limited-imagery sentence above.
- Doctor stays on `/`. It still expects heading `Meliponário Isobe`, the map, header WhatsApp, and no page scroll.
- Hive 1 on the still fixture is `Colmeia 1, Estável`. The mock reuses the placeholder hive list, and every pin sits inside the still bounds.
