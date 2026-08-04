import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function requireSessionBody(value, name) {
  const match = value.match(/async function requireSession\(req: Request\) \{([\s\S]*?)\n\}/);
  assert(match, `${name} must define requireSession`);
  return match[1];
}

const sharedBody = requireSessionBody(source("../supabase/functions/_shared/utils.ts"), "shared utilities");
const combinedBody = requireSessionBody(source("../supabase/functions/mindpulse-api/index.ts"), "combined API");
const revokeDeviceBody = source("../supabase/functions/revoke-device/handler.ts");
const config = source("../supabase/config.toml");

for (const [name, body] of [["shared utilities", sharedBody], ["combined API", combinedBody]]) {
  assert.match(body, /from\("sessions"\)/, `${name} must validate the presented session`);
  assert.match(body, /from\("devices"\)\s*\.select\("revoked_at"\)/, `${name} must read the associated device revocation state`);
  assert.match(body, /\.eq\("id", session\.device_id\)/, `${name} must bind the device check to the session device`);
  assert.match(body, /\.eq\("account_id", session\.account_id\)/, `${name} must bind the device check to the session account`);
  assert.match(body, /\.is\("revoked_at", null\)/, `${name} must reject a revoked device`);
}

assert.match(revokeDeviceBody, /requireSession\(req\)/, "revoke-device must require the presenting session");
assert.match(revokeDeviceBody, /const allowedFields = new Set\(\["deviceId", "device_id"\]\)/, "revoke-device must reject unrecognized request fields");
assert.match(revokeDeviceBody, /if \(!isUuid\(deviceId\)\)/, "revoke-device must validate the target device UUID");
assert.match(revokeDeviceBody, /from\("devices"\)\s*\.update\(\{ revoked_at: revokedAt \}\)\s*\.eq\("id", targetDeviceId\)\s*\.eq\("account_id", session\.account_id\)\s*\.is\("revoked_at", null\)/, "revoke-device must revoke only the target device belonging to the current account");
assert.match(revokeDeviceBody, /from\("sessions"\)\s*\.update\(\{ revoked_at: revokedAt \}\)\s*\.eq\("device_id", targetDeviceId\)\s*\.eq\("account_id", session\.account_id\)\s*\.is\("revoked_at", null\)/, "revoke-device must revoke all active sessions for that account/device pair");
assert.match(revokeDeviceBody, /targetDeviceId === session\.device_id[\s\S]*"Set-Cookie": expiredSessionCookie\(\)/, "revoke-device must clear the current browser cookie after self-revocation");
assert.match(config, /\[functions\.revoke-device\]\s*verify_jwt = false/, "revoke-device must reach its cookie-session authorization handler");

console.log("Supabase device revocation contract passed: protected sessions require active devices, and account-scoped revocation invalidates device sessions.");
