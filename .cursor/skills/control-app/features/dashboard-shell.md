# Dashboard shell

The dashboard shell is the slim header above the hive map: farm name on the left and the WhatsApp control on the right. The page fills the viewport and does not scroll.

## Sub-features

- `shell-farm-name` shows heading `Meliponário Isobe`.
- `shell-whatsapp` shows the compact WhatsApp control in the header.
- `shell-no-brand` has no Bombus bee image or product wordmark in chrome.
- `shell-no-scroll` keeps `documentElement.scrollHeight <= clientHeight`.

## How to get to it (user POV)

- Open the app root URL in a browser (the app has a single screen; there is no separate login or nav).

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `control-app doctor` reports farm `Meliponário Isobe`, brand absent, WhatsApp in header, and no page scroll.

- **Open dashboard.** Load the root page. Run `control-app browser goto --path /`. The document title is `Bombus` and an `h1` reads `Meliponário Isobe`.
- **Confirm no product mark.** Assert the bee and wordmark are gone. Run `control-app browser eval --js "document.querySelectorAll('.product b, img[src*=\"bombus-bee\"]').length"`. Stdout is `0`.
- **Confirm WhatsApp in header.** Run `control-app browser wait --role link --name "/WhatsApp/"`. The link lives inside `header`.
- **Confirm no page scroll.** Run `control-app browser eval --js "({sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight})"`. `sh` is not greater than `ch`.
- **Proof.** Capture shell identity. Run `control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/dashboard-shell/shell.aria.txt"` and `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/dashboard-shell/shell.png"`. Artifacts show `Meliponário Isobe` and the header WhatsApp control, with no Bombus product block.

## Gotchas

- Before `App` finishes loading sample data the root renders nothing (`null`). Wait for `h1`, not only `#root`.
- Do not expect setores/colmeias/atualizado in the header. Hive counts live in the map legend.
- Document title may still say `Bombus`; that is not on-screen chrome.
