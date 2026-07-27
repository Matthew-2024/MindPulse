import { createClient } from "jsr:@supabase/supabase-js@2";

export type JsonRecord = Record<string, unknown>;

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const matches = (pattern: string) => {
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) return origin.startsWith(pattern.slice(0, -1));
    return pattern === origin;
  };
  const allowOrigin = allowed.length ? (allowed.some(matches) ? origin : allowed[0]) : (origin || "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: JsonRecord, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function readJson(req: Request): Promise<JsonRecord> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export function normalizeEmail(input: unknown): string {
  return String(input ?? "").trim().toLowerCase();
}

export function assertEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("邮箱格式不正确");
  }
}

export function assertCode(code: string) {
  if (!/^\d{6}$/.test(code)) {
    throw new Error("验证码应为 6 位数字");
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function emailHash(email: string): Promise<string> {
  const pepper = Deno.env.get("EMAIL_HASH_PEPPER") ?? "";
  return sha256Hex(`${pepper}:${email}`);
}

export async function codeHash(emailHashValue: string, code: string): Promise<string> {
  const secret = Deno.env.get("CODE_HASH_SECRET");
  if (!secret) throw new Error("CODE_HASH_SECRET 未配置");
  return hmacHex(secret, `${emailHashValue}:${code}`);
}

export function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function cookieValue(req: Request, name: string): string {
  const cookie = req.headers.get("Cookie") ?? "";
  const parts = cookie.split(";").map((item) => item.trim());
  const match = parts.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function sessionCookie(token: string, rememberMe: boolean): string {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const sameSite = Deno.env.get("COOKIE_SAMESITE") ?? "None";
  return `mp_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}

export async function requireSession(req: Request) {
  const token = cookieValue(req, "mp_session");
  if (!token) throw new Error("未登录或会话已过期");
  const tokenHash = await sha256Hex(token);
  const supabase = serviceClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, account_id, device_id, expires_at, revoked_at")
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!session || new Date(String(session.expires_at)).getTime() < Date.now()) {
    throw new Error("未登录或会话已过期");
  }
  await supabase.from("sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);
  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.device_id)
    .eq("account_id", session.account_id);
  return { supabase, session };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function assertVaultId(value: unknown): string {
  const vaultId = String(value ?? "").trim();
  if (!/^vault_[0-9a-f-]{36}$/i.test(vaultId)) {
    throw new Error("vault_id 格式不正确");
  }
  return vaultId;
}
