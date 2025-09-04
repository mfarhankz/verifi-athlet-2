-- -- Enable RLS on all relevant tables
-- ALTER TABLE athlete ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE main_tp_page ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE details_tp_page ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE athlete_fact ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stat ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE athlete_school ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE school ENABLE ROW LEVEL SECURITY;

-- -- Create a function to check if a user has access to an athlete
-- CREATE OR REPLACE FUNCTION has_athlete_access(athlete_id UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--     -- Check if the user is authenticated
--     IF auth.uid() IS NULL THEN
--         RETURN FALSE;
--     END IF;

--     -- Check if the athlete is in the user's recruiting board
--     RETURN EXISTS (
--         SELECT 1 FROM recruiting_board
--         WHERE user_id = auth.uid()
--         AND athlete_id = has_athlete_access.athlete_id
--     );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- Policy to allow users to view athletes they have access to
-- CREATE POLICY "Users can view athletes they have access to"
--     ON athlete
--     FOR SELECT
--     USING (has_athlete_access(id));

-- -- Policy to allow users to view main_tp_page data for athletes they have access to
-- CREATE POLICY "Users can view main_tp_page data for their athletes"
--     ON main_tp_page
--     FOR SELECT
--     USING (has_athlete_access(athlete_id));

-- -- Policy to allow users to view details_tp_page data for athletes they have access to
-- CREATE POLICY "Users can view details_tp_page data for their athletes"
--     ON details_tp_page
--     FOR SELECT
--     USING (has_athlete_access(athlete_id));

-- -- Policy to allow users to view athlete_fact data for athletes they have access to
-- CREATE POLICY "Users can view athlete_fact data for their athletes"
--     ON athlete_fact
--     FOR SELECT
--     USING (has_athlete_access(athlete_id));

-- -- Policy to allow users to view stat data for athletes they have access to
-- CREATE POLICY "Users can view stat data for their athletes"
--     ON stat
--     FOR SELECT
--     USING (has_athlete_access(athlete_id));

-- -- Policy to allow users to view colleges associated with athletes they have access to
-- CREATE POLICY "Users can view colleges for their athletes"
--     ON colleges
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM main_tp_page
--             WHERE main_tp_page.college_id = colleges.id
--             AND has_athlete_access(main_tp_page.athlete_id)
--         )
--     );

-- -- Policy to allow users to view athlete_school data for athletes they have access to
-- CREATE POLICY "Users can view athlete_school data for their athletes"
--     ON athlete_school
--     FOR SELECT
--     USING (has_athlete_access(athlete_id));

-- -- Policy to allow users to view school data associated with athlete schools they have access to
-- CREATE POLICY "Users can view schools for their athlete schools"
--     ON school
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM athlete_school
--             WHERE athlete_school.school_id = school.id
--             AND has_athlete_access(athlete_school.athlete_id)
--         )
--     );

-- Enable RLS on sport_stat_config table
ALTER TABLE sport_stat_config ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view sport_stat_config data
CREATE POLICY "Users can view sport_stat_config data"
    ON sport_stat_config
    FOR SELECT
    USING (true);  -- Since this is reference data, all authenticated users can view it 