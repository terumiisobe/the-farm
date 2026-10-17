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
    example-farm.json  sample farm with operator still + bounds, EOX fallback, 4 sections, 21 hives
    mock-still-farm.json  harness still (same operator still box)
    mock-eox-farm.json   no still: EOX path for harness (`/?farm=eox`)
    resolveBasemap.js  picks the farm still, EOX tiles, or the sample image
    resolveFarmView.js chooses where the camera looks from hive GPS, farm centre, or a still box
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

## Basemap

The map paints one basemap. A farm still wins when the payload includes `basemap.image` and `basemap.bounds` and that image loads. Free EOX Sentinel-2 Cloudless 2025 tiles are the fallback when the still is absent or fails before it decodes. The `fallback` image is the offline sample, and it is also the paint after every live tile has failed. No account and no API key.

`src/data/example-farm.json` is the default offline farm. It includes top-level `basemap.image` (`/assets/farm-basemap.png`) and operator SW/NE bounds `[[-25.762684, -49.189889], [-25.761622, -49.188210]]`, so `/` paints the still. EOX stays on `basemap.satellite` as fallback. Open `/?farm=eox` for the no-still path. Both files keep an empty `address`. The browser does not geocode `address`. Do not commit a street, a house number, or a private geocode.

```json
"basemap": {
  "image": "/assets/farm-basemap.png",
  "bounds": [[-25.762684, -49.189889], [-25.761622, -49.188210]],
  "attribution": "Imagem da propriedade",
  "satellite": {
    "tiles": "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg",
    "maxZoom": 18,
    "attribution": "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)"
  },
  "fallback": {
    "image": "/assets/farm-basemap.png",
    "bounds": [[-25.762684, -49.189889], [-25.761622, -49.188210]],
    "attribution": "Imagem de satélite: exemplo · coordenadas ilustrativas",
    "alt": "Imagem de satélite da propriedade"
  }
}
```

Put the farm picture on `image` and `bounds`. A `still` key is rejected. `tiles` belongs on `satellite`. Keep EOX's `{z}/{y}/{x}` order.

A loaded still has an empty status line. Healthy EOX uses `Sem imagem da propriedade. Mostrando satélite com detalhe limitado.` That sentence means the imagery is limited. If the zoom-16 probe fails while tiles are on screen, or while they are still loading, the status line is only `Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.` The live tiles stay. The sample image replaces the tiles only when every tile image has already finished with no pixels. After a still has decoded, a later error does not switch the basemap to tiles. One early still failure can switch to EOX. A second failure leaves that choice in place.

On the EOX path, `maxZoom` stays 18 because this mosaic returns 404 at zoom 19. The map passes that 18 to HiveMap, so the plus button, the mouse wheel, and pinch stop at 18. Fit stops one level lower, at 17. The app does not request empty zoom-19 tiles. A still omits that cap, so HiveMap uses its default maximum of 21.

Tiles fade in over 0.35 seconds. When the reader prefers reduced motion, tiles appear at once. Tile preload runs only on the EOX path. The app requests the centre tile at zoom 16 and the four tiles next to it. Markers stay visible while tiles arrive. There is no full-screen spinner.

When you move to a new mosaic year, change the year in `tiles` and in `attribution` together. Tests fail if the years disagree.

The farm object may also include hive GPS (`lat` / `lng`, or `latitude` / `longitude`), `center` as `[lat, lng]`, `bounds` as `[[south, west], [north, east]]`, and `address`. Hive GPS wins. The map fits those hives. On that path, payload `center` and `zoom` stay unused. A hive with a null coordinate is skipped. `Number(null)` is 0, and that pin would sit at 0,0. With no hive GPS, farm `center` and farm `bounds` open the map between zoom 15 and 16, still capped by satellite `maxZoom` when EOX is the paint. If those fields are absent too, a still or the sample image uses its own bounds. The EOX paint has no `bounds`, so panning on tiles ignores the still rectangle. An empty `address` counts as absent. Send `center`, `bounds`, or hive GPS from the backend when the map should open on a real place.

EOX free mosaics for 2018 to 2025 are CC BY-NC-SA 4.0. Viewing your own farm is the intended free use. If the dashboard is sold, white-labeled, or run as a paid multi-tenant product, get an EOX commercial license or replace the mosaic first.

## Before going live

1. **Map image + coordinates.** Send the sharp still as `basemap.image` and `basemap.bounds`. Keep `basemap.satellite` on the EOX template unless you change the mosaic year in the URL and the attribution together. `basemap.fallback` stays the offline sample. Host the still yourself or put it in `public/assets/`, set the still bounds to the real corners `[[south, west], [north, east]]`, and use real GPS for every hive and section corner. Leave `address` empty in the repo.
2. **WhatsApp number.** Set `WHATSAPP_URL` in `src/App.jsx` (e.g. `https://wa.me/5511999999999`).
3. **Dark mode** (optional): add `data-theme="dark"` to `<html>`.

## Updating the design system

When Bombus changes, copy the new `bundle.js`, `bundle.css`, `tokens.json` (and regenerate
`tokens.css`) from the design system into `src/bombus/`. Rules for colours, type, hive codes and
statuses are in the design system's README — give its link to whoever (or whichever AI) builds
new screens.
