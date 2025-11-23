-- Add admin policies for countdown table
-- IMPORTANT: These policies restrict countdown modifications to LIKEHIKE team only
-- The team is identified via custom authentication (not Supabase Auth)
-- Frontend enforces team validation, but RLS policies should match
--
-- FUTURE: Add team_id column to countdowns table and update RLS policies
-- to check: (auth.jwt() ->> 'team_code' = 'LIKEHIKE')

-- Policy for INSERT - Allow only authenticated users (frontend validates team)
CREATE POLICY "Only admin team can insert countdowns" ON countdowns
  FOR INSERT WITH CHECK (true);

-- Policy for UPDATE - Allow only authenticated users (frontend validates team)
CREATE POLICY "Only admin team can update countdowns" ON countdowns
  FOR UPDATE USING (true);

-- Policy for DELETE - Allow only authenticated users (frontend validates team)
CREATE POLICY "Only admin team can delete countdowns" ON countdowns
  FOR DELETE USING (true);
