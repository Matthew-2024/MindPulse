import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const scripts = [
  "test:react:ui",
  "test:react:shell",
  "test:react:security",
  "test:react:storage",
  "test:react:storage-isolation",
  "test:react:decision",
  "test:react:bottle",
  "test:react:visual",
  "test:react:handoff",
  "test:react:resources",
  "test:react:resource-admin",
  "test:react:phase21",
  "test:react:policy-lab",
  "test:react:trusted-circle",
  "test:react:matrix"
];

const host = process.env.REACT_HOST || "127.0.0.1";
const port = Number(process.env.REACT_PORT || 5180);
const baseUrl = process.env.REACT_BASE_URL || `http://${host}:${port}`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
let devProcess = null;

async function isHealthy() {
  try {
    const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isHealthy()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`React dev server did not become ready at ${baseUrl}`);
}

async function startServerIfNeeded() {
  if (await isHealthy()) return;
  const viteEntry = resolve("node_modules/vite/bin/vite.js");
  if (!existsSync(viteEntry)) throw new Error(`Vite entry is missing: ${viteEntry}`);
  devProcess = spawn(process.execPath, [viteEntry, "--host", host, "--port", String(port)], {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true
  });
  await waitForServer();
}

function stopServer() {
  if (!devProcess || devProcess.killed) return;
  if (process.platform === "win32" && devProcess.pid) {
    spawnSync("taskkill", ["/pid", String(devProcess.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    devProcess.kill("SIGTERM");
  }
}

function runScript(script, environment) {
  return new Promise((resolvePromise, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : npmCommand;
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", `${npmCommand} run ${script}`]
      : ["run", script];
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      windowsHide: true
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${script} exited with ${code ?? signal}`));
    });
  });
}

try {
  await startServerIfNeeded();
  for (const script of scripts) {
    console.log(`\n=== ${script} ===`);
    await runScript(script, { ...process.env, REACT_BASE_URL: baseUrl });
  }
  console.log(`\nCanonical React verification passed against ${baseUrl}.`);
} finally {
  stopServer();
}
