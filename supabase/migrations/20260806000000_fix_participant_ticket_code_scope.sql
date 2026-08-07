-- Fix participant ticket code scope.
-- Older bootstrap migrations created participants.ticket_code as globally UNIQUE.
-- The application scopes participants by event, so ticket codes should only be
-- unique within the same event.

alter table if exists public.participants
  drop constraint if exists participants_ticket_code_key;

create unique index if not exists idx_participants_event_ticket_code
  on public.participants(event_id, ticket_code);
