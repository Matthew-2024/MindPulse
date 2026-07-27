import { createClient } from "jsr:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

function corsHeaders(req: Request): HeadersInit {
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

function json(req: Request, body: JsonRecord, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJson(req: Request): Promise<JsonRecord> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

function normalizeEmail(input: unknown): string {
  return String(input ?? "").trim().toLowerCase();
}

function assertEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("邮箱格式不正确");
  }
}

function assertCode(code: string) {
  if (!/^\d{6}$/.test(code)) {
    throw new Error("验证码应为 6 位数字");
  }
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, value: string): Promise<string> {
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

async function emailHash(email: string): Promise<string> {
  const pepper = Deno.env.get("EMAIL_HASH_PEPPER") ?? "";
  return sha256Hex(`${pepper}:${email}`);
}

async function codeHash(emailHashValue: string, code: string): Promise<string> {
  const secret = Deno.env.get("CODE_HASH_SECRET");
  if (!secret) throw new Error("CODE_HASH_SECRET 未配置");
  return hmacHex(secret, `${emailHashValue}:${code}`);
}

function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function cookieValue(req: Request, name: string): string {
  const cookie = req.headers.get("Cookie") ?? "";
  const parts = cookie.split(";").map((item) => item.trim());
  const match = parts.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function sessionCookie(token: string, rememberMe: boolean): string {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const sameSite = Deno.env.get("COOKIE_SAMESITE") ?? "None";
  const secure = Deno.env.get("COOKIE_SECURE") === "false" ? "" : " Secure;";
  return `mp_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly;${secure} SameSite=${sameSite}`;
}

async function requireSession(req: Request) {
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function assertVaultId(value: unknown): string {
  const vaultId = String(value ?? "").trim();
  if (!/^vault_[0-9a-f-]{36}$/i.test(vaultId)) {
    throw new Error("vault_id 格式不正确");
  }
  return vaultId;
}

function actionFromUrl(req: Request): string {
  const path = new URL(req.url).pathname.split("/").filter(Boolean);
  const index = path.indexOf("mindpulse-api");
  return index >= 0 ? (path[index + 1] ?? "") : (path.at(-1) ?? "");
}

async function requestEmailCode(req: Request, body: JsonRecord) {
  const email = normalizeEmail(body.email);
  assertEmail(email);

  const supabase = serviceClient();
  const hashedEmail = await emailHash(email);
  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60_000).toISOString();
  const oneHourAgo = new Date(now - 60 * 60_000).toISOString();

  const { count: recentCount, error: recentError } = await supabase
    .from("email_verifications")
    .select("id", { count: "exact", head: true })
    .eq("email_hash", hashedEmail)
    .gte("created_at", oneMinuteAgo);
  if (recentError) throw recentError;
  if ((recentCount ?? 0) > 0) {
    return json(req, { error: "发送太频繁，请稍后再试" }, 429);
  }

  const { count: hourlyCount, error: hourlyError } = await supabase
    .from("email_verifications")
    .select("id", { count: "exact", head: true })
    .eq("email_hash", hashedEmail)
    .gte("created_at", oneHourAgo);
  if (hourlyError) throw hourlyError;
  if ((hourlyCount ?? 0) >= 5) {
    return json(req, { error: "验证码请求次数过多，请一小时后再试" }, 429);
  }

  const code = randomCode();
  const hashedCode = await codeHash(hashedEmail, code);
  const expiresAt = new Date(now + 10 * 60_000).toISOString();
  const { error: insertError } = await supabase.from("email_verifications").insert({
    email_hash: hashedEmail,
    code_hash: hashedCode,
    expires_at: expiresAt,
  });
  if (insertError) throw insertError;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("MAIL_FROM") ?? "MindPulse <onboarding@resend.dev>";
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "心晴 MindPulse 邮箱验证码",
        text: `你的心晴 MindPulse 验证码是：${code}。验证码 10 分钟内有效。请勿转发给他人。`,
      }),
    });
    if (!response.ok) {
      return json(req, { error: "邮件发送失败，请稍后重试" }, 502);
    }
  } else if (Deno.env.get("DEV_RETURN_CODE") === "true") {
    return json(req, { ok: true, code, expiresInSeconds: 600, resendAfterSeconds: 60 });
  } else {
    console.log(`MindPulse dev email code for ${hashedEmail}: ${code}`);
  }

  return json(req, { ok: true, expiresInSeconds: 600, resendAfterSeconds: 60 });
}

async function verifyEmailCode(req: Request, body: JsonRecord) {
  const email = normalizeEmail(body.email);
  const code = String(body.code ?? "").trim();
  const vaultId = assertVaultId(body.vaultId);
  const deviceId = String(body.deviceId ?? body.device_id ?? "").trim();
  const deviceName = String(body.deviceName ?? "当前浏览器").slice(0, 80);
  const rememberMe = body.rememberMe !== false;
  assertEmail(email);
  assertCode(code);
  if (!isUuid(deviceId)) throw new Error("device_id 格式不正确");

  const supabase = serviceClient();
  const hashedEmail = await emailHash(email);
  const expectedCodeHash = await codeHash(hashedEmail, code);

  const { data: verification, error: findError } = await supabase
    .from("email_verifications")
    .select("id, code_hash, attempts, expires_at")
    .eq("email_hash", hashedEmail)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (!verification) throw new Error("验证码不存在或已过期");
  if (Number(verification.attempts) >= 5) throw new Error("验证码尝试次数过多，请重新发送");

  if (verification.code_hash !== expectedCodeHash) {
    await supabase
      .from("email_verifications")
      .update({ attempts: Number(verification.attempts) + 1 })
      .eq("id", verification.id);
    throw new Error("验证码不正确");
  }

  let accountId = "";
  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("id")
    .eq("email_hash", hashedEmail)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    accountId = String(existing.id);
    const { error } = await supabase
      .from("accounts")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", accountId);
    if (error) throw error;
  } else {
    const { data: inserted, error } = await supabase
      .from("accounts")
      .insert({ email_hash: hashedEmail, email_verified_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    accountId = String(inserted.id);
  }

  await supabase
    .from("email_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", verification.id);

  const { error: deviceError } = await supabase.from("devices").upsert({
    id: deviceId,
    account_id: accountId,
    device_name: deviceName,
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
  }, { onConflict: "id,account_id" });
  if (deviceError) throw deviceError;

  const { data: existingVault, error: existingVaultError } = await supabase
    .from("vaults")
    .select("id, owner_account_id")
    .eq("id", vaultId)
    .maybeSingle();
  if (existingVaultError) throw existingVaultError;
  if (existingVault && existingVault.owner_account_id !== accountId) {
    throw new Error("该 vault 已绑定其他账号");
  }
  if (!existingVault) {
    const { error: vaultError } = await supabase.from("vaults").insert({
      id: vaultId,
      owner_account_id: accountId,
    });
    if (vaultError) throw vaultError;
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60_000 : 8 * 60 * 60_000)).toISOString();
  const { error: sessionError } = await supabase.from("sessions").insert({
    account_id: accountId,
    device_id: deviceId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (sessionError) throw sessionError;

  return json(req, { ok: true, accountId, vaultId }, 200, {
    "Set-Cookie": sessionCookie(token, rememberMe),
  });
}

async function syncVault(req: Request, body: JsonRecord) {
  const vaultId = assertVaultId(body.vaultId);
  const itemType = String(body.itemType ?? "vault_snapshot").slice(0, 60);
  const ciphertext = String(body.ciphertext ?? "");
  const nonce = String(body.nonce ?? "");
  const salt = String(body.salt ?? "");
  const algorithm = String(body.algorithm ?? "AES-GCM/PBKDF2-SHA256").slice(0, 80);
  const keyVersion = Number(body.keyVersion ?? 2);
  const kdf = String(body.kdf ?? "PBKDF2-SHA256").slice(0, 80);
  const iterations = Number(body.iterations ?? 120000);
  if (!ciphertext || !nonce) throw new Error("只允许上传加密后的 ciphertext 和 nonce");
  if (!Number.isInteger(keyVersion) || keyVersion < 1 || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) {
    throw new Error("加密参数不符合要求");
  }
  if ("records" in body || "note" in body || "plaintext" in body) {
    throw new Error("请求中不能包含明文心理文本");
  }

  const { supabase, session } = await requireSession(req);
  const { data: vault, error: vaultError } = await supabase
    .from("vaults")
    .select("id, owner_account_id")
    .eq("id", vaultId)
    .maybeSingle();
  if (vaultError) throw vaultError;
  if (!vault || vault.owner_account_id !== session.account_id) {
    throw new Error("没有权限同步该 vault");
  }

  const now = new Date().toISOString();
  const { error: itemError } = await supabase.from("encrypted_items").upsert({
    vault_id: vaultId,
    item_type: itemType,
    ciphertext,
    nonce,
    salt,
    algorithm,
    key_version: keyVersion,
    kdf,
    iterations,
    updated_at: now,
    deleted_at: null,
  }, { onConflict: "vault_id,item_type" });
  if (itemError) throw itemError;

  const { error: syncError } = await supabase
    .from("vaults")
    .update({ sync_enabled: true })
    .eq("id", vaultId);
  if (syncError) throw syncError;

  return json(req, { ok: true, updatedAt: now });
}

async function getVaultCopy(req: Request, body: JsonRecord) {
  const vaultId = assertVaultId(body.vaultId);
  const { supabase, session } = await requireSession(req);
  const { data: vault, error: vaultError } = await supabase
    .from("vaults")
    .select("id, owner_account_id")
    .eq("id", vaultId)
    .maybeSingle();
  if (vaultError) throw vaultError;
  if (!vault || vault.owner_account_id !== session.account_id) {
    throw new Error("没有权限读取该 vault");
  }

  const { data: item, error: itemError } = await supabase
    .from("encrypted_items")
    .select("item_type, ciphertext, nonce, salt, algorithm, key_version, kdf, iterations, updated_at")
    .eq("vault_id", vaultId)
    .eq("item_type", "vault_snapshot")
    .is("deleted_at", null)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item || !item.ciphertext || !item.nonce) {
    throw new Error("当前 vault 没有可恢复的加密副本");
  }

  return json(req, {
    ok: true,
    itemType: item.item_type,
    ciphertext: item.ciphertext,
    nonce: item.nonce,
    salt: item.salt,
    algorithm: item.algorithm,
    keyVersion: item.key_version,
    kdf: item.kdf,
    iterations: item.iterations,
    updatedAt: item.updated_at,
  });
}

async function clearVaultCopy(req: Request, body: JsonRecord) {
  const vaultId = assertVaultId(body.vaultId);
  const { supabase, session } = await requireSession(req);

  const { data: vault, error: vaultError } = await supabase
    .from("vaults")
    .select("id, owner_account_id")
    .eq("id", vaultId)
    .maybeSingle();
  if (vaultError) throw vaultError;
  if (!vault || vault.owner_account_id !== session.account_id) {
    throw new Error("没有权限清除该 vault");
  }

  const now = new Date().toISOString();
  const { error: itemError } = await supabase
    .from("encrypted_items")
    .update({ deleted_at: now, ciphertext: "", nonce: "" })
    .eq("vault_id", vaultId);
  if (itemError) throw itemError;

  const { error: syncError } = await supabase
    .from("vaults")
    .update({ sync_enabled: false })
    .eq("id", vaultId);
  if (syncError) throw syncError;

  return json(req, { ok: true, clearedAt: now });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const action = actionFromUrl(req);
    const body = await readJson(req);
    if (action === "request-email-code") return await requestEmailCode(req, body);
    if (action === "verify-email-code") return await verifyEmailCode(req, body);
    if (action === "sync-vault") return await syncVault(req, body);
    if (action === "get-vault-copy") return await getVaultCopy(req, body);
    if (action === "clear-vault-copy") return await clearVaultCopy(req, body);
    return json(req, { error: "未知接口" }, 404);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "请求失败" }, 400);
  }
});
