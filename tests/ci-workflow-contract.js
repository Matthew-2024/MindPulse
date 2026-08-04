import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/preflight.yml", import.meta.url), "utf8");

assert.match(workflow, /pull_request:/, "preflight must run for pull requests");
assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/, "preflight must run for main pushes");
assert.match(workflow, /npm ci/, "preflight must install the lockfile exactly");
assert.match(workflow, /denoland\/setup-deno@v2/, "CI must provision the pinned Deno runtime for Edge Function checks");
assert.match(workflow, /deno-version: v2\.9\.4/, "CI must pin the Deno runtime version");
assert.match(workflow, /deno check --node-modules-dir=auto[\s\S]*supabase\/functions\/revoke-device\/index\.ts/, "CI must typecheck every checked-in Edge Function entry point");
assert.match(workflow, /deno test --node-modules-dir=auto --allow-env supabase\/functions\/revoke-device\/handler\.test\.ts/, "CI must exercise revoke-device behavior with Deno");
assert.match(workflow, /playwright install --with-deps chromium/, "preflight must provision Chromium");
assert.match(workflow, /npm run preflight/, "CI must execute the canonical preflight command");
assert.match(workflow, /if: always\(\)/, "evidence upload must run after a failed preflight too");
assert.match(workflow, /name: preflight-regression-evidence/, "the uploaded artifact must have a stable name");
assert.match(workflow, /path: \|\s*\n\s*output\/playwright\s*\n\s*output\/regression-artifacts/, "CI must upload screenshots and regression metadata together");

console.log("CI workflow contract passed: Edge Functions, canonical preflight, and both evidence directories are configured for upload.");
