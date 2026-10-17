# Bombus — starter

A ready-to-run React 18 + Vite app with the Bombus design system wired in: the
dashboard (farm name, Bombus mark, view-only hive map, WhatsApp link) on sample data.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
```

## What's where

```
src/
  bombus/              ← the design system (copied from the Bombus artifact — don't edit by hand)
    index.js           one import for everything: tokens, fonts, styles, components
    tokens.css         colours, spacing, radii, fonts as CSS variables (--primary, --surface…)
    tokens.json        the source of tokens.css
    bundle.js / .css   the components
    bombus.d.ts        props of every component (documentation)
    fonts/             Outfit, Atkinson Hyperlegible, JetBrains Mono
  data/
    example-farm.json  sample farm: basemap slots, 4 sections, 21 hives (PLACEHOLDER coordinates)
    resolveBasemap.js  picks the satellite slot or the static fallback
    resolveFarmView.js chooses where the camera looks from hive GPS, center, or bounds
    statusMap.js       turns your backend's hives into what the map expects
  Dashboard.jsx        the app's single screen
  App.jsx              loads the data — swap the example for your API here
  app.css              page layout (tokens only)
public/assets/         logo (transparent), hive-box icon, farm satellite image
```

## Use the components anywhere

```jsx
import { HiveMap, HiveDetails, StatusBadge, BotLink, Button } from "./bombus";
```

Load `./bombus` once, before anything else (main.jsx already does). Colours and
spacing are CSS variables: `color: var(--ink); background: var(--surface); padding: var(--space-4);`.

## Connect your data

Each hive needs (see `src/data/statusMap.js` → `toHive`, adjust the field names to your API):

| field | example | shown as |
| --- | --- | --- |
| `code` | `"12"` | the number on the map — numbers only, no section prefix |
| `lat`, `lng` | `-23.9478, -46.9866` | position (WGS84 decimal degrees) |
| `status` | `stable` · `developing` · `recovering` · `lost` · `sold` | Estável · Desenvolvendo · Recuperando · Perdida · Vendida |
| `section` | `"B"` | which "Setor" outline it belongs to (optional) |
| `addedAt` | `"2025-06-30"` | Adicionada em |
| `lastInspection` | `"2026-10-09"` | Última revisão em (+ "há N dias") |
| `notes` | `"Trocar o fundo."` | Notas |

Portuguese status words from the backend (`estavel`, `perdida`…) are mapped by `toStatusKey`.

## Satellite basemap

The map shows free satellite imagery from EOX Sentinel-2 Cloudless 2025. No account and no API key.

`src/data/example-farm.json` keeps two slots under `basemap`. The app shows exactly one of them.

```json
"basemap": {
  "satellite": {
    "tiles": "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg",
    "maxZoom": 18,
    "attribution": "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)"
  },
  "fallback": {
    "image": "/assets/farm-basemap.jpg",
    "bounds": [[-23.949258, -46.988093], [-23.946742, -46.983907]],
    "attribution": "Imagem de satélite: exemplo · coordenadas ilustrativas",
    "alt": "Imagem de satélite da propriedade"
  }
}
```

`satellite` is the default. Keep EOX's `{z}/{y}/{x}` order. `maxZoom` stays 18 because this mosaic returns 404 at zoom 19. The map passes that 18 to HiveMap, so the plus button, the mouse wheel, and pinch stop at 18. Fit stops one level lower, at 17. The app does not request empty zoom-19 tiles.

Tiles fade in over 0.35 seconds. When the reader prefers reduced motion, tiles appear at once. The app also preloads the centre tile at zoom 16 and the four tiles next to it. Markers stay visible while tiles arrive. There is no full-screen spinner.

On startup the app requests one tile at zoom 16. That request does not block the dashboard. If it fails while tiles are on screen, or while they are still loading, the status line reads `Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.` and the live tiles stay. The saved farm image replaces the tiles only when every tile image has already finished with no pixels. A failure after the first tile has painted does not switch to that image.

`fallback` is that saved image. Without a `fallback` slot, a total tile failure keeps the plain map surface and the status line does not mention a saved image.

Do not put `tiles` and `image` in the same slot. The app throws on startup if you do.

When you move to a new mosaic year, change the year in `tiles` and in `attribution` together. Tests fail if the years disagree.

The farm object may also include hive GPS (`lat` / `lng`, or `latitude` / `longitude`), `center` as `[lat, lng]`, `bounds` as `[[south, west], [north, east]]`, and `address`. Hive GPS wins. The map fits those hives and does not take `center` or `zoom` from the payload. A hive with a null coordinate is skipped. `Number(null)` is 0, and that pin would sit at 0,0. With no hive GPS, `center` and `bounds` open the map between zoom 15 and 16, still capped by satellite `maxZoom`. Farm `bounds` are not copied onto the fallback image. That image box would clamp panning to the old photo. The browser does not geocode `address`. An empty `address` counts as absent. Send `center` or hive GPS from the backend when the map should open on a real place.

`example-farm.json` keeps placeholder coordinates and an empty `address`. Do not commit a real street as the sample.

EOX free mosaics for 2018 to 2025 are CC BY-NC-SA 4.0. Viewing your own farm is the intended free use. If the dashboard is sold, white-labeled, or run as a paid multi-tenant product, get an EOX commercial license or move to a paid provider first. Mapbox Satellite is an optional later upgrade, with a token from the environment and never committed. This version does not require it.

## Before going live

1. **Map image + coordinates.** `example-farm.json` ships EOX tiles plus an example fallback image at made-up coordinates. Keep `basemap.satellite` on the EOX template unless you change the mosaic year in the URL and the attribution together. Put your farm photo in `public/assets/`, set `basemap.fallback.bounds` to the real corners `[[south, west], [north, east]]`, and use real GPS for every hive and section corner.
2. **WhatsApp number.** Set `WHATSAPP_URL` in `src/App.jsx` (e.g. `https://wa.me/5511999999999`).
3. **Dark mode** (optional): add `data-theme="dark"` to `<html>`.

## Updating the design system

When Bombus changes, copy the new `bundle.js`, `bundle.css`, `tokens.json` (and regenerate
`tokens.css`) from the design system into `src/bombus/`. Rules for colours, type, hive codes and
statuses are in the design system's README — give its link to whoever (or whichever AI) builds
new screens.
