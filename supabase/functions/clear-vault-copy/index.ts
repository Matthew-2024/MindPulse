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
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "清除失败" }, 400);
  }
});
