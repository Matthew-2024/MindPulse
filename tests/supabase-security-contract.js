import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const shared = source("../supabase/functions/_shared/utils.ts");
const combinedApi = source("../supabase/functions/mindpulse-api/index.ts");
const emailCode = source("../supabase/functions/request-email-code/index.ts");

for (const [name, implementation] of [["shared utilities", shared], ["combined API", combinedApi]]) {
  assert.doesNotMatch(implementation, /origin \|\| "\*"/, `${name} must not default CORS to wildcard access`);
  assert.doesNotMatch(implementation, /pattern === "\*"/, `${name} must not accept a wildcard allowed origin`);
  assert.doesNotMatch(implementation, /allowed\.some\(matches\) \? origin : allowed\[0\]/, `${name} must not emit an allow-origin header for an unapproved origin`);
}

for (const [name, implementation] of [["combined API", combinedApi], ["standalone email-code endpoint", emailCode]]) {
  assert.doesNotMatch(implementation, /console\.log\([^\n]*code/i, `${name} must not log a verification code when delivery is unavailable`);
}

console.log("Supabase security contract passed: CORS is allowlist-only and email codes are never logged.");
