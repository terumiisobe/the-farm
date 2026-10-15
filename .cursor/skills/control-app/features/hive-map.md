# Hive map

The hive map is the main interactive surface: a view-only satellite map of colmeias with zoom controls, a status legend, and a details panel when a hive is selected.

## Sub-features

- `map-present` shows the map application region titled for hive navigation.
- `map-select-hive` opens details for a chosen hive marker.
- `map-close-details` dismisses the details panel.
- `map-zoom` zooms in, zooms out, and fits all hives.
- `map-legend-filter` toggles a status chip to hide/show markers of that status.

## How to get to it (user POV)

- Open the app root; the map is on the single dashboard screen under the header.
- Choose a hive marker on the map to open details.
- Use the zoom control group (`Aproximar`, `Afastar`, `Enquadrar todas as colmeias`).
- Use a legend status chip (e.g. `Estável`) to filter markers.

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- Sample farm includes hive `1` with status Estável.
- `control-app doctor` reports the map present.

- **See the map.** Load the root page. Run `control-app browser goto --path /` and `control-app browser wait --role application --name "/Mapa das colmeias/"`. The map application is visible and fills the space under the header. The legend shows the hive count (`21 colmeias`); it may omit a legend title.
- **Select a hive.** Choose hive 1. Run `control-app browser click --role button --name "/Colmeia 1, Estável/"`. A region named `Detalhes da colmeia 1` appears with status `Estável`.
- **Close details.** Dismiss the panel. Run `control-app browser click --role button --name "Fechar detalhes"`. The details region is gone.
- **Zoom.** Focus map controls. Run `control-app browser click --role button --name "Aproximar"`, then `control-app browser click --role button --name "Afastar"`, then `control-app browser click --role button --name "Enquadrar todas as colmeias"`. Each control remains reachable; the map application stays visible.
- **Legend filter.** Toggle Estável off then on. Run `control-app browser click --role button --name "/^Estável/"` (chip accessible name is `Estável <count>`, e.g. `Estável 13`; it becomes `aria-pressed=false` / visually off). Run the same click again to restore. After hiding, selecting a hidden-status hive is not required for this sub-feature.
- **Proof.** Reselect hive 1 and capture. Run `control-app browser click --role button --name "/Colmeia 1, Estável/"`, `control-app browser wait --role region --name "/Detalhes da colmeia 1/"`, `control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/hive-map/selected.aria.txt"`, and `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/hive-map/selected.png"`. Artifacts show the map, farm chrome, and details for colmeia 1.

## Gotchas

- Marker accessible names include the Portuguese status label (`Estável`, not `stable`).
- Hive details use a `<section aria-label="Detalhes da colmeia …">` — drive with `--role region` (or the platform's section role), not a dialog.
- Markers can occlude each other at low zoom; if click misses, run `Enquadrar todas as colmeias` or `Aproximar` first.
- Legend chips expose accessible names like `Estável 13` (label + count). Match with `/^Estável/` (or the status you mean), not the bare word alone if it collides with details copy.
- Legend chips share status words with badges inside details; prefer the chip’s `aria-pressed` toggle in the legend list.
- The map is view-only: there is no edit/save path to prove.
