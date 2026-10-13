---
name: control-app
description: "Prove Bombus dashboard UI changes by launching the Vite app, driving the real React UI (hive map, farm chrome, WhatsApp link), and capturing screenshots/ARIA evidence. Use for /control-app, dashboard UI proof, or when a PR claims a visual/interaction change on the Bombus farm dashboard."
---

# control-app — Bombus dashboard verification

Drive the **Bombus** React 18 + Vite farm dashboard the way a user does: launch the real app, exercise mapped features, capture proof. Read this cold mid-task — do not invent alternate ports, fixtures, or selectors.

Desktop-first. Single screen: farm name, Bombus mark, view-only hive map, WhatsApp bot link. Sample data from `src/data/example-farm.json` (4 setores, 21 colmeias).

## Launch

From the repo root:

```bash
export CONTROL_APP_RUN_ID="${CONTROL_APP_RUN_ID:-$(date +%s)}"
export CONTROL_APP_PORT="${CONTROL_APP_PORT:-5173}"
export PATH="$PWD/.cursor/skills/control-app/scripts:$PATH"

control-app launch          # prints http://127.0.0.1:$PORT
control-app doctor          # must OK before any drive
```

- Installs app deps (`npm install` at repo root) and harness deps (skill-local `playwright-core`) if missing.
- Starts `npx vite --host 127.0.0.1 --port $CONTROL_APP_PORT --strictPort`.
- Ready means `/` returns HTML with `#root` **and** `doctor` sees heading `Meliponário Isobe`, brand `Bombus`, the map, and the WhatsApp link — not merely that a port answers.
- State lives under `/tmp/control-app-$CONTROL_APP_RUN_ID/` (pid, log, URL). Never drive an instance you did not launch for this run.
- Isolation: pick a free `CONTROL_APP_PORT` per concurrent run. `--strictPort` refuses to steal another process's port. This app has no server-side data dir; sample farm JSON is bundled.
- Teardown: `control-app cleanup` (see Cleanup).

## Doctor

```bash
control-app doctor
```

Read-only. Passes only when:

1. State file exists and its `pid` is alive.
2. `CONTROL_APP_BASE_URL` matches the launched URL.
3. System Chrome is available (`CONTROL_APP_CHROME_BIN`).
4. A headless browser load shows farm heading **Meliponário Isobe**, product mark **Bombus**, `role=application` map matching `/Mapa das colmeias/`, and a WhatsApp link.

Run doctor first whenever anything looks off, and again after a failed drive before retrying.

## Drive

Harness: Playwright Core against system Chrome via `control-app browser …`. Prefer ARIA roles and accessible names from this app:

| Surface | Stable handle |
| --- | --- |
| Farm name | `h1` text `Meliponário Isobe` |
| Brand | `.product b` → `Bombus` (visible identity; alt on logo is empty) |
| Hive map | `role=application` name `/Mapa das colmeias/` |
| Zoom in / out / fit | buttons `Aproximar`, `Afastar`, `Enquadrar todas as colmeias` |
| Hive marker | button name `/Colmeia <code>, <status label>/` e.g. `Colmeia 1, Estável` |
| Hive details | `role=region` (section) `Detalhes da colmeia <code>`; close `Fechar detalhes` |
| Legend chip | button with status label (`Estável`, `Desenvolvendo`, …), `aria-pressed` |
| WhatsApp | link name `/WhatsApp/` → `https://wa.me/` (placeholder in `src/App.jsx`) |

```bash
control-app browser goto --path /
control-app browser click --role button --name "/Colmeia 1, Estável/"
control-app browser wait --role region --name "/Detalhes da colmeia 1/"
control-app browser screenshot --path "$CONTROL_APP_ARTIFACTS/hive-map/selected.png"
control-app browser snapshot --aria --path "$CONTROL_APP_ARTIFACTS/hive-map/selected.aria.txt"
```

Browser commands share one long-lived daemon page per `CONTROL_APP_RUN_ID` (Unix socket under the run state dir), so selection/zoom/legend state carries across steps. `control-app cleanup` and `control-app browser stop` tear that daemon down.

Never open the WhatsApp URL in a way that depends on an external account. Assert `href` with `control-app browser href --role link --name "/WhatsApp/"`.

Feature recipes live in [`features/`](features/README.md). A proof that drives one convenient entry point is incomplete when the map lists others for the claimed change — cover every mapped entry point the change touches.

## Evidence

Default directory (survives cleanup):

```text
.cursor/skills/control-app/artifacts/
```

Override with `CONTROL_APP_ARTIFACTS` if needed. Proof standards:

- Exercise the real UI path (click markers / zoom / link), not React internals or test-only hooks.
- Capture **action + resulting state** (e.g. marker click **and** details panel), not only the final screen.
- Include an ARIA snapshot and a screenshot where farm name + Bombus identity are visible.
- Record feature ID and entry point with every artifact (subdir named after the feature file stem).
- Side effects: this dashboard is view-only besides opening WhatsApp in a new tab — verify `href` and `target=_blank` rather than completing an external chat.
- Video (optional but preferred for UI PRs): record the drive with the agent's screen recorder while the headed browser or desktop shows `CONTROL_APP_BASE_URL`.

## Cleanup

```bash
control-app cleanup
```

Stops **only** the pid recorded for this `CONTROL_APP_RUN_ID` (and any process still bound to that run's port). Removes scratch under `/tmp/control-app-$CONTROL_APP_RUN_ID/`. **Does not** delete `$CONTROL_APP_ARTIFACTS`. After cleanup, confirm evidence files still exist at the named paths.

Never `pkill -f vite` / kill by process name — that can destroy another agent's instance.

## Helpers

Executable entrypoint:

```bash
.cursor/skills/control-app/scripts/control-app
```

Put it on `PATH` as shown in Launch, or invoke by absolute path. Skill-local Node deps install into `.cursor/skills/control-app/node_modules` (harness only — not a product dependency). Requires system Chrome (`google-chrome` / `chromium`).

```bash
control-app env                 # resolved configuration
control-app browser help        # drive actions
```

## Maintenance

When the dashboard UI or selectors drift, run `/maintain-verification-skill` against this skill (`.cursor/skills/control-app/`).
