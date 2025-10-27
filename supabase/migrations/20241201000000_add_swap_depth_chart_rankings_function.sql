-- Add function to swap depth chart rankings atomically
-- This function safely swaps the rankings of two depth chart assignments
-- without triggering the ranking conflict handler

CREATE OR REPLACE FUNCTION swap_depth_chart_rankings(
  assignment_id_1 UUID,
  assignment_id_2 UUID
)
RETURNS VOID AS $$
DECLARE
  ranking_1 INTEGER;
  ranking_2 INTEGER;
BEGIN
  -- Get the current rankings of both assignments
  SELECT ranking INTO ranking_1
  FROM depth_chart_assignments
  WHERE id = assignment_id_1;
  
  SELECT ranking INTO ranking_2
  FROM depth_chart_assignments
  WHERE id = assignment_id_2;
  
  -- Check that both assignments exist
  IF ranking_1 IS NULL OR ranking_2 IS NULL THEN
    RAISE EXCEPTION 'One or both assignments not found';
  END IF;
  
  -- Temporarily disable the ranking conflict trigger
  ALTER TABLE depth_chart_assignments DISABLE TRIGGER handle_depth_chart_ranking_conflicts;
  
  -- Swap the rankings
  UPDATE depth_chart_assignments
  SET ranking = ranking_2,
      updated_at = NOW()
  WHERE id = assignment_id_1;
  
  UPDATE depth_chart_assignments
  SET ranking = ranking_1,
      updated_at = NOW()
  WHERE id = assignment_id_2;
  
  -- Re-enable the ranking conflict trigger
  ALTER TABLE depth_chart_assignments ENABLE TRIGGER handle_depth_chart_ranking_conflicts;
  
END;
$$ LANGUAGE plpgsql;
