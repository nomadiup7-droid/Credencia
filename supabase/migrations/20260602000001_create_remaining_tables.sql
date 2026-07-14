-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Alter existing users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[];

-- 3. Alter existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS credential_type TEXT DEFAULT 'badge';
ALTER TABLE events ADD COLUMN IF NOT EXISTS credential_size TEXT DEFAULT 'A6';
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS enable_access_control BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS enable_cloakroom BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS enable_scanner BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS layout_config JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_screen_config JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cloakroom_label_config JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. Alter existing participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS badge_name TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS printed BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS allowed_areas TEXT[];
ALTER TABLE participants ADD COLUMN IF NOT EXISTS allowed_area_ids TEXT[];

-- 5. Alter existing cloakroom table
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS volume_count INTEGER DEFAULT 1;
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS volume_tags TEXT[];
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS registered_by_user_id TEXT;
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS registered_by_name TEXT;
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS returned_by_user_id TEXT;
ALTER TABLE cloakroom ADD COLUMN IF NOT EXISTS returned_by_name TEXT;

-- 6. Create event_users table
CREATE TABLE IF NOT EXISTS event_users (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  permissions TEXT[]
);

-- 7. Create checkins table
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create logs table (CheckInLog)
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  action TEXT NOT NULL,
  performed_by TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  organization_id TEXT
);

-- 9. Create action_logs table (ActionLog)
CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT,
  participant_id TEXT,
  activity_id TEXT,
  ticket_number INTEGER,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  room_name TEXT,
  speaker_name TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  workload_hours NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Create activity_attendances table
CREATE TABLE IF NOT EXISTS activity_attendances (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by_user_id TEXT
);

-- 12. Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  total_hours NUMERIC DEFAULT 0,
  certificate_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by_user_id TEXT
);

-- 13. Create certificate_templates table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  orientation TEXT NOT NULL,
  page_size TEXT NOT NULL,
  background_image_url TEXT,
  logo_url TEXT,
  elements JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Create participant_fields table
CREATE TABLE IF NOT EXISTS participant_fields (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  options TEXT[],
  active BOOLEAN DEFAULT TRUE,
  field_order INTEGER
);

-- 15. Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Create area_access_logs table
CREATE TABLE IF NOT EXISTS area_access_logs (
  id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Create access_profiles table
CREATE TABLE IF NOT EXISTS access_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area_ids TEXT[],
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE
);

-- Seed/demo data intentionally removed from production migrations.
-- Use scripts/create-admin.ts (npm run admin:create) to create the first administrator securely.
