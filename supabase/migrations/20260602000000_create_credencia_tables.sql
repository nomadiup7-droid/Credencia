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

-- --- SEED SECTOR: Insert defaults matching db.json ---
INSERT INTO users (id, name, email, role, password_hash, created_at)
VALUES 
  ('u1', 'Administrador Principal', 'admin@credencia.com', 'admin', 'admin123', '2026-01-01T10:00:00Z'),
  ('u2', 'Operador CREDENCIA', 'operador@credencia.com', 'operator', 'op123', '2026-01-02T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, name, date, location, capacity, created_at)
VALUES
  ('e1', 'Congresso Internacional de Tecnologia 2026', '2026-06-15', 'Centro de Convenções Anhembi, São Paulo', 500, '2026-05-01T08:00:00Z'),
  ('e2', 'Expo Marketing Digital & Vendas', '2026-07-22', 'Expo Center Norte, São Paulo', 350, '2026-05-10T09:30:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, event_id, name, email, cpf, category, checked_in, checked_in_at, ticket_code, company, created_at)
VALUES
  ('p1', 'e1', 'Alice Silva Santos', 'alice.silva@email.com', '12345678901', 'Palestrante', TRUE, '2026-06-02T13:45:00Z', 'TKT-E1-PAL-12345', '', '2026-05-15T12:00:00Z'),
  ('p2', 'e1', 'Bruno Ramos de Oliveira', 'bruno.ramos@email.com', '23456789012', 'VIP', TRUE, '2026-06-02T14:15:00Z', 'TKT-E1-VIP-67890', '', '2026-05-16T14:30:00Z'),
  ('p3', 'e1', 'Carla Dias de Souza', 'carla.dias@email.com', '34567890123', 'Participante', FALSE, NULL, 'TKT-E1-PRT-11223', '', '2026-05-18T09:15:00Z'),
  ('p4', 'e1', 'Daniel Ferraz Cruz', 'daniel.ferraz@email.com', '45678901234', 'Expositor', FALSE, NULL, 'TKT-E1-EXP-44556', '', '2026-05-19T10:00:00Z'),
  ('p5', 'e1', 'Eduardo Pereira Lima', 'eduardo.lima@email.com', '56789012345', 'Staff', TRUE, '2026-06-02T08:30:00Z', 'TKT-E1-STF-99887', '', '2026-05-20T11:20:00Z'),
  ('p6', 'e2', 'Fernanda Albuquerque Mendes', 'fernanda.albu@email.com', '67890123456', 'VIP', FALSE, NULL, 'TKT-E2-VIP-33445', '', '2026-05-21T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cloakroom (id, event_id, participant_id, participant_name, item_description, tag_number, status, registered_at, returned_at)
VALUES
  ('c1', 'e1', 'p1', 'Alice Silva Santos', 'Mochila preta com notebook', 101, 'guardado', '2026-06-02T13:48:00Z', NULL),
  ('c2', 'e1', 'p2', 'Bruno Ramos de Oliveira', 'Casaco cinza de lã', 102, 'retirado', '2026-06-02T14:18:00Z', '2026-06-02T16:30:00Z')
ON CONFLICT (id) DO NOTHING;
