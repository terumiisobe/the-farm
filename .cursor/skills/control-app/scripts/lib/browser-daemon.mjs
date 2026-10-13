#!/usr/bin/env node
/**
 * Long-lived Playwright session for one control-app run.
 * Speaks JSON-lines over a Unix socket at $CONTROL_APP_STATE_DIR/browser.sock.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.CONTROL_APP_BASE_URL;
const chromeBin = process.env.CONTROL_APP_CHROME_BIN;
const stateDir = process.env.CONTROL_APP_STATE_DIR;
const sockPath = path.join(stateDir, "browser.sock");
const metaPath = path.join(stateDir, "browser-server.json");

function nameFrom(spec) {
  if (!spec) return undefined;
  if (spec.exact != null) return spec.exact;
  if (spec.regex != null) return new RegExp(spec.regex, spec.flags || "i");
  return undefined;
}

function loc(page, locator) {
  if (!locator) throw new Error("locator required");
  if (locator.type === "label") return page.getByLabel(nameFrom(locator.name));
  if (locator.type === "text") return page.getByText(nameFrom(locator.name));
  if (locator.type === "role") {
    return page.getByRole(locator.role, { name: nameFrom(locator.name) });
  }
  throw new Error(`unknown locator type ${locator.type}`);
}

fs.mkdirSync(stateDir, { recursive: true });
try { fs.unlinkSync(sockPath); } catch { /* ignore */ }

const browser = await chromium.launch({
  executablePath: chromeBin,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
});
const page = await context.newPage();
await page.goto(baseUrl.replace(/\/$/, "") + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("h1", { timeout: 15000 });

async function handle(req) {
  switch (req.action) {
    case "goto": {
      const p = req.path || "/";
      await page.goto(baseUrl.replace(/\/$/, "") + p, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("h1", { timeout: 15000 });
      return page.url();
    }
    case "click": {
      const target = loc(page, req.locator).first();
      await target.waitFor({ state: "visible", timeout: req.timeout || 15000 });
      await target.click();
      return "clicked";
    }
    case "press": {
      await page.keyboard.press(req.key);
      return `pressed ${req.key}`;
    }
    case "wait": {
      const target = loc(page, req.locator).first();
      await target.waitFor({ state: "visible", timeout: req.timeout || 15000 });
      return "ready";
    }
    case "screenshot": {
      await page.screenshot({ path: req.path, fullPage: !!req.fullPage });
      return req.path;
    }
    case "snapshot": {
      const snapshot = await page.locator("body").ariaSnapshot();
      fs.writeFileSync(req.path, snapshot);
      return req.path;
    }
    case "href": {
      const target = loc(page, req.locator).first();
      return (await target.getAttribute("href")) || "";
    }
    case "eval": {
      const value = await page.evaluate(req.js);
      return typeof value === "string" ? value : JSON.stringify(value);
    }
    case "stop": {
      setTimeout(async () => {
        try { await browser.close(); } catch { /* ignore */ }
        try { fs.unlinkSync(sockPath); } catch { /* ignore */ }
        try { fs.unlinkSync(metaPath); } catch { /* ignore */ }
        process.exit(0);
      }, 50);
      return "stopping";
    }
    default:
      throw new Error(`unknown action ${req.action}`);
  }
}

const server = net.createServer((socket) => {
  let buf = "";
  socket.on("data", async (chunk) => {
    buf += chunk.toString("utf8");
    const nl = buf.indexOf("\n");
    if (nl < 0) return;
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    let resp;
    try {
      const req = JSON.parse(line);
      const result = await handle(req);
      resp = { ok: true, result };
    } catch (err) {
      resp = { ok: false, error: err.message || String(err) };
    }
    try {
      socket.write(JSON.stringify(resp) + "\n");
    } catch { /* ignore */ }
  });
});

server.listen(sockPath, () => {
  fs.writeFileSync(
    metaPath,
    JSON.stringify({ sock: sockPath, pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
  );
});

function shutdown() {
  browser.close().finally(() => {
    try { fs.unlinkSync(sockPath); } catch { /* ignore */ }
    try { fs.unlinkSync(metaPath); } catch { /* ignore */ }
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
