import {
  corsHeaders,
  isUuid,
  json,
  readJson,
  requireSession,
  type JsonRecord,
} from "../_shared/utils.ts";

const RESOURCE_HEALTH_MINIMUM_SAMPLE = 5;
const RESOURCE_OPERATION_RETENTION_DAYS = 90;
const operationKinds = new Set(["published", "verified", "invalidated", "link-opened", "copy-requested"]);
const resourceKinds = new Set(["hotline", "campus", "trusted-person", "fallback"]);
const actions = new Set(["list-resources", "publish-resource", "verify-resource", "invalidate-resource", "resource-health"]);
const allowedFields = new Set([
  "action", "tenantId", "resourceId", "slug", "kind", "label", "description", "serviceHours", "contactTarget", "verificationOwnerRole", "invalidationReason"
]);

function text(value: unknown, field: string, max: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > max) throw new Error(`RESOURCE_${field.toUpperCase()}_INVALID`);
  return normalized;
}

function assertTenantId(value: unknown) {
  const tenantId = text(value, "tenant_id", 64);
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(tenantId)) throw new Error("RESOURCE_TENANT_INVALID");
  return tenantId;
}

function assertResourceId(value: unknown) {
  const resourceId = text(value, "id", 36);
  if (!isUuid(resourceId)) throw new Error("RESOURCE_ID_INVALID");
  return resourceId;
}

function assertBody(value: JsonRecord) {
  if (Object.keys(value).some((key) => !allowedFields.has(key))) throw new Error("RESOURCE_REQUEST_FIELDS_INVALID");
  const action = text(value.action, "action", 40);
  if (!actions.has(action)) throw new Error("RESOURCE_ACTION_INVALID");
  return { action, tenantId: assertTenantId(value.tenantId) };
}

function resourceInput(body: JsonRecord) {
  const slug = text(body.slug, "slug", 64);
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) throw new Error("RESOURCE_SLUG_INVALID");
  const kind = text(body.kind, "kind", 30);
  if (!resourceKinds.has(kind)) throw new Error("RESOURCE_KIND_INVALID");
  return {
    id: assertResourceId(body.resourceId),
    slug,
    kind,
    label: text(body.label, "label", 160),
    description: text(body.description, "description", 1200),
    service_hours: text(body.serviceHours, "service_hours", 240),
    contact_target: text(body.contactTarget, "contact_target", 500),
    verification_owner_role: text(body.verificationOwnerRole, "verification_owner_role", 80),
  };
}

async function requireResourceAdmin(req: Request, tenantId: string) {
  const { supabase, session } = await requireSession(req);
  const { data: membership, error } = await supabase
    .from("resource_admin_memberships")
    .select("role, active, revoked_at")
    .eq("tenant_id", tenantId)
    .eq("account_id", session.account_id)
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!membership || !["resource-admin", "resource-owner"].includes(String(membership.role))) {
    throw new Error("RESOURCE_ADMIN_REQUIRED");
  }
  return supabase;
}

async function appendOperation(
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"],
  tenantId: string,
  resourceId: string,
  kind: string,
) {
  if (!operationKinds.has(kind)) throw new Error("RESOURCE_OPERATION_INVALID");
  const { error } = await supabase.from("resource_operations").insert({
    tenant_id: tenantId,
    resource_id: resourceId,
    kind,
  });
  if (error) throw error;
}

async function listResources(req: Request, body: JsonRecord) {
  const { tenantId } = assertBody(body);
  const supabase = await requireResourceAdmin(req, tenantId);
  const { data, error } = await supabase
    .from("support_resources")
    .select("id, slug, kind, label, description, service_hours, contact_target, verification_status, verification_owner_role, verified_at, expires_at, invalidated_at, invalidation_reason, updated_at")
    .eq("tenant_id", tenantId)
    .order("label");
  if (error) throw error;
  return json(req, { tenantId, resources: data ?? [] });
}

async function publishResource(req: Request, body: JsonRecord) {
  const { tenantId } = assertBody(body);
  const supabase = await requireResourceAdmin(req, tenantId);
  const resource = resourceInput(body);
  const now = new Date().toISOString();
  const { error } = await supabase.from("support_resources").upsert({
    ...resource,
    tenant_id: tenantId,
    verification_status: "unverified",
    verified_at: null,
    expires_at: null,
    invalidated_at: null,
    invalidation_reason: null,
    updated_at: now,
  }, { onConflict: "id,tenant_id" });
  if (error) throw error;
  await appendOperation(supabase, tenantId, resource.id, "published");
  return json(req, { ok: true, tenantId, resourceId: resource.id, status: "unverified", updatedAt: now });
}

async function verifyResource(req: Request, body: JsonRecord) {
  const { tenantId } = assertBody(body);
  const resourceId = assertResourceId(body.resourceId);
  const supabase = await requireResourceAdmin(req, tenantId);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RESOURCE_OPERATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("support_resources")
    .update({ verification_status: "verified", verified_at: now, expires_at: expiresAt, invalidated_at: null, invalidation_reason: null, updated_at: now })
    .eq("tenant_id", tenantId)
    .eq("id", resourceId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("RESOURCE_NOT_FOUND");
  await appendOperation(supabase, tenantId, resourceId, "verified");
  return json(req, { ok: true, tenantId, resourceId, status: "verified", expiresAt, updatedAt: now });
}

async function invalidateResource(req: Request, body: JsonRecord) {
  const { tenantId } = assertBody(body);
  const resourceId = assertResourceId(body.resourceId);
  const reason = text(body.invalidationReason, "invalidation_reason", 500);
  const supabase = await requireResourceAdmin(req, tenantId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("support_resources")
    .update({ verification_status: "invalid", invalidated_at: now, invalidation_reason: reason, updated_at: now })
    .eq("tenant_id", tenantId)
    .eq("id", resourceId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("RESOURCE_NOT_FOUND");
  await appendOperation(supabase, tenantId, resourceId, "invalidated");
  return json(req, { ok: true, tenantId, resourceId, status: "invalid", updatedAt: now });
}

async function resourceHealth(req: Request, body: JsonRecord) {
  const { tenantId } = assertBody(body);
  const supabase = await requireResourceAdmin(req, tenantId);
  const cutoff = new Date(Date.now() - RESOURCE_OPERATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("resource_operations")
    .select("resource_id, kind")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", cutoff);
  if (error) throw error;
  const groups = new Map<string, string[]>();
  for (const event of data ?? []) groups.set(String(event.resource_id), [...(groups.get(String(event.resource_id)) ?? []), String(event.kind)]);
  const resources = [...groups.entries()].map(([resourceId, kinds]) => {
    const sampleCount = kinds.filter((kind) => kind === "link-opened" || kind === "copy-requested").length;
    const counts = Object.fromEntries([...operationKinds].map((kind) => [kind, kinds.filter((candidate) => candidate === kind).length]));
    return { resourceId, sampleCount, meetsMinimumSample: sampleCount >= RESOURCE_HEALTH_MINIMUM_SAMPLE, counts: sampleCount >= RESOURCE_HEALTH_MINIMUM_SAMPLE ? counts : null };
  }).sort((left, right) => left.resourceId.localeCompare(right.resourceId));
  return json(req, { tenantId, retentionDays: RESOURCE_OPERATION_RETENTION_DAYS, resources });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  try {
    const body = await readJson(req);
    const action = String(body.action ?? "");
    if (action === "list-resources") return await listResources(req, body);
    if (action === "publish-resource") return await publishResource(req, body);
    if (action === "verify-resource") return await verifyResource(req, body);
    if (action === "invalidate-resource") return await invalidateResource(req, body);
    if (action === "resource-health") return await resourceHealth(req, body);
    throw new Error("RESOURCE_ACTION_INVALID");
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Resource administration failed" }, 400);
  }
});
