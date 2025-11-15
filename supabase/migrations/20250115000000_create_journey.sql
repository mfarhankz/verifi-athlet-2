-- Create journey table
CREATE TABLE IF NOT EXISTS journey (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_detail(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  journey_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journey_customer_id ON journey(customer_id);
CREATE INDEX IF NOT EXISTS idx_journey_user_id ON journey(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_ended_at ON journey(ended_at);
CREATE INDEX IF NOT EXISTS idx_journey_active ON journey(customer_id, ended_at) WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE journey ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view journeys for their customer
CREATE POLICY "Users can view journeys for their customer" ON journey
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert journeys for their customer
CREATE POLICY "Users can insert journeys for their customer" ON journey
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update journeys for their customer
CREATE POLICY "Users can update journeys for their customer" ON journey
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

