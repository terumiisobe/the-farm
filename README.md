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
    example-farm.json  sample farm: basemap, 4 sections, 21 hives (PLACEHOLDER coordinates)
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

## Before going live

1. **Map image + coordinates.** `example-farm.json` uses an example satellite image with
   made-up coordinates. Put your farm's image in `public/assets/`, set `basemap.bounds` to its
   real corners `[[south, west], [north, east]]`, and use real GPS for every hive and section corner.
2. **WhatsApp number.** Set `WHATSAPP_URL` in `src/App.jsx` (e.g. `https://wa.me/5511999999999`).
3. **Dark mode** (optional): add `data-theme="dark"` to `<html>`.

## Updating the design system

When Bombus changes, copy the new `bundle.js`, `bundle.css`, `tokens.json` (and regenerate
`tokens.css`) from the design system into `src/bombus/`. Rules for colours, type, hive codes and
statuses are in the design system's README — give its link to whoever (or whichever AI) builds
new screens.
