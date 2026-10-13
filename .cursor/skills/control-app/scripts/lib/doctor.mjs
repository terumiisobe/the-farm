#!/usr/bin/env node
/**
 * Read-only health check: is this control-app instance worth driving?
 */
import fs from "node:fs";
import { chromium } from "playwright-core";

const statePath = `${process.env.CONTROL_APP_STATE_DIR}/state.json`;
const baseUrl = process.env.CONTROL_APP_BASE_URL;
const chromeBin = process.env.CONTROL_APP_CHROME_BIN;
const runId = process.env.CONTROL_APP_RUN_ID;

function fail(msg) {
  console.error(`control-app doctor: FAIL — ${msg}`);
  process.exit(1);
}

function ok(lines) {
  for (const line of lines) console.log(line);
  console.log("control-app doctor: OK");
}

if (!fs.existsSync(statePath)) {
  fail(`no state file at ${statePath}. Run control-app launch first.`);
}

const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (!state.pid) fail("state.json missing pid");

try {
  process.kill(state.pid, 0);
} catch {
  fail(`pid ${state.pid} is not running`);
}

if (String(state.baseUrl) !== String(baseUrl)) {
  fail(`state URL ${state.baseUrl} != CONTROL_APP_BASE_URL ${baseUrl}`);
}

if (!chromeBin || !fs.existsSync(chromeBin)) {
  fail(`Chrome not found (CONTROL_APP_CHROME_BIN=${chromeBin || ""})`);
}

const html = await fetch(baseUrl + "/").then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${baseUrl}/`);
  return r.text();
}).catch((e) => fail(`HTTP fetch failed: ${e.message}`));

if (!html.includes('id="root"')) fail("index HTML missing #root");

const browser = await chromium.launch({
  executablePath: chromeBin,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h1", { timeout: 15000 });

  const farm = (await page.locator("h1").first().innerText()).trim();
  const brandCount = await page.locator(".product b").count();
  const map = page.getByRole("application", { name: /Mapa das colmeias/i });
  const mapCount = await map.count();
  const bot = page.locator("header").getByRole("link", { name: /WhatsApp/i });
  const botCount = await bot.count();
  const scroll = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
  }));

  if (farm !== "Meliponário Isobe") fail(`expected farm heading Meliponário Isobe, got ${JSON.stringify(farm)}`);
  if (brandCount > 0) fail("Bombus product mark still present in dashboard chrome");
  if (mapCount < 1) fail("hive map (role=application) not found");
  if (botCount < 1) fail("WhatsApp BotLink not found in header");
  if (scroll.sh > scroll.ch + 1) fail(`page scrolls (scrollHeight ${scroll.sh} > clientHeight ${scroll.ch})`);

  // Confirm this PID owns the port (best-effort via /proc on Linux).
  let portOwner = "unknown";
  try {
    const { execSync } = await import("node:child_process");
    const out = execSync(`ss -ltnp 'sport = :${state.port}' 2>/dev/null || true`, { encoding: "utf8" });
    portOwner = out.includes(String(state.pid)) ? `pid ${state.pid}` : out.trim().slice(0, 200) || "unconfirmed";
  } catch {
    /* optional */
  }

  ok([
    `runId=${runId}`,
    `pid=${state.pid}`,
    `url=${baseUrl}`,
    `portOwner=${portOwner}`,
    `farm=${farm}`,
    `brand=absent`,
    `map=present`,
    `botLink=header`,
    `pageScroll=false`,
    `chrome=${chromeBin}`,
  ]);
} finally {
  await browser.close();
}
