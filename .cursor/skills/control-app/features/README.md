# Bombus dashboard verification map

This directory is the maintained source for verifying user-facing behavior of the Bombus farm dashboard. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `control-app launch` so Vite serves `CONTROL_APP_BASE_URL` (default `http://127.0.0.1:5173`).
- Set a unique `CONTROL_APP_RUN_ID` (and free `CONTROL_APP_PORT`) when another verification run may be active.
- Sample farm data is the bundled `src/data/example-farm.json` (4 setores, 21 colmeias). No separate seed step.
- Put `.cursor/skills/control-app/scripts` on `PATH`.
- Run `control-app doctor` and require farm heading `Meliponário Isobe`, brand `Bombus`, map present, WhatsApp link present.
- Never drive an instance that was not started by this verification run.
- Viewport for proof: desktop width ≥ 1280 (harness default 1440×900).

## Driving conventions

- Start every recipe from a fresh `control-app browser goto --path /` unless preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or coordinates.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-app browser`.
- Portuguese UI copy is authoritative (`Estável`, `setores`, `colmeias`, …).
- Cleanup removes the Vite process and `/tmp` scratch only. Proof artifacts stay under `.cursor/skills/control-app/artifacts/`.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with farm name and Bombus identity visible.
- Record the feature ID and entry point used with every artifact (use a subdirectory named after the feature file stem).
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-app` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Dashboard shell](./dashboard-shell.md) covers farm chrome: name, summary line, Bombus mark.
- [Hive map](./hive-map.md) covers map presence, hive selection/details, zoom, and legend filtering.
- [WhatsApp bot link](./whatsapp-link.md) covers the outbound BotLink strip and its `wa.me` target.
