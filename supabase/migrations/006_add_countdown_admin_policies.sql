-- Add admin policies for countdown table
-- Allow anyone to INSERT, UPDATE, and DELETE countdowns
-- In production, you would restrict these to admin users only

-- Policy for INSERT
CREATE POLICY "Anyone can insert countdowns" ON countdowns
  FOR INSERT WITH CHECK (true);

-- Policy for UPDATE
CREATE POLICY "Anyone can update countdowns" ON countdowns
  FOR UPDATE USING (true);

-- Policy for DELETE
CREATE POLICY "Anyone can delete countdowns" ON countdowns
  FOR DELETE USING (true);
