alter table if exists online_registration_configs
  add column if not exists fields jsonb not null default '[]'::jsonb;

alter table if exists online_registrations
  add column if not exists category text,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;
