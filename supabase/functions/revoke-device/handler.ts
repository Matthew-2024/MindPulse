import {
  corsHeaders,
  isUuid,
  json,
  readJson,
  requireSession,
  type JsonRecord,
} from "../_shared/utils.ts";

const allowedFields = new Set(["deviceId", "device_id"]);

function assertTargetDeviceId(body: JsonRecord): string {
  if (Object.keys(body).some((key) => !allowedFields.has(key))) {
    throw new Error("DEVICE_REVOKE_REQUEST_FIELDS_INVALID");
  }
  const deviceId = String(body.deviceId ?? body.device_id ?? "").trim();
  if (!isUuid(deviceId)) throw new Error("DEVICE_ID_INVALID");
  return deviceId;
}

function expiredSessionCookie(): string {
  const sameSite = Deno.env.get("COOKIE_SAMESITE") ?? "None";
  return `mp_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=${sameSite}`;
}

async function revokeDevice(req: Request, body: JsonRecord): Promise<Response> {
  const targetDeviceId = assertTargetDeviceId(body);
  const { supabase, session } = await requireSession(req);
  const revokedAt = new Date().toISOString();

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .update({ revoked_at: revokedAt })
    .eq("id", targetDeviceId)
    .eq("account_id", session.account_id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (deviceError) throw deviceError;
  if (!device) throw new Error("DEVICE_NOT_FOUND_OR_ALREADY_REVOKED");

  const { error: sessionsError } = await supabase
    .from("sessions")
    .update({ revoked_at: revokedAt })
    .eq("device_id", targetDeviceId)
    .eq("account_id", session.account_id)
    .is("revoked_at", null);
  if (sessionsError) throw sessionsError;

  const headers: HeadersInit = targetDeviceId === session.device_id
    ? { "Set-Cookie": expiredSessionCookie() }
    : {};
  return json(req, { ok: true, deviceId: targetDeviceId, revokedAt }, 200, headers);
}

export async function handleRevokeDeviceRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  try {
    return await revokeDevice(req, await readJson(req));
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Device revocation failed" }, 400);
  }
}
