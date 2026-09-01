-- Consolidate operator authentication without replacing the current JWT flow.
-- Safe incremental migration: no data deletion, no reset, no destructive rebuild.

alter table public.users
  alter column email drop not null,
  add column if not exists username text,
  add column if not exists recovery_email text,
  add column if not exists login_type text not null default 'email';

alter table public.users
  drop constraint if exists users_login_type_check;

alter table public.users
  add constraint users_login_type_check
  check (login_type in ('email', 'username')) not valid;

alter table public.users
  validate constraint users_login_type_check;

create unique index if not exists users_username_lower_unique_idx
  on public.users (lower(username))
  where username is not null and username <> '';

create unique index if not exists users_email_lower_unique_idx
  on public.users (lower(email))
  where email is not null and email <> '';

create table if not exists public.password_reset_tokens (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

drop policy if exists "password reset tokens service role only" on public.password_reset_tokens;
create policy "password reset tokens service role only"
  on public.password_reset_tokens
  for all
  using (false)
  with check (false);

comment on table public.password_reset_tokens is 'Stores SHA-256 hashes of single-use password reset tokens. Raw tokens are never persisted.';
