-- Create unsubscribe table
CREATE TABLE IF NOT EXISTS unsubscribe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opt_out_type TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unsubscribe_email ON unsubscribe(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_created_at ON unsubscribe(created_at);

-- Enable RLS (but allow public inserts for unsubscribe functionality)
ALTER TABLE unsubscribe ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public to insert unsubscribe records
CREATE POLICY "Allow public to insert unsubscribe records" ON unsubscribe
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policy: Only authenticated users can view unsubscribe records (for admin purposes)
CREATE POLICY "Authenticated users can view unsubscribe records" ON unsubscribe
  FOR SELECT
  TO authenticated
  USING (true);

