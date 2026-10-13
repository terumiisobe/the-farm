# WhatsApp bot link

The WhatsApp bot link is the outbound strip under the map that sends the user to the Bombus WhatsApp bot in a new tab. The dashboard itself has no chat UI.

## Sub-features

- `wa-visible` shows the BotLink with the default title about managing hives on WhatsApp.
- `wa-target` points at the configured `wa.me` URL and opens in a new tab.

## How to get to it (user POV)

- Open the app root and scroll to the bottom of the dashboard if needed.
- Activate the WhatsApp strip link.

## Driving it with control-app

Preconditions:

- Bombus is healthy at `CONTROL_APP_BASE_URL`.
- `src/App.jsx` still sets `WHATSAPP_URL` to a `https://wa.me/` URL (placeholder allowed).
- `control-app doctor` reports the WhatsApp link present.

- **See the link.** Load the root page. Run `control-app browser goto --path /` and `control-app browser wait --role link --name "/WhatsApp/"`. The link is visible; accessible name includes that it opens WhatsApp in a new tab.
- **Read target.** Inspect the href without navigating off-site. Run `control-app browser href --role link --name "/WhatsApp/"`. Stdout starts with `https://wa.me/`.
- **Confirm new tab.** Assert `target` via eval only for this attribute check. Run `control-app browser eval --js "document.querySelector('a.bb-botlink').getAttribute('target')"`. Stdout is `_blank`.
- **Proof.** Capture the strip in context. Run `control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/whatsapp-link/link.aria.txt"` and `control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/whatsapp-link/link.png" --full-page`. Artifacts show the BotLink and farm identity; do not require a successful WhatsApp Web login.

## Gotchas

- Do not treat an external WhatsApp page load as proof — network/account state is out of scope. `href` + visible link + `target=_blank` are the observables.
- The placeholder URL may be exactly `https://wa.me/` with no number; assert the prefix, not a specific phone.
- If `WHATSAPP_URL` changes, update the expected prefix in this file; do not skip the href check.
