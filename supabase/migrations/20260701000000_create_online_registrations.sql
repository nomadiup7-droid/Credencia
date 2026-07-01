create table if not exists public.online_registration_configs (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  enabled boolean not null default false,
  slug text not null unique,
  public_title text not null default '',
  public_description text not null default '',
  public_date text not null default '',
  public_location text not null default '',
  banner_url text,
  max_registrations integer,
  status text not null default 'PAUSADA' check (status in ('ABERTA', 'PAUSADA', 'ENCERRADA')),
  approval_mode text not null default 'MANUAL' check (approval_mode in ('AUTOMATICA', 'MANUAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_online_registration_configs_event_id
  on public.online_registration_configs(event_id);

create table if not exists public.online_registrations (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  participant_id text references public.participants(id) on delete set null,
  name text not null,
  email text,
  phone text not null,
  company text,
  position text,
  cpf text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'APROVADA', 'REPROVADA', 'CANCELADA')),
  qr_token text unique,
  lgpd_accepted boolean not null default false,
  registered_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_online_registrations_event_id
  on public.online_registrations(event_id);

create index if not exists idx_online_registrations_status
  on public.online_registrations(status);

create unique index if not exists idx_online_registrations_event_email
  on public.online_registrations(event_id, lower(email))
  where email is not null and email <> '';

create unique index if not exists idx_online_registrations_event_phone
  on public.online_registrations(event_id, phone)
  where phone is not null and phone <> '';

create unique index if not exists idx_online_registrations_event_cpf
  on public.online_registrations(event_id, cpf)
  where cpf is not null and cpf <> '';
