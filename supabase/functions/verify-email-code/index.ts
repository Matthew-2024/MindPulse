import {
  assertCode,
  assertEmail,
  assertVaultId,
  codeHash,
  corsHeaders,
  emailHash,
  isUuid,
  json,
  normalizeEmail,
  randomToken,
  readJson,
  serviceClient,
  sessionCookie,
  sha256Hex,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const code = String(body.code ?? "").trim();
    const vaultId = assertVaultId(body.vaultId);
    const deviceId = String(body.deviceId ?? "").trim();
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
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "验证失败" }, 400);
  }
});
