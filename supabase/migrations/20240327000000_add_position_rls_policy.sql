-- Add RLS policy for position table
-- This allows users to access position data for filtering based on sport_id

-- Enable RLS on position table if not already enabled
ALTER TABLE position ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view position data for their sport
-- This is reference data that should be accessible to all authenticated users
CREATE POLICY "Users can view position data"
    ON position
    FOR SELECT
    USING (true);  -- Since this is reference data, all authenticated users can view it

-- Create index for better performance on sport_id lookups
CREATE INDEX IF NOT EXISTS idx_position_sport_id ON position(sport_id);
CREATE INDEX IF NOT EXISTS idx_position_order ON position("order"); 