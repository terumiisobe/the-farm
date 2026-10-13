# Dashboard shell

The dashboard shell is the always-visible page chrome: the farm name and live summary on the left, and the Bombus product mark on the right, above the hive map.

## Sub-features

- `shell-farm-name` shows heading `Meliponário Isobe`.
- `shell-summary` shows setor and colmeia counts from the loaded farm (4 setores · 21 colmeias) plus an `atualizado em` date.
- `shell-brand` shows the Bombus mark and the line `por Meliponário Isobe`.

## How to get to it (user POV)

- Open the app root URL in a browser (the app has a single screen; there is no separate login or nav).

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `control-app doctor` reports farm `Meliponário Isobe` and brand `Bombus`.

- **Open dashboard.** Load the root page. Run `control-app browser goto --path /`. The document title is `Bombus` and an `h1` reads `Meliponário Isobe`.
- **Read summary.** Confirm the summary line under the heading. Run `control-app browser wait --text "4 setores"` and `control-app browser wait --text "21 colmeias"`. Both strings are visible.
- **Confirm brand.** Confirm the product mark. Run `control-app browser wait --text "Bombus"` and `control-app browser wait --text "por Meliponário Isobe"`. Both are visible in the header.
- **Proof.** Capture shell identity. Run `control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/dashboard-shell/shell.aria.txt"` and `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/dashboard-shell/shell.png"`. Artifacts show `Meliponário Isobe`, `Bombus`, and the summary counts.

## Gotchas

- Before `App` finishes loading sample data the root renders nothing (`null`). Wait for `h1`, not only `#root`.
- The logo `<img>` has an empty `alt`; assert the adjacent `Bombus` text, not the image name.
- Summary counts come from sample JSON. If a change swaps the data source, update expected counts here rather than weakening the journey.
