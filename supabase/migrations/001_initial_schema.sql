-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry table for location tracking
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  location JSONB NOT NULL, -- {lat, lng, accuracy}
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_info JSONB, -- Optional device information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team-specific todos
CREATE TABLE IF NOT EXISTS team_todos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, todo_id)
);

-- Broadcasts table for announcements
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_telemetry_team_id ON telemetry(team_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp DESC);
CREATE INDEX idx_team_todos_team_id ON team_todos(team_id);
CREATE INDEX idx_team_todos_completed ON team_todos(completed);
CREATE INDEX idx_broadcasts_active ON broadcasts(active);
CREATE INDEX idx_broadcasts_expires_at ON broadcasts(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teams: Public read, no public write
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

-- Telemetry: Teams can insert their own, public can read all
CREATE POLICY "Telemetry is viewable by everyone" ON telemetry
  FOR SELECT USING (true);

CREATE POLICY "Teams can insert their own telemetry" ON telemetry
  FOR INSERT WITH CHECK (true); -- In production, add proper auth check

-- Todos: Public read
CREATE POLICY "Todos are viewable by everyone" ON todos
  FOR SELECT USING (true);

-- Team todos: Public read, teams can update their own
CREATE POLICY "Team todos are viewable by everyone" ON team_todos
  FOR SELECT USING (true);

CREATE POLICY "Teams can update their own todos" ON team_todos
  FOR UPDATE USING (true); -- In production, add proper auth check

-- Broadcasts: Public read
CREATE POLICY "Broadcasts are viewable by everyone" ON broadcasts
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Settings: Public read
CREATE POLICY "Settings are viewable by everyone" ON settings
  FOR SELECT USING (true);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_todos_updated_at BEFORE UPDATE ON team_todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();