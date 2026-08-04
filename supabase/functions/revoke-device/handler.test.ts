import { handleRevokeDeviceRequest } from "./handler.ts";

const accountId = "33333333-3333-4333-8333-333333333333";
const currentDeviceId = "11111111-1111-4111-8111-111111111111";
const targetDeviceId = "22222222-2222-4222-8222-222222222222";
const sessionId = "44444444-4444-4444-8444-444444444444";

type RecordedCall = { path: string; method: string; query: URLSearchParams; body: Record<string, unknown> | null };

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

async function withFakeSupabase(
  options: { targetExists?: boolean },
  run: (calls: RecordedCall[]) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const calls: RecordedCall[] = [];
  Deno.env.set("SUPABASE_URL", "https://supabase.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  Deno.env.set("ALLOWED_ORIGINS", "https://app.example.test");
  Deno.env.set("COOKIE_SAMESITE", "Strict");

  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === "PATCH" ? await request.clone().json() as Record<string, unknown> : null;
    calls.push({ path: url.pathname, method: request.method, query: url.searchParams, body });

    if (request.method === "GET" && url.pathname.endsWith("/sessions")) {
      return json([{ id: sessionId, account_id: accountId, device_id: currentDeviceId, expires_at: "2099-01-01T00:00:00.000Z", revoked_at: null }]);
    }
    if (request.method === "GET" && url.pathname.endsWith("/devices")) {
      return json([{ revoked_at: null }]);
    }
    if (request.method === "PATCH" && url.pathname.endsWith("/devices") && body && "revoked_at" in body) {
      return json(options.targetExists === false ? [] : [{ id: String(url.searchParams.get("id") ?? "").replace("eq.", "") }]);
    }
    return json([]);
  };

  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function request(deviceId: string, extra: Record<string, unknown> = {}): Request {
  return new Request("https://edge.example.test/functions/v1/revoke-device", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "mp_session=presented-token", Origin: "https://app.example.test" },
    body: JSON.stringify({ deviceId, ...extra }),
  });
}

Deno.test("revoke-device revokes only the authenticated account's target-device sessions", async () => {
  await withFakeSupabase({}, async (calls) => {
    const response = await handleRevokeDeviceRequest(request(targetDeviceId));
    expect(response.status === 200, "expected a successful device revocation");
    const deviceRevoke = calls.find((call) => call.method === "PATCH" && call.path.endsWith("/devices") && call.query.get("id") === `eq.${targetDeviceId}`);
    const sessionsRevoke = calls.find((call) => call.method === "PATCH" && call.path.endsWith("/sessions") && call.query.get("device_id") === `eq.${targetDeviceId}`);
    expect(deviceRevoke?.query.get("account_id") === `eq.${accountId}`, "target device update must be scoped to the authenticated account");
    expect(deviceRevoke?.query.get("revoked_at") === "is.null", "target device update must not overwrite a prior revocation");
    expect(sessionsRevoke?.query.get("account_id") === `eq.${accountId}`, "target sessions update must be scoped to the authenticated account");
    expect(sessionsRevoke?.query.get("revoked_at") === "is.null", "target sessions update must only revoke active sessions");
    expect(response.headers.get("Set-Cookie") === null, "revoking another device must not clear the caller cookie");
  });
});

Deno.test("revoke-device clears the caller cookie on self-revocation", async () => {
  await withFakeSupabase({}, async () => {
    const response = await handleRevokeDeviceRequest(request(currentDeviceId));
    expect(response.status === 200, "expected self-revocation to succeed");
    expect(response.headers.get("Set-Cookie")?.includes("Max-Age=0"), "self-revocation must expire the caller cookie");
    expect(response.headers.get("Set-Cookie")?.includes("SameSite=Strict"), "self-revocation must use configured SameSite policy");
  });
});

Deno.test("revoke-device rejects an unowned target before revoking sessions", async () => {
  await withFakeSupabase({ targetExists: false }, async (calls) => {
    const response = await handleRevokeDeviceRequest(request(targetDeviceId));
    expect(response.status === 400, "unowned target must not be treated as revoked");
    const body = await response.json() as { error?: string };
    expect(body.error === "DEVICE_NOT_FOUND_OR_ALREADY_REVOKED", "unowned target must have a non-enumerating error");
    expect(!calls.some((call) => call.method === "PATCH" && call.path.endsWith("/sessions") && call.query.get("device_id") === `eq.${targetDeviceId}`), "target sessions must remain untouched when target ownership is absent");
  });
});

Deno.test("revoke-device rejects unknown request fields before reaching Supabase", async () => {
  await withFakeSupabase({}, async (calls) => {
    const response = await handleRevokeDeviceRequest(request(targetDeviceId, { note: "private text" }));
    expect(response.status === 400, "unknown request fields must be rejected");
    expect(calls.length === 0, "invalid requests must not reach Supabase");
  });
});
