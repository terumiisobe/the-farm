#!/usr/bin/env node
/**
 * Local meliponary GET mock for control-app verification.
 * Serves src/data/example-farm.json shaped as the API snapshot, with CORS open
 * so Vite on localhost can fetch without the Render backend.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const port = Number(process.env.CONTROL_APP_MOCK_PORT || 8791);
const host = process.env.CONTROL_APP_MOCK_HOST || "127.0.0.1";
const repoRoot = process.env.CONTROL_APP_REPO_ROOT;
const stateDir = process.env.CONTROL_APP_STATE_DIR;

if (!repoRoot) {
  console.error("control-app mock-api: CONTROL_APP_REPO_ROOT required");
  process.exit(1);
}

const examplePath = path.join(repoRoot, "src/data/example-farm.json");
const raw = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const snapshot = {
  farmName: raw.farmName,
  address: typeof raw.address === "string" ? raw.address : "",
  updatedAt: raw.updatedAt ?? null,
  hives: Array.isArray(raw.hives)
    ? raw.hives.map((h) => ({
        code: h.code ?? null,
        lat: h.lat ?? null,
        lng: h.lng ?? null,
        status: h.status ?? null,
        addedAt: h.addedAt ?? null,
        lastInspection: h.lastInspection ?? null,
        ...(h.notes ? { notes: h.notes } : {}),
      }))
    : [],
  basemap: {
    image: raw.basemap?.image || "/assets/farm-basemap.png",
    bounds: raw.basemap?.bounds,
    attribution: raw.basemap?.attribution || "Imagem da propriedade",
  },
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "X-User-Id, Accept");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${host}:${port}`);
  if (req.method === "GET" && /^\/v1\/meliponarios\/\d+$/.test(url.pathname)) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(snapshot));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.listen(port, host, () => {
  const base = `http://${host}:${port}`;
  if (stateDir) {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, "mock-api.json"),
      JSON.stringify({ pid: process.pid, baseUrl: base, port, host }, null, 2),
    );
  }
  console.log(`control-app mock-api: ${base} pid=${process.pid}`);
});
