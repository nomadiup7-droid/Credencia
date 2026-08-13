alter table if exists public.online_registrations
  add column if not exists confirmation_email_status text not null default 'NAO_ENVIADO',
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_last_attempt_at timestamptz,
  add column if not exists confirmation_email_error text,
  add column if not exists confirmation_email_id text,
  add column if not exists confirmation_email_attempts integer not null default 0;

do $$
begin
  if to_regclass('public.online_registrations') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'online_registrations_confirmation_email_status_check'
         and conrelid = 'public.online_registrations'::regclass
     ) then
    alter table public.online_registrations
      add constraint online_registrations_confirmation_email_status_check
      check (confirmation_email_status in ('NAO_ENVIADO', 'ENVIANDO', 'ENVIADO', 'FALHOU'));
  end if;
end
$$;

do $$
begin
  if to_regclass('public.online_registrations') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'online_registrations_confirmation_email_attempts_check'
         and conrelid = 'public.online_registrations'::regclass
     ) then
    alter table public.online_registrations
      add constraint online_registrations_confirmation_email_attempts_check
      check (confirmation_email_attempts >= 0);
  end if;
end
$$;
