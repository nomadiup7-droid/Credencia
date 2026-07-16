create extension if not exists pgcrypto with schema extensions;

alter table if exists public.participants
  add column if not exists qr_token text,
  add column if not exists qr_token_status text not null default 'ATIVO',
  add column if not exists qr_token_version integer not null default 1,
  add column if not exists qr_token_created_at timestamptz,
  add column if not exists qr_token_regenerated_at timestamptz,
  add column if not exists qr_token_revoked_at timestamptz,
  add column if not exists credential_status text not null default 'ATIVA',
  add column if not exists credential_first_viewed_at timestamptz,
  add column if not exists credential_last_viewed_at timestamptz,
  add column if not exists credential_view_count integer not null default 0,
  add column if not exists credential_last_view_session_id text,
  add column if not exists external_id text,
  add column if not exists phone text,
  add column if not exists position text,
  add column if not exists notes text,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

update public.participants
set
  qr_token = coalesce(qr_token, 'qr_' || translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_')),
  qr_token_status = coalesce(qr_token_status, 'ATIVO'),
  credential_status = coalesce(credential_status, 'ATIVA'),
  credential_view_count = coalesce(credential_view_count, 0),
  qr_token_version = coalesce(qr_token_version, 1),
  qr_token_created_at = coalesce(qr_token_created_at, now()),
  custom_fields = coalesce(custom_fields, '{}'::jsonb)
where qr_token is null;

create unique index if not exists participants_qr_token_uidx
  on public.participants (qr_token)
  where qr_token is not null;

create unique index if not exists participants_event_external_id_uidx
  on public.participants (event_id, external_id)
  where external_id is not null and btrim(external_id) <> '';

alter table if exists public.action_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'participants_credential_status_check'
  ) then
    alter table public.participants
      add constraint participants_credential_status_check
      check (credential_status in ('ATIVA', 'BLOQUEADA', 'CANCELADA'));
  end if;
end $$;
