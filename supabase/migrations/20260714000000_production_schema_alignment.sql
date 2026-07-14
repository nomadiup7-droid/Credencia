-- Production schema alignment for Credencia / Supabase
-- Idempotent corrective migration. Does not drop tables and does not seed demo users.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null default 'CHECKIN',
  password_hash text not null,
  pin text,
  organization_id text references public.organizations(id) on delete restrict,
  permissions text[],
  created_at timestamptz not null default now()
);

alter table if exists public.users drop constraint if exists users_role_check;
alter table if exists public.users add constraint users_role_check
  check (role in ('ADMIN','OPERADOR','VISUALIZADOR','CHECKIN','CHECKIN_CADASTRO','SUPERVISOR','ATENDENTE','admin','operator')) not valid;
alter table if exists public.users validate constraint users_role_check;

create table if not exists public.events (
  id text primary key,
  name text not null,
  date text not null,
  location text not null,
  capacity integer not null default 500,
  created_at timestamptz not null default now()
);

alter table if exists public.events add column if not exists organization_id text references public.organizations(id) on delete restrict;
alter table if exists public.events add column if not exists event_mode text not null default 'PREPARACAO';
alter table if exists public.events add column if not exists description text;
alter table if exists public.events add column if not exists credential_type text default 'badge';
alter table if exists public.events add column if not exists credential_size text default 'A6';
alter table if exists public.events add column if not exists show_qr_code boolean default true;
alter table if exists public.events add column if not exists enable_access_control boolean default true;
alter table if exists public.events add column if not exists enable_cloakroom boolean default false;
alter table if exists public.events add column if not exists enable_scanner boolean default true;
alter table if exists public.events add column if not exists layout_config jsonb;
alter table if exists public.events add column if not exists checkin_screen_config jsonb;
alter table if exists public.events add column if not exists cloakroom_label_config jsonb;
alter table if exists public.events drop constraint if exists events_event_mode_check;
alter table if exists public.events add constraint events_event_mode_check
  check (event_mode in ('PREPARACAO','TESTE','OFICIAL','ENCERRADO')) not valid;
alter table if exists public.events validate constraint events_event_mode_check;

create table if not exists public.participants (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  cpf text not null,
  category text not null,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  ticket_code text not null,
  company text not null default '',
  created_at timestamptz not null default now()
);

alter table if exists public.participants add column if not exists checked_in_by_user_id text;
alter table if exists public.participants add column if not exists checked_in_by_name text;
alter table if exists public.participants add column if not exists checkin_origin text;
alter table if exists public.participants add column if not exists checkin_is_test boolean default false;
alter table if exists public.participants add column if not exists checkin_test_status text;
alter table if exists public.participants add column if not exists badge_name text;
alter table if exists public.participants add column if not exists printed boolean default false;
alter table if exists public.participants add column if not exists allowed_areas text[];
alter table if exists public.participants add column if not exists allowed_area_ids text[];
alter table if exists public.participants drop constraint if exists participants_checkin_origin_check;
alter table if exists public.participants add constraint participants_checkin_origin_check
  check (checkin_origin is null or checkin_origin in ('TESTE','OFICIAL')) not valid;
alter table if exists public.participants validate constraint participants_checkin_origin_check;
alter table if exists public.participants drop constraint if exists participants_checkin_test_status_check;
alter table if exists public.participants add constraint participants_checkin_test_status_check
  check (checkin_test_status is null or checkin_test_status in ('ATIVO','CANCELADO_TESTE')) not valid;
alter table if exists public.participants validate constraint participants_checkin_test_status_check;

create table if not exists public.event_users (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  user_id text references public.users(id) on delete cascade,
  role text not null,
  active boolean default true,
  permissions text[]
);

create table if not exists public.checkins (
  id text primary key,
  user_id text references public.participants(id) on delete cascade,
  event_id text references public.events(id) on delete cascade,
  check_in_at timestamptz not null default now(),
  is_test boolean default false,
  origin text default 'OFICIAL',
  test_status text
);
alter table if exists public.checkins add column if not exists is_test boolean default false;
alter table if exists public.checkins add column if not exists origin text default 'OFICIAL';
alter table if exists public.checkins add column if not exists test_status text;
alter table if exists public.checkins drop constraint if exists checkins_origin_check;
alter table if exists public.checkins add constraint checkins_origin_check
  check (origin is null or origin in ('TESTE','OFICIAL')) not valid;
alter table if exists public.checkins validate constraint checkins_origin_check;
alter table if exists public.checkins drop constraint if exists checkins_test_status_check;
alter table if exists public.checkins add constraint checkins_test_status_check
  check (test_status is null or test_status in ('ATIVO','CANCELADO_TESTE')) not valid;
alter table if exists public.checkins validate constraint checkins_test_status_check;

create table if not exists public.logs (
  id text primary key,
  participant_id text,
  action text not null,
  performed_by text,
  timestamp timestamptz not null default now(),
  event_id text references public.events(id) on delete cascade,
  organization_id text,
  is_test boolean default false,
  origin text,
  test_status text
);
alter table if exists public.logs add column if not exists organization_id text;
alter table if exists public.logs add column if not exists is_test boolean default false;
alter table if exists public.logs add column if not exists origin text;
alter table if exists public.logs add column if not exists test_status text;

create table if not exists public.action_logs (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  user_id text,
  participant_id text,
  activity_id text,
  ticket_number integer,
  action text not null,
  timestamp timestamptz not null default now(),
  is_test boolean default false,
  origin text,
  test_status text
);
alter table if exists public.action_logs add column if not exists is_test boolean default false;
alter table if exists public.action_logs add column if not exists origin text;
alter table if exists public.action_logs add column if not exists test_status text;

create table if not exists public.activities (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  title text not null,
  room_name text,
  speaker_name text,
  date text,
  start_time text,
  end_time text,
  workload_hours numeric default 0,
  active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_attendances (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  activity_id text references public.activities(id) on delete cascade,
  participant_id text references public.participants(id) on delete cascade,
  checked_at timestamptz not null default now(),
  checked_by_user_id text
);

create table if not exists public.certificates (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  participant_id text references public.participants(id) on delete cascade,
  activity_id text references public.activities(id) on delete cascade,
  type text not null,
  total_hours numeric default 0,
  certificate_code text not null unique,
  issued_at timestamptz not null default now(),
  issued_by_user_id text
);

create table if not exists public.certificate_templates (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  name text not null,
  orientation text not null,
  page_size text not null,
  background_image_url text,
  logo_url text,
  elements jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_fields (
  id text primary key,
  name text not null,
  type text not null,
  required boolean default false,
  options text[],
  active boolean default true,
  field_order integer
);

create table if not exists public.areas (
  id text primary key,
  name text not null,
  color text,
  event_id text references public.events(id) on delete cascade,
  active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.area_access_logs (
  id text primary key,
  participant_id text references public.participants(id) on delete cascade,
  area_id text references public.areas(id) on delete cascade,
  status text not null,
  user_id text,
  timestamp timestamptz not null default now(),
  is_test boolean default false,
  origin text,
  test_status text
);
alter table if exists public.area_access_logs add column if not exists is_test boolean default false;
alter table if exists public.area_access_logs add column if not exists origin text;
alter table if exists public.area_access_logs add column if not exists test_status text;

create table if not exists public.access_profiles (
  id text primary key,
  name text not null,
  area_ids text[],
  event_id text references public.events(id) on delete cascade
);

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
  status text not null default 'PAUSADA',
  approval_mode text not null default 'MANUAL',
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  category text,
  custom_fields jsonb not null default '{}'::jsonb,
  status text not null default 'PENDENTE',
  qr_token text unique,
  lgpd_accepted boolean not null default false,
  registered_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cloakroom (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  participant_id text references public.participants(id) on delete set null,
  participant_name text not null,
  item_description text not null,
  tag_number integer not null,
  volume_count integer default 1,
  volume_tags text[],
  volumes jsonb not null default '[]'::jsonb,
  storage_rack_id text,
  storage_rack_name text,
  storage_column text,
  storage_row text,
  storage_address text,
  storage_occupied_at timestamptz,
  storage_released_at timestamptz,
  storage_operator_id text,
  registered_by_user_id text,
  registered_by_name text,
  returned_by_user_id text,
  returned_by_name text,
  status text not null default 'guardado',
  registered_at timestamptz not null default now(),
  returned_at timestamptz
);
alter table if exists public.cloakroom alter column participant_id drop not null;
alter table if exists public.cloakroom add column if not exists volume_count integer default 1;
alter table if exists public.cloakroom add column if not exists volume_tags text[];
alter table if exists public.cloakroom add column if not exists volumes jsonb not null default '[]'::jsonb;
alter table if exists public.cloakroom add column if not exists storage_rack_id text;
alter table if exists public.cloakroom add column if not exists storage_rack_name text;
alter table if exists public.cloakroom add column if not exists storage_column text;
alter table if exists public.cloakroom add column if not exists storage_row text;
alter table if exists public.cloakroom add column if not exists storage_address text;
alter table if exists public.cloakroom add column if not exists storage_occupied_at timestamptz;
alter table if exists public.cloakroom add column if not exists storage_released_at timestamptz;
alter table if exists public.cloakroom add column if not exists storage_operator_id text;
alter table if exists public.cloakroom add column if not exists registered_by_user_id text;
alter table if exists public.cloakroom add column if not exists registered_by_name text;
alter table if exists public.cloakroom add column if not exists returned_by_user_id text;
alter table if exists public.cloakroom add column if not exists returned_by_name text;
alter table if exists public.cloakroom drop constraint if exists cloakroom_status_check;
alter table if exists public.cloakroom add constraint cloakroom_status_check
  check (status in ('guardado','retirado')) not valid;
alter table if exists public.cloakroom validate constraint cloakroom_status_check;

create table if not exists public.cloakroom_ticket_counters (
  event_id text primary key references public.events(id) on delete cascade,
  next_tag_number integer not null default 101,
  updated_at timestamptz not null default now()
);

insert into public.cloakroom_ticket_counters (event_id, next_tag_number)
select event_id, greatest(coalesce(max(tag_number), 100) + 1, 101)
from public.cloakroom
group by event_id
on conflict (event_id) do update
set next_tag_number = greatest(public.cloakroom_ticket_counters.next_tag_number, excluded.next_tag_number),
    updated_at = now();

create table if not exists public.cloakroom_position_claims (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  cloakroom_id text not null references public.cloakroom(id) on delete cascade,
  volume_id text not null,
  storage_rack_id text not null,
  storage_address text not null,
  occupied_at timestamptz not null default now(),
  released_at timestamptz,
  operator_id text
);

insert into public.cloakroom_position_claims (id, event_id, cloakroom_id, volume_id, storage_rack_id, storage_address, occupied_at, released_at, operator_id)
select 'claim_' || encode(gen_random_bytes(8), 'hex'), c.event_id, c.id, coalesce(v.value->>'id', 'vol_1'),
       coalesce(v.value->>'storageRackId', c.storage_rack_id, 'principal'),
       coalesce(nullif(v.value->>'storageAddress', ''), c.storage_address),
       coalesce((v.value->>'storageOccupiedAt')::timestamptz, c.storage_occupied_at, c.registered_at),
       c.returned_at,
       coalesce(v.value->>'storageOperatorId', c.storage_operator_id)
from public.cloakroom c
cross join lateral jsonb_array_elements(case when jsonb_typeof(c.volumes) = 'array' and jsonb_array_length(c.volumes) > 0 then c.volumes else '[]'::jsonb end) as v(value)
where c.status = 'guardado'
  and coalesce(nullif(v.value->>'storageAddress', ''), c.storage_address) is not null
on conflict do nothing;

create unique index if not exists idx_event_users_event_user on public.event_users(event_id, user_id);
create index if not exists idx_participants_event_id on public.participants(event_id);
create index if not exists idx_participants_cpf on public.participants(cpf);
create index if not exists idx_participants_ticket_code on public.participants(ticket_code);
create index if not exists idx_participants_checked_in on public.participants(checked_in);
create index if not exists idx_participants_category on public.participants(category);
create unique index if not exists idx_participants_event_ticket_code on public.participants(event_id, ticket_code);
create index if not exists idx_logs_organization_id on public.logs(organization_id);
create index if not exists idx_logs_event_id on public.logs(event_id);
create index if not exists idx_action_logs_event_id on public.action_logs(event_id);
create unique index if not exists idx_checkins_active_event_user on public.checkins(event_id, user_id)
  where coalesce(test_status, '') <> 'CANCELADO_TESTE';
create unique index if not exists idx_activity_attendances_unique on public.activity_attendances(activity_id, participant_id);
create unique index if not exists idx_certificate_templates_event on public.certificate_templates(event_id);
create unique index if not exists idx_online_registration_configs_event on public.online_registration_configs(event_id);
create index if not exists idx_online_registration_configs_event_id on public.online_registration_configs(event_id);
create unique index if not exists idx_online_registration_configs_slug on public.online_registration_configs(slug);
create index if not exists idx_online_registrations_event_id on public.online_registrations(event_id);
create index if not exists idx_online_registrations_status on public.online_registrations(status);
create unique index if not exists idx_online_registrations_event_email on public.online_registrations(event_id, lower(email)) where email is not null and email <> '';
create unique index if not exists idx_online_registrations_event_phone on public.online_registrations(event_id, phone) where phone is not null and phone <> '';
create unique index if not exists idx_online_registrations_event_cpf on public.online_registrations(event_id, cpf) where cpf is not null and cpf <> '';
create unique index if not exists idx_cloakroom_event_tag_number on public.cloakroom(event_id, tag_number);
create index if not exists idx_cloakroom_event_id on public.cloakroom(event_id);
create unique index if not exists idx_cloakroom_position_claims_active
  on public.cloakroom_position_claims(event_id, storage_rack_id, storage_address)
  where released_at is null;

create or replace function public.create_cloakroom_item_atomic(p_item jsonb)
returns public.cloakroom
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id text := p_item->>'event_id';
  v_volume_count integer := greatest(1, least(5, coalesce((p_item->>'volume_count')::integer, 1)));
  v_now timestamptz := now();
  v_next_tag integer;
  v_id text := coalesce(nullif(p_item->>'id', ''), 'c_' || encode(gen_random_bytes(8), 'hex'));
  v_volume_tags text[] := array[]::text[];
  v_volumes jsonb := '[]'::jsonb;
  v_seen text[] := array[]::text[];
  v_conflicts text[] := array[]::text[];
  v_source jsonb;
  v_volume jsonb;
  v_rack text;
  v_address text;
  v_claim_key text;
  v_i integer;
  v_created public.cloakroom;
begin
  if v_event_id is null or v_event_id = '' then
    raise exception 'event_id is required' using errcode = '22023';
  end if;

  insert into public.cloakroom_ticket_counters(event_id, next_tag_number)
  values (v_event_id, 101)
  on conflict (event_id) do nothing;

  update public.cloakroom_ticket_counters
  set next_tag_number = next_tag_number + 1, updated_at = v_now
  where event_id = v_event_id
  returning next_tag_number - 1 into v_next_tag;

  for v_i in 0..(v_volume_count - 1) loop
    v_volume_tags := array_append(v_volume_tags, v_next_tag::text || '-' || (v_i + 1)::text);
    v_source := coalesce(p_item->'volumes'->v_i, '{}'::jsonb);
    v_rack := coalesce(nullif(v_source->>'storageRackId', ''), nullif(p_item->>'storage_rack_id', ''), 'principal');
    v_address := nullif(coalesce(v_source->>'storageAddress', p_item->>'storage_address'), '');
    v_claim_key := v_rack || '::' || coalesce(v_address, '');

    if v_address is not null then
      if v_claim_key = any(v_seen) then
        raise exception 'duplicate position %', v_address
          using errcode = '23505', hint = 'CLOAKROOM_DUPLICATE_REQUEST_POSITION', detail = v_address;
      end if;
      v_seen := array_append(v_seen, v_claim_key);
    end if;

    v_volume := jsonb_build_object(
      'id', coalesce(nullif(v_source->>'id', ''), 'vol_' || (v_i + 1)::text),
      'tag', v_next_tag::text || '-' || (v_i + 1)::text,
      'description', coalesce(v_source->>'description', p_item->>'item_description', ''),
      'storageRackId', nullif(v_rack, ''),
      'storageRackName', coalesce(nullif(v_source->>'storageRackName', ''), nullif(p_item->>'storage_rack_name', '')),
      'storageColumn', coalesce(nullif(v_source->>'storageColumn', ''), nullif(p_item->>'storage_column', '')),
      'storageRow', coalesce(nullif(v_source->>'storageRow', ''), nullif(p_item->>'storage_row', '')),
      'storageAddress', v_address,
      'storageOccupiedAt', coalesce(nullif(v_source->>'storageOccupiedAt', ''), p_item->>'storage_occupied_at', v_now::text),
      'storageOperatorId', coalesce(nullif(v_source->>'storageOperatorId', ''), nullif(p_item->>'storage_operator_id', '')),
      'positionMode', coalesce(nullif(v_source->>'positionMode', ''), 'auto')
    );
    v_volumes := v_volumes || jsonb_build_array(v_volume);
  end loop;

  select coalesce(array_agg((claim->>'storageAddress')::text), array[]::text[]) into v_conflicts
  from jsonb_array_elements(v_volumes) claim
  where nullif(claim->>'storageAddress', '') is not null
    and exists (
      select 1 from public.cloakroom_position_claims active_claim
      where active_claim.event_id = v_event_id
        and active_claim.storage_rack_id = coalesce(nullif(claim->>'storageRackId', ''), 'principal')
        and active_claim.storage_address = claim->>'storageAddress'
        and active_claim.released_at is null
    );

  if array_length(v_conflicts, 1) is not null then
    raise exception 'cloakroom position conflict'
      using errcode = '23505', hint = 'CLOAKROOM_POSITION_CONFLICT', detail = array_to_string(v_conflicts, ',');
  end if;

  insert into public.cloakroom (
    id, event_id, participant_id, participant_name, item_description, tag_number, volume_count, volume_tags, volumes,
    storage_rack_id, storage_rack_name, storage_column, storage_row, storage_address, storage_occupied_at, storage_operator_id,
    registered_by_user_id, registered_by_name, status, registered_at
  ) values (
    v_id, v_event_id, nullif(p_item->>'participant_id', ''), coalesce(p_item->>'participant_name', ''),
    (select string_agg('Volume ' || ord::text || ': ' || coalesce(value->>'description', '-'), E'\n') from jsonb_array_elements(v_volumes) with ordinality as t(value, ord)),
    v_next_tag, v_volume_count, v_volume_tags, v_volumes,
    v_volumes->0->>'storageRackId', v_volumes->0->>'storageRackName', v_volumes->0->>'storageColumn', v_volumes->0->>'storageRow',
    v_volumes->0->>'storageAddress', coalesce((v_volumes->0->>'storageOccupiedAt')::timestamptz, v_now), v_volumes->0->>'storageOperatorId',
    nullif(p_item->>'registered_by_user_id', ''), nullif(p_item->>'registered_by_name', ''), 'guardado', v_now
  ) returning * into v_created;

  insert into public.cloakroom_position_claims (id, event_id, cloakroom_id, volume_id, storage_rack_id, storage_address, occupied_at, operator_id)
  select 'claim_' || encode(gen_random_bytes(8), 'hex'), v_event_id, v_id, value->>'id', coalesce(nullif(value->>'storageRackId', ''), 'principal'), value->>'storageAddress', v_now, nullif(value->>'storageOperatorId', '')
  from jsonb_array_elements(v_volumes) as t(value)
  where nullif(value->>'storageAddress', '') is not null;

  return v_created;
end;
$$;

create or replace function public.collect_cloakroom_item_atomic(p_cloakroom_id text, p_returned_by_user_id text, p_returned_by_name text)
returns public.cloakroom
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_item public.cloakroom;
begin
  update public.cloakroom
  set status = 'retirado',
      returned_at = v_now,
      returned_by_user_id = p_returned_by_user_id,
      returned_by_name = p_returned_by_name,
      storage_released_at = v_now,
      volumes = (
        select coalesce(jsonb_agg(
          case
            when nullif(value->>'storageAddress', '') is not null then jsonb_set(value, '{storageReleasedAt}', to_jsonb(v_now::text), true)
            else value
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(case when jsonb_typeof(public.cloakroom.volumes) = 'array' then public.cloakroom.volumes else '[]'::jsonb end) as t(value)
      )
  where id = p_cloakroom_id
  returning * into v_item;

  if not found then
    return null;
  end if;

  update public.cloakroom_position_claims
  set released_at = v_now
  where cloakroom_id = p_cloakroom_id and released_at is null;

  return v_item;
end;
$$;

create or replace function public.reset_event_test_data(p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participants integer := 0;
  v_action_logs integer := 0;
  v_area_logs integer := 0;
  v_checkins integer := 0;
begin
  update public.participants
  set checked_in = false,
      checked_in_at = null,
      checked_in_by_user_id = null,
      checked_in_by_name = null,
      checkin_origin = 'TESTE',
      checkin_is_test = true,
      checkin_test_status = 'CANCELADO_TESTE',
      printed = case
        when exists (select 1 from public.action_logs al where al.event_id = p_event_id and al.participant_id = participants.id and al.action = 'REPRINT_BADGE' and (al.is_test = true or al.origin = 'TESTE'))
         and not exists (select 1 from public.action_logs al where al.event_id = p_event_id and al.participant_id = participants.id and al.action = 'REPRINT_BADGE' and coalesce(al.is_test, false) = false and coalesce(al.origin, 'OFICIAL') <> 'TESTE')
        then false else printed end
  where event_id = p_event_id and (checkin_is_test = true or checkin_origin = 'TESTE');
  get diagnostics v_participants = row_count;

  update public.action_logs
  set test_status = 'CANCELADO_TESTE'
  where event_id = p_event_id and (is_test = true or origin = 'TESTE') and coalesce(test_status, '') <> 'CANCELADO_TESTE';
  get diagnostics v_action_logs = row_count;

  update public.logs
  set test_status = 'CANCELADO_TESTE'
  where event_id = p_event_id and (is_test = true or origin = 'TESTE') and coalesce(test_status, '') <> 'CANCELADO_TESTE';

  update public.area_access_logs aal
  set test_status = 'CANCELADO_TESTE'
  from public.areas a
  where aal.area_id = a.id and a.event_id = p_event_id and (aal.is_test = true or aal.origin = 'TESTE') and coalesce(aal.test_status, '') <> 'CANCELADO_TESTE';
  get diagnostics v_area_logs = row_count;

  update public.checkins
  set test_status = 'CANCELADO_TESTE'
  where event_id = p_event_id and (is_test = true or origin = 'TESTE') and coalesce(test_status, '') <> 'CANCELADO_TESTE';
  get diagnostics v_checkins = row_count;

  return jsonb_build_object(
    'participantsReset', v_participants,
    'actionLogsCanceled', v_action_logs,
    'areaLogsCanceled', v_area_logs,
    'checkinsCanceled', v_checkins
  );
end;
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.event_users enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.checkins enable row level security;
alter table public.logs enable row level security;
alter table public.action_logs enable row level security;
alter table public.cloakroom enable row level security;
alter table public.cloakroom_ticket_counters enable row level security;
alter table public.cloakroom_position_claims enable row level security;
alter table public.activities enable row level security;
alter table public.activity_attendances enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.participant_fields enable row level security;
alter table public.areas enable row level security;
alter table public.area_access_logs enable row level security;
alter table public.access_profiles enable row level security;
alter table public.online_registration_configs enable row level security;
alter table public.online_registrations enable row level security;

comment on table public.events is 'Credencia events. Existing rows without organization_id must be assigned manually to the correct organization before production use.';
comment on table public.users is 'Users are created securely through npm run admin:create. Production migrations must not seed passwords.';
