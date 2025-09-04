-- Create depth_chart_formation table
CREATE TABLE depth_chart_formation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Ensure unique names per customer
  UNIQUE(customer_id, name)
);

-- Add RLS policies for depth_chart_formation
ALTER TABLE depth_chart_formation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own formations" ON depth_chart_formation
  FOR SELECT USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own formations" ON depth_chart_formation
  FOR INSERT WITH CHECK (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own formations" ON depth_chart_formation
  FOR UPDATE USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own formations" ON depth_chart_formation
  FOR DELETE USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

-- Add formation_id column to depth_chart_sub_position
ALTER TABLE depth_chart_sub_position 
ADD COLUMN formation_id UUID REFERENCES depth_chart_formation(id) ON DELETE CASCADE;

-- Update RLS policies for depth_chart_sub_position to use formation_id
DROP POLICY IF EXISTS "Users can view their own sub positions" ON depth_chart_sub_position;
DROP POLICY IF EXISTS "Users can insert their own sub positions" ON depth_chart_sub_position;
DROP POLICY IF EXISTS "Users can update their own sub positions" ON depth_chart_sub_position;
DROP POLICY IF EXISTS "Users can delete their own sub positions" ON depth_chart_sub_position;

CREATE POLICY "Users can view their own sub positions" ON depth_chart_sub_position
  FOR SELECT USING (formation_id IN (
    SELECT id FROM depth_chart_formation WHERE customer_id IN (
      SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert their own sub positions" ON depth_chart_sub_position
  FOR INSERT WITH CHECK (formation_id IN (
    SELECT id FROM depth_chart_formation WHERE customer_id IN (
      SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update their own sub positions" ON depth_chart_sub_position
  FOR UPDATE USING (formation_id IN (
    SELECT id FROM depth_chart_formation WHERE customer_id IN (
      SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete their own sub positions" ON depth_chart_sub_position
  FOR DELETE USING (formation_id IN (
    SELECT id FROM depth_chart_formation WHERE customer_id IN (
      SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
    )
  ));

-- Create indexes for better performance
CREATE INDEX idx_depth_chart_formation_customer_id ON depth_chart_formation(customer_id);
CREATE INDEX idx_depth_chart_formation_order ON depth_chart_formation(customer_id, "order");
CREATE INDEX idx_depth_chart_sub_position_formation_id ON depth_chart_sub_position(formation_id); 