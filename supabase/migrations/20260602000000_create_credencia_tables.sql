-- SUPABASE / POSTGRES SCHEMA MIGRATION
-- Desc: Initializes the database schema tables for Credencia (Users, Events, Participants, Cloakroom)
-- Run this block directly inside your Supabase SQL Editor.

-- 1. Create system users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  category TEXT NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  ticket_code TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create cloakroom table (Chapelaria)
CREATE TABLE IF NOT EXISTS cloakroom (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  item_description TEXT NOT NULL,
  tag_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'guardado' CHECK (status IN ('guardado', 'retirado')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ
);

-- Create optimized database indexes for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_participants_ticket_code ON participants(ticket_code);
CREATE INDEX IF NOT EXISTS idx_cloakroom_event_id ON cloakroom(event_id);

-- Enable Realtime updates (optional, for real-time checkins)
-- alter publication supabase_realtime add table participants;
-- alter publication supabase_realtime add table cloakroom;

-- Seed/demo data intentionally removed from production migrations.
-- Use scripts/create-admin.ts (npm run admin:create) to create the first administrator securely.
