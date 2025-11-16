-- Add countdown table for event deadlines
CREATE TABLE IF NOT EXISTS countdowns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_countdowns_active ON countdowns(active);
CREATE INDEX idx_countdowns_deadline ON countdowns(deadline DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Countdowns are viewable by everyone
CREATE POLICY "Countdowns are viewable by everyone" ON countdowns
  FOR SELECT USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_countdowns_updated_at BEFORE UPDATE ON countdowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
