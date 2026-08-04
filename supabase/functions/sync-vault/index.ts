import {
  assertVaultId,
  corsHeaders,
  json,
  readJson,
  requireSession,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await readJson(req);
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
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "同步失败" }, 400);
  }
});
