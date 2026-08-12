alter table public.users
  add column if not exists must_change_credentials boolean not null default false;

create unique index if not exists users_pin_unique_idx
  on public.users (pin)
  where pin is not null and pin <> '';
