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
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "读取失败" }, 400);
  }
});
