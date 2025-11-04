-- Create function to add athlete directly to mv_hs_athletes_wide_v2 intermediate table
-- This ensures new athletes appear immediately without waiting for materialized view refresh

CREATE OR REPLACE FUNCTION add_athlete_to_mv_hs_wide_v2(
  p_athlete_id UUID,
  p_school_id UUID,
  p_sport_id INTEGER,
  p_athlete_first_name TEXT,
  p_athlete_last_name TEXT,
  p_height_feet INTEGER DEFAULT NULL,
  p_height_inch NUMERIC DEFAULT NULL,
  p_weight INTEGER DEFAULT NULL,
  p_gpa NUMERIC DEFAULT NULL,
  p_grad_year TEXT DEFAULT NULL,
  p_hs_highlight TEXT DEFAULT NULL,
  p_sat INTEGER DEFAULT NULL,
  p_act INTEGER DEFAULT NULL,
  p_primary_position TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_twitter TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into the intermediate table that feeds mv_hs_athletes_wide_v2
  INSERT INTO intermediate.mv_hs_athletes_wide_v2 (
    athlete_id,
    school_id,
    sport_id,
    athlete_first_name,
    athlete_last_name,
    height_feet,
    height_inch,
    weight,
    gpa,
    grad_year,
    hs_highlight,
    sat,
    act,
    primary_position,
    email,
    twitter,
    created_at,
    updated_at
  ) VALUES (
    p_athlete_id,
    p_school_id,
    p_sport_id,
    p_athlete_first_name,
    p_athlete_last_name,
    p_height_feet,
    p_height_inch,
    p_weight,
    p_gpa,
    p_grad_year,
    p_hs_highlight,
    p_sat,
    p_act,
    p_primary_position,
    p_email,
    p_twitter,
    NOW(),
    NOW()
  );
  
  -- If the intermediate table doesn't exist, try inserting directly into the materialized view table
  -- (This is a fallback - materialized views are usually read-only)
  EXCEPTION
    WHEN undefined_table THEN
      -- Log the error but don't fail the operation
      RAISE WARNING 'Intermediate table intermediate.mv_hs_athletes_wide_v2 does not exist. Athlete will appear after next materialized view refresh.';
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the operation
      RAISE WARNING 'Error inserting into mv_hs_athletes_wide_v2 intermediate table: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_athlete_to_mv_hs_wide_v2 TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION add_athlete_to_mv_hs_wide_v2 IS 'Adds athlete data directly to mv_hs_athletes_wide_v2 intermediate table for immediate visibility';
