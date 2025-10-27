-- RLS Policies for Coach Data Access
-- These policies allow authorized users to select and edit coach data

-- 1. Coach table RLS policies
-- Enable RLS on coach table
ALTER TABLE coach ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT access to coach table
CREATE POLICY "coach_select_policy" ON coach
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for UPDATE access to coach table
CREATE POLICY "coach_update_policy" ON coach
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for INSERT access to coach table
CREATE POLICY "coach_insert_policy" ON coach
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 2. Coach_school table RLS policies
-- Enable RLS on coach_school table
ALTER TABLE coach_school ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT access to coach_school table
CREATE POLICY "coach_school_select_policy" ON coach_school
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for UPDATE access to coach_school table
CREATE POLICY "coach_school_update_policy" ON coach_school
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for INSERT access to coach_school table
CREATE POLICY "coach_school_insert_policy" ON coach_school
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Coach_fact table RLS policies
-- Enable RLS on coach_fact table
ALTER TABLE coach_fact ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT access to coach_fact table
CREATE POLICY "coach_fact_select_policy" ON coach_fact
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for UPDATE access to coach_fact table
CREATE POLICY "coach_fact_update_policy" ON coach_fact
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for INSERT access to coach_fact table
CREATE POLICY "coach_fact_insert_policy" ON coach_fact
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Grant necessary permissions to authenticated users
-- Grant SELECT, INSERT, UPDATE permissions on coach table
GRANT SELECT, INSERT, UPDATE ON coach TO authenticated;

-- Grant SELECT, INSERT, UPDATE permissions on coach_school table
GRANT SELECT, INSERT, UPDATE ON coach_school TO authenticated;

-- Grant SELECT, INSERT, UPDATE permissions on coach_fact table
GRANT SELECT, INSERT, UPDATE ON coach_fact TO authenticated;

-- 5. Grant USAGE on sequences if they exist
-- (Uncomment if you have sequences for auto-incrementing IDs)
-- GRANT USAGE ON SEQUENCE coach_id_seq TO authenticated;
-- GRANT USAGE ON SEQUENCE coach_school_id_seq TO authenticated;
-- GRANT USAGE ON SEQUENCE coach_fact_id_seq TO authenticated;
