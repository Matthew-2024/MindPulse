import { spawnSync } from "node:child_process";

const commands = [
  "tests/decision-policy-tests.js",
  "tests/memo-model-tests.js",
  "tests/schedule-model-tests.js",
  "tests/bottle-repository-tests.js",
  "tests/pwa-assets-test.js",
  "tests/run-rule-tests.js",
  "tools/analyze-synthetic-records.js",
  "tools/copy-safety-audit.js",
  "tools/self-audit.js",
  "tools/run-python-tool.js",
  "tests/ui-smoke.js",
  "tests/convergence-ui-smoke.js",
  "tests/convergence-visual-smoke.js",
  "tests/demo-flow-smoke.js"
];

for (const command of commands) {
  const args = command === "tools/run-python-tool.js"
    ? [command, "tools/docx-consistency-audit.py"]
    : [command];
  console.log(`\n=== ${args.join(" ")} ===`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`FULL VERIFICATION FAILED: ${args.join(" ")} exited with ${result.status}.`);
    process.exit(result.status || 1);
  }
}

console.log(`\nFULL VERIFICATION PASSED: ${commands.length} commands, 0 failures.`);
