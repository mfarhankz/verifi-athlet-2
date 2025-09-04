-- Fix the ambiguous column reference in get_effective_depth_chart_assignments function
-- This replaces the previous function with a corrected version

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
