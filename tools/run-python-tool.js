import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [script, ...args] = process.argv.slice(2);

if (!script) {
  console.error("Usage: node tools/run-python-tool.js <script.py> [args...]");
  process.exit(1);
}

const bundledPython = join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);

const candidates = [
  process.env.PYTHON_EXE,
  process.env.PYTHON,
  bundledPython,
  "python3",
  "python"
].filter(Boolean);

let lastError = "";
for (const python of candidates) {
  if (python.endsWith(".exe") && !existsSync(python)) continue;

  const result = spawnSync(python, [resolve(script), ...args], {
    cwd: process.cwd(),
    stdio: "inherit"
  });

  if (!result.error) {
    process.exit(result.status ?? 0);
  }

  lastError = `${python}: ${result.error.message}`;
}

console.error(`Unable to run Python tool. ${lastError}`);
process.exit(1);
