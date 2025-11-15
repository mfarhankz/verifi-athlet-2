-- Create saved_filter table
CREATE TABLE IF NOT EXISTS saved_filter (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_detail(id) ON DELETE CASCADE,
  search_page TEXT NOT NULL,
  name TEXT NOT NULL,
  is_favorited BOOLEAN NOT NULL DEFAULT false,
  rank_order INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_filter_customer_id ON saved_filter(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_filter_user_id ON saved_filter(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filter_search_page ON saved_filter(search_page);
CREATE INDEX IF NOT EXISTS idx_saved_filter_customer_search_page ON saved_filter(customer_id, search_page);
CREATE INDEX IF NOT EXISTS idx_saved_filter_rank_order ON saved_filter(customer_id, search_page, rank_order);
CREATE INDEX IF NOT EXISTS idx_saved_filter_ended_at ON saved_filter(ended_at);
CREATE INDEX IF NOT EXISTS idx_saved_filter_active ON saved_filter(customer_id, search_page, ended_at) WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE saved_filter ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view saved filters for their customer
CREATE POLICY "Users can view saved filters for their customer" ON saved_filter
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert saved filters for their customer
CREATE POLICY "Users can insert saved filters for their customer" ON saved_filter
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update saved filters for their customer
CREATE POLICY "Users can update saved filters for their customer" ON saved_filter
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

-- RLS Policy: Users can delete saved filters for their customer
CREATE POLICY "Users can delete saved filters for their customer" ON saved_filter
  FOR DELETE
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

