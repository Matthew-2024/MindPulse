create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  email_encrypted text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists email_verifications_lookup_idx
  on public.email_verifications (email_hash, created_at desc)
  where consumed_at is null;

create table if not exists public.devices (
  id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_name text not null default 'unknown device',
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (id, account_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_id uuid not null,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists sessions_active_lookup_idx
  on public.sessions (session_token_hash)
  where revoked_at is null;

create table if not exists public.vaults (
  id text primary key,
  owner_account_id uuid not null references public.accounts(id) on delete cascade,
  sync_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.encrypted_items (
  id uuid primary key default gen_random_uuid(),
  vault_id text not null references public.vaults(id) on delete cascade,
  item_type text not null,
  ciphertext text not null,
  nonce text not null,
  salt text,
  algorithm text not null default 'AES-GCM/PBKDF2-SHA256',
  key_version integer not null default 2,
  kdf text not null default 'PBKDF2-SHA256',
  iterations integer not null default 120000,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (vault_id, item_type)
);

alter table public.encrypted_items
  add column if not exists key_version integer not null default 2;
alter table public.encrypted_items
  add column if not exists kdf text not null default 'PBKDF2-SHA256';
alter table public.encrypted_items
  add column if not exists iterations integer not null default 120000;

alter table public.accounts enable row level security;
alter table public.email_verifications enable row level security;
alter table public.devices enable row level security;
alter table public.sessions enable row level security;
alter table public.vaults enable row level security;
alter table public.encrypted_items enable row level security;

revoke all on table public.accounts from anon, authenticated;
revoke all on table public.email_verifications from anon, authenticated;
revoke all on table public.devices from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.vaults from anon, authenticated;
revoke all on table public.encrypted_items from anon, authenticated;

comment on table public.accounts is
  'Stores only account identity metadata. Psychological content must not be stored here.';
comment on table public.email_verifications is
  'Stores hashed 6-digit email verification codes with expiry, attempts, and consumed state.';
comment on table public.vaults is
  'Separates a local random vault_id from email account identity.';
comment on table public.encrypted_items is
  'Stores only client-side encrypted psychological data blobs.';
