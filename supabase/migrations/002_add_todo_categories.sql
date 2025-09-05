-- Add category field to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);

-- Add status field to todos table for better workflow management
ALTER TABLE todos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' 
  CHECK (status IN ('open', 'in_progress', 'completed', 'blocked'));

-- Create index for status filtering  
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);

-- Add estimated points field for complexity tracking
ALTER TABLE todos ADD COLUMN IF NOT EXISTS estimated_points INTEGER DEFAULT 1;

-- Add actual points field for tracking completion effort
ALTER TABLE todos ADD COLUMN IF NOT EXISTS actual_points INTEGER;

-- Add assignee field for task assignment
ALTER TABLE todos ADD COLUMN IF NOT EXISTS assignee VARCHAR(255);

-- Add due date field for deadline tracking
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add completed_at field to track completion time
ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for due date filtering
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

-- Update team_todos table to include additional progress tracking
ALTER TABLE team_todos ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE team_todos ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE team_todos ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Create index for progress tracking
CREATE INDEX IF NOT EXISTS idx_team_todos_progress ON team_todos(progress_percentage);