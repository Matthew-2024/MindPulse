create table if not exists public.resource_tenants (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  label text not null check (char_length(label) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.resource_admin_memberships (
  tenant_id text not null references public.resource_tenants(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role text not null check (role in ('resource-admin', 'resource-owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (tenant_id, account_id)
);

create table if not exists public.support_resources (
  id uuid not null default gen_random_uuid(),
  tenant_id text not null references public.resource_tenants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  kind text not null check (kind in ('hotline', 'campus', 'trusted-person', 'fallback')),
  label text not null check (char_length(label) between 1 and 160),
  description text not null check (char_length(description) between 1 and 1200),
  service_hours text not null check (char_length(service_hours) between 1 and 240),
  contact_target text not null check (char_length(contact_target) between 1 and 500),
  verification_status text not null check (verification_status in ('unverified', 'verified', 'stale', 'invalid')),
  verification_owner_role text not null check (char_length(verification_owner_role) between 1 and 80),
  verified_at timestamptz,
  expires_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, tenant_id),
  unique (tenant_id, slug)
);

create table if not exists public.resource_operations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  resource_id uuid not null,
  kind text not null check (kind in ('published', 'verified', 'invalidated', 'link-opened', 'copy-requested')),
  occurred_at timestamptz not null default now(),
  foreign key (resource_id, tenant_id) references public.support_resources(id, tenant_id) on delete restrict
);

create index if not exists resource_admin_memberships_active_idx
  on public.resource_admin_memberships (tenant_id, account_id)
  where active and revoked_at is null;
create index if not exists support_resources_tenant_status_idx
  on public.support_resources (tenant_id, verification_status, expires_at);
create index if not exists resource_operations_tenant_recent_idx
  on public.resource_operations (tenant_id, occurred_at desc, resource_id);

alter table public.resource_tenants enable row level security;
alter table public.resource_admin_memberships enable row level security;
alter table public.support_resources enable row level security;
alter table public.resource_operations enable row level security;

revoke all on table public.resource_tenants from anon, authenticated;
revoke all on table public.resource_admin_memberships from anon, authenticated;
revoke all on table public.support_resources from anon, authenticated;
revoke all on table public.resource_operations from anon, authenticated;

comment on table public.resource_operations is
  'Resource-only operational metadata. It intentionally contains no account, vault, record, note, risk, contact, or recipient field.';
