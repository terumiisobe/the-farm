#!/usr/bin/env node
/**
 * Browser drive client for the Bombus dashboard.
 * Talks to browser-daemon.mjs so React UI state survives across commands.
 */
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const stateDir = process.env.CONTROL_APP_STATE_DIR;
const sockPath = path.join(stateDir, "browser.sock");
const metaPath = path.join(stateDir, "browser-server.json");
const daemonJs = path.join(path.dirname(fileURLToPath(import.meta.url)), "browser-daemon.mjs");

function usage() {
  console.log(`Usage: control-app browser <action> [options]

Actions:
  goto [--path /]
  click --role <role> --name <name|regex> [--exact]
  click --label <aria-label|regex>
  press --key <key>
  wait --role <role> --name <name|regex> [--timeout ms]
  wait --text <text> [--timeout ms]
  screenshot --path <file> [--full-page]
  snapshot --aria --path <file>
  href --role link --name <name|regex>
  eval --js <expression>
  stop                     Close the persistent browser for this run

Name values starting and ending with / are treated as regexes, e.g. --name "/Colmeia 1/"
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolvePath(p) {
  if (!p) throw new Error("--path is required");
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function serializeName(value, exact) {
  if (value == null) return null;
  if (value.length >= 2 && value.startsWith("/") && value.endsWith("/")) {
    return { regex: value.slice(1, -1), flags: "i" };
  }
  if (exact) return { exact: value };
  return { regex: escapeRe(value), flags: "i" };
}

function locatorSpec(args) {
  if (args.label) {
    return { type: "label", name: serializeName(args.label, args.exact) };
  }
  if (!args.role) throw new Error("--role or --label is required");
  return { type: "role", role: args.role, name: serializeName(args.name, args.exact) };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function startDaemon() {
  if (!process.env.CONTROL_APP_CHROME_BIN) throw new Error("CONTROL_APP_CHROME_BIN unset");
  fs.mkdirSync(stateDir, { recursive: true });
  try { fs.unlinkSync(sockPath); } catch { /* ignore */ }

  const child = spawn(process.execPath, [daemonJs], {
    env: process.env,
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
  });
  child.unref();

  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(sockPath)) return;
    await sleep(100);
  }
  throw new Error("browser daemon failed to start (no socket)");
}

function rpc(request) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(sockPath);
    let buf = "";
    client.on("connect", () => {
      client.write(JSON.stringify(request) + "\n");
    });
    client.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl >= 0) {
        const line = buf.slice(0, nl);
        client.end();
        try {
          const resp = JSON.parse(line);
          if (resp.ok) resolve(resp.result);
          else reject(new Error(resp.error || "browser rpc failed"));
        } catch (e) {
          reject(e);
        }
      }
    });
    client.on("error", reject);
  });
}

async function ensureDaemon() {
  if (!fs.existsSync(sockPath)) {
    await startDaemon();
  }
}

async function stopDaemon() {
  if (fs.existsSync(sockPath)) {
    try { await rpc({ action: "stop" }); } catch { /* ignore */ }
    await sleep(200);
  }
  let pid;
  try {
    pid = JSON.parse(fs.readFileSync(metaPath, "utf8")).pid;
  } catch { /* ignore */ }
  if (pid) {
    try { process.kill(pid, "TERM"); } catch { /* ignore */ }
  }
  try { fs.unlinkSync(metaPath); } catch { /* ignore */ }
  try { fs.unlinkSync(sockPath); } catch { /* ignore */ }
  console.log("browser stopped");
}

const args = parseArgs(process.argv.slice(2));
const action = args._[0];

if (!action || action === "help" || args.help) {
  usage();
  process.exit(action ? 0 : 1);
}

try {
  if (action === "stop") {
    await stopDaemon();
    process.exit(0);
  }

  await ensureDaemon();

  let result;
  switch (action) {
    case "goto":
      result = await rpc({ action: "goto", path: args.path || "/" });
      break;
    case "click":
      result = await rpc({
        action: "click",
        locator: locatorSpec(args),
        timeout: Number(args.timeout || 15000),
      });
      break;
    case "press":
      if (!args.key) throw new Error("--key is required");
      result = await rpc({ action: "press", key: args.key });
      break;
    case "wait":
      result = await rpc({
        action: "wait",
        locator: args.text
          ? { type: "text", name: serializeName(args.text, args.exact) }
          : locatorSpec(args),
        timeout: Number(args.timeout || 15000),
      });
      break;
    case "screenshot": {
      const file = resolvePath(args.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      result = await rpc({ action: "screenshot", path: file, fullPage: !!args["full-page"] });
      break;
    }
    case "snapshot": {
      if (!args.aria) throw new Error("--aria is required for snapshot");
      const file = resolvePath(args.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      result = await rpc({ action: "snapshot", path: file });
      break;
    }
    case "href":
      result = await rpc({
        action: "href",
        locator: locatorSpec({ ...args, role: args.role || "link" }),
      });
      break;
    case "eval":
      if (!args.js) throw new Error("--js is required");
      result = await rpc({ action: "eval", js: args.js });
      break;
    default:
      throw new Error(`unknown browser action: ${action}`);
  }
  if (result != null && result !== "") {
    console.log(typeof result === "string" ? result : JSON.stringify(result));
  }
} catch (err) {
  console.error(`control-app browser: ${err.message || err}`);
  process.exit(1);
}
