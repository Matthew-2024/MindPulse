import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../supabase/migrations/20260804_resource_operations_tenant_boundary.sql");
const functionSource = source("../supabase/functions/resource-admin/index.ts");
const config = source("../supabase/config.toml");
const operationsTable = migration.match(/create table if not exists public\.resource_operations \([\s\S]*?\n\);/);

assert(operationsTable, "resource operations table migration must exist");
assert.match(migration, /create table if not exists public\.resource_admin_memberships/, "server roles must be explicit tenant memberships");
assert.match(migration, /foreign key \(resource_id, tenant_id\) references public\.support_resources\(id, tenant_id\)/, "each operation must belong to a resource in the same tenant");
assert.match(migration, /alter table public\.resource_tenants enable row level security;/, "tenant table must enable RLS");
assert.match(migration, /alter table public\.resource_admin_memberships enable row level security;/, "membership table must enable RLS");
assert.match(migration, /alter table public\.support_resources enable row level security;/, "resource table must enable RLS");
assert.match(migration, /alter table public\.resource_operations enable row level security;/, "operations table must enable RLS");
assert.match(migration, /revoke all on table public\.resource_operations from anon, authenticated;/, "operations table must not be directly accessible to clients");
assert.doesNotMatch(operationsTable[0], /account_id|vault_id|record_id|note|risk|email|phone/i, "operations schema must remain resource-only metadata");

assert.match(functionSource, /await requireSession\(req\)/, "resource administration must require a valid session");
assert.match(config, /\[functions\.resource-admin\]\s*verify_jwt = false/, "resource administration must reach its cookie-session authorization handler");
assert.match(functionSource, /from\("resource_admin_memberships"\)/, "resource administration must check tenant membership");
assert.match(functionSource, /\.eq\("tenant_id", tenantId\)/, "membership lookup must scope to the requested tenant");
assert.match(functionSource, /\.eq\("account_id", session\.account_id\)/, "membership lookup must scope to the authenticated account");
assert.match(functionSource, /RESOURCE_HEALTH_MINIMUM_SAMPLE = 5/, "health aggregation must preserve the five-action threshold");
assert.match(functionSource, /select\("resource_id, kind"\)/, "health aggregation must read resource-only metadata");
assert.doesNotMatch(functionSource, /from\("vaults"\)|from\("encrypted_items"\)|from\("accounts"\)/, "resource administration must not query student vault or account content");

console.log("Resource operations server contract passed: tenant roles, RLS, metadata-only operations, and sample suppression are enforced in source.");
