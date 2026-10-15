# WhatsApp bot link

The WhatsApp bot link sits in the dashboard header and opens the Bombus WhatsApp bot in a new tab. There is no full-width strip under the map. The dashboard itself has no chat UI.

## Sub-features

- `wa-visible` shows the BotLink in the header with a short visible title such as `WhatsApp`.
- `wa-target` points at the configured `wa.me` URL and opens in a new tab.
- `wa-header-only` has no BotLink sibling under the map.

## How to get to it (user POV)

- Open the app root. The WhatsApp control is in the header opposite the farm name.

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `src/App.jsx` still sets `WHATSAPP_URL` to a `https://wa.me/` URL (placeholder allowed).
- `control-app doctor` reports the WhatsApp link present in the header.

- **See the link.** Load the root page. Run `control-app browser goto --path /` and `control-app browser wait --role link --name "/WhatsApp/"`. The link is visible in the header; accessible name includes that it opens WhatsApp in a new tab.
- **Read target.** Inspect the href without navigating off-site. Run `control-app browser href --role link --name "/WhatsApp/"`. Stdout starts with `https://wa.me/`.
- **Confirm new tab.** Assert `target` via eval only for this attribute check. Run `control-app browser eval --js "document.querySelector('header a.bb-botlink').getAttribute('target')"`. Stdout is `_blank`.
- **Confirm header only.** Run `control-app browser eval --js "document.querySelectorAll('.page > a.bb-botlink, .map-stage ~ a.bb-botlink').length"`. Stdout is `0`.
- **Proof.** Capture the control in context. Run `control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/whatsapp-link/link.aria.txt"` and `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/whatsapp-link/link.png"`. Artifacts show the header BotLink and farm name; do not require a successful WhatsApp Web login.

## Gotchas

- Do not treat an external WhatsApp page load as proof — network/account state is out of scope. `href` + visible link + `target=_blank` are the observables.
- The placeholder URL may be exactly `https://wa.me/` with no number; assert the prefix, not a specific phone.
- If `WHATSAPP_URL` changes, update the expected prefix in this file; do not skip the href check.
