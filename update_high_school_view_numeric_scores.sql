-- Update vw_high_school view to cast score columns as numeric for proper filtering
-- This allows numeric comparisons (greater than, less than) to work correctly

CREATE OR REPLACE VIEW vw_high_school AS
SELECT 
  hs.school_id,
  hs.school_name,
  -- Cast score columns to numeric for proper filtering
  CAST(hs.hs_prospects_score AS numeric) AS hs_prospects_score,
  CAST(hs.hs_d1_prospects_score AS numeric) AS hs_d1_prospects_score,
  CAST(hs.hs_team_quality_score AS numeric) AS hs_team_quality_score,
  CAST(hs.hs_athlete_income_score AS numeric) AS hs_athlete_income_score,
  CAST(hs.hs_academics_score AS numeric) AS hs_academics_score,
  -- Include other columns as-is
  hs.hs_state,
  hs.hs_county,
  hs.hs_religious_affiliation,
  hs.hs_school_type,
  hs.* -- Include all other columns
FROM high_schools hs;

-- Add comment explaining the change
COMMENT ON VIEW vw_high_school IS 'High school data view with score columns cast as numeric for proper filtering operations';

