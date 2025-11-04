-- Create score_tracker table
CREATE TABLE IF NOT EXISTS score_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_score_tracker_athlete_id ON score_tracker(athlete_id);
CREATE INDEX IF NOT EXISTS idx_score_tracker_customer_id ON score_tracker(customer_id);
CREATE INDEX IF NOT EXISTS idx_score_tracker_user_id ON score_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_score_tracker_ended_at ON score_tracker(ended_at);
CREATE INDEX IF NOT EXISTS idx_score_tracker_active ON score_tracker(athlete_id, customer_id, ended_at) WHERE ended_at IS NULL;

-- Create unique constraint to prevent duplicate active entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_tracker_unique_active 
ON score_tracker(athlete_id, customer_id) 
WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE score_tracker ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view score tracker entries for their customer
CREATE POLICY "Users can view score tracker entries for their customer" ON score_tracker
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert score tracker entries for their customer
CREATE POLICY "Users can insert score tracker entries for their customer" ON score_tracker
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update score tracker entries for their customer
CREATE POLICY "Users can update score tracker entries for their customer" ON score_tracker
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete score tracker entries for their customer
CREATE POLICY "Users can delete score tracker entries for their customer" ON score_tracker
  FOR DELETE
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_score_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_score_tracker_updated_at
  BEFORE UPDATE ON score_tracker
  FOR EACH ROW
  EXECUTE FUNCTION update_score_tracker_updated_at();
