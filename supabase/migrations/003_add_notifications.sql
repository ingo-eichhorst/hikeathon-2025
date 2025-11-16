-- Notifications system for persistent broadcast storage
-- This migration adds tables for storing notifications and tracking read status per team

-- Notifications table: stores all broadcast notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  sender VARCHAR(255), -- who sent the notification (e.g., 'Admin', team name)
  metadata JSONB DEFAULT '{}'::jsonb, -- extensible field for additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification reads table: tracks which teams have read which notifications
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  team_code VARCHAR(10) NOT NULL, -- team identifier (matches teams.code)
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, team_code)
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX idx_notification_reads_team_code ON notification_reads(team_code);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Notifications: Public read access
CREATE POLICY "Notifications are viewable by everyone" ON notifications
  FOR SELECT USING (true);

-- Notifications: Allow inserts (for admin/system)
CREATE POLICY "Notifications can be created" ON notifications
  FOR INSERT WITH CHECK (true); -- In production, add proper auth check

-- Notification reads: Public read access
CREATE POLICY "Notification reads are viewable by everyone" ON notification_reads
  FOR SELECT USING (true);

-- Notification reads: Teams can mark their own as read
CREATE POLICY "Teams can mark notifications as read" ON notification_reads
  FOR INSERT WITH CHECK (true); -- In production, add proper auth check

-- Helper function to get unread count for a team
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_team_code VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications n
    WHERE NOT EXISTS (
      SELECT 1 FROM notification_reads nr
      WHERE nr.notification_id = n.id
      AND nr.team_code = p_team_code
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get notifications with read status for a team
CREATE OR REPLACE FUNCTION get_notifications_for_team(
  p_team_code VARCHAR,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  message TEXT,
  type VARCHAR,
  sender VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.message,
    n.type,
    n.sender,
    n.metadata,
    n.created_at,
    EXISTS (
      SELECT 1 FROM notification_reads nr
      WHERE nr.notification_id = n.id
      AND nr.team_code = p_team_code
    ) as is_read
  FROM notifications n
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Comment on tables
COMMENT ON TABLE notifications IS 'Stores all broadcast notifications for persistent history';
COMMENT ON TABLE notification_reads IS 'Tracks which teams have read which notifications';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a specific team';
COMMENT ON FUNCTION get_notifications_for_team IS 'Returns notifications with read status for a specific team';
