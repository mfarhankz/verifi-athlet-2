-- Create depth_chart_assignments table for assigning athletes to depth chart positions
CREATE TABLE depth_chart_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  sub_position_id UUID NOT NULL REFERENCES depth_chart_sub_position(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  ranking INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL,
  scenario TEXT DEFAULT 'base',
  month INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (ranking > 0),
  CHECK (month >= 1 AND month <= 12),
  CHECK (year > 0),
  
  -- Unique constraint to prevent duplicate assignments for same athlete/position/context
  UNIQUE(athlete_id, sub_position_id, customer_id, year, scenario, month)
);

-- Create indexes for performance
CREATE INDEX idx_depth_chart_assignments_athlete_id ON depth_chart_assignments(athlete_id);
CREATE INDEX idx_depth_chart_assignments_sub_position_id ON depth_chart_assignments(sub_position_id);
CREATE INDEX idx_depth_chart_assignments_customer_year_scenario ON depth_chart_assignments(customer_id, year, scenario, month);
CREATE INDEX idx_depth_chart_assignments_ranking ON depth_chart_assignments(sub_position_id, ranking);

-- Enable RLS
ALTER TABLE depth_chart_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for depth_chart_assignments
CREATE POLICY "Users can view their own depth chart assignments" ON depth_chart_assignments
  FOR SELECT USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own depth chart assignments" ON depth_chart_assignments
  FOR INSERT WITH CHECK (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own depth chart assignments" ON depth_chart_assignments
  FOR UPDATE USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own depth chart assignments" ON depth_chart_assignments
  FOR DELETE USING (customer_id IN (
    SELECT customer_id FROM user_customer_access WHERE user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_depth_chart_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_depth_chart_assignments_updated_at
    BEFORE UPDATE ON depth_chart_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_depth_chart_assignments_updated_at();

-- Function to get effective depth chart assignments with inheritance logic
CREATE OR REPLACE FUNCTION get_effective_depth_chart_assignments(
  p_customer_id UUID,
  p_year INTEGER,
  p_scenario TEXT DEFAULT 'base',
  p_month INTEGER DEFAULT 1,
  p_sub_position_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  athlete_id UUID,
  sub_position_id UUID,
  customer_id UUID,
  ranking INTEGER,
  year INTEGER,
  scenario TEXT,
  month INTEGER,
  is_inherited BOOLEAN,
  source_scenario TEXT,
  source_month INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH assignment_priority AS (
    -- Get all assignments for the customer and year
    SELECT 
      dca.*,
      CASE
        -- Exact match has highest priority (0)
        WHEN dca.scenario = p_scenario AND dca.month = p_month THEN 0
        -- Same scenario, earlier month (month inheritance) has priority 1
        WHEN dca.scenario = p_scenario AND dca.month < p_month THEN 1
        -- Base scenario, same month has priority 2
        WHEN dca.scenario = 'base' AND dca.month = p_month THEN 2
        -- Base scenario, earlier month has priority 3
        WHEN dca.scenario = 'base' AND dca.month < p_month THEN 3
        -- No match, shouldn't happen with our query
        ELSE 999
      END as priority,
      dca.scenario as source_scenario,
      dca.month as source_month
    FROM depth_chart_assignments dca
    WHERE dca.customer_id = p_customer_id
      AND dca.year = p_year
      AND (p_sub_position_id IS NULL OR dca.sub_position_id = p_sub_position_id)
      AND (
        -- Exact match
        (dca.scenario = p_scenario AND dca.month = p_month)
        OR
        -- Month inheritance: same scenario, earlier month
        (dca.scenario = p_scenario AND dca.month <= p_month)
        OR
        -- Scenario inheritance: base scenario
        (dca.scenario = 'base' AND dca.month <= p_month)
      )
  ),
  ranked_assignments AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY athlete_id, sub_position_id 
        ORDER BY priority ASC, source_month DESC
      ) as rn
    FROM assignment_priority
  )
  SELECT 
    ra.id,
    ra.athlete_id,
    ra.sub_position_id,
    ra.customer_id,
    ra.ranking,
    p_year as year,
    p_scenario as scenario,
    p_month as month,
    CASE WHEN ra.priority > 0 THEN true ELSE false END as is_inherited,
    ra.source_scenario,
    ra.source_month
  FROM ranked_assignments ra
  WHERE ra.rn = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to handle ranking conflicts when inserting/updating assignments
CREATE OR REPLACE FUNCTION handle_ranking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rankings for other athletes in the same sub_position when a new assignment is added
  -- or when an existing assignment's ranking is changed
  UPDATE depth_chart_assignments 
  SET ranking = ranking + 1,
      updated_at = NOW()
  WHERE sub_position_id = NEW.sub_position_id
    AND customer_id = NEW.customer_id
    AND year = NEW.year
    AND scenario = NEW.scenario
    AND month = NEW.month
    AND ranking >= NEW.ranking
    AND id != NEW.id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle ranking conflicts
CREATE TRIGGER handle_depth_chart_ranking_conflicts
    BEFORE INSERT OR UPDATE ON depth_chart_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_ranking_conflicts();

-- Function to clean up rankings after deletion
CREATE OR REPLACE FUNCTION cleanup_rankings_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize rankings after deletion to ensure no gaps
  WITH ranked_assignments AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ranking) as new_ranking
    FROM depth_chart_assignments
    WHERE sub_position_id = OLD.sub_position_id
      AND customer_id = OLD.customer_id
      AND year = OLD.year
      AND scenario = OLD.scenario
      AND month = OLD.month
      AND ranking > OLD.ranking
  )
  UPDATE depth_chart_assignments 
  SET ranking = ra.new_ranking + OLD.ranking - 1,
      updated_at = NOW()
  FROM ranked_assignments ra
  WHERE depth_chart_assignments.id = ra.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup rankings after deletion
CREATE TRIGGER cleanup_depth_chart_rankings_after_delete
    AFTER DELETE ON depth_chart_assignments
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_rankings_after_delete();
