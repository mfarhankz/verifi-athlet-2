-- Complete fix for survey RLS policies
-- This script fixes both athlete_fact and school_fact RLS policies
-- to include all necessary data_type_ids for the survey system

-- ===========================================
-- PART 1: Fix athlete_fact RLS policies
-- ===========================================

-- Drop existing athlete_fact policies
DROP POLICY IF EXISTS "Public can SELECT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can UPDATE survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Survey token holders can SELECT their athlete facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Survey token holders can INSERT their athlete facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Survey token holders can UPDATE their athlete facts" ON public.athlete_fact;

-- Create comprehensive SELECT policy for athlete_fact
CREATE POLICY "Public can SELECT survey facts"
  ON public.athlete_fact
  FOR SELECT
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      -- Original survey data types
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571,
      -- New data types for sport_id 21 (football)
      7, 72, 255, 256, 365, 366, 679, 680, 681, 682, 686, 687, 688, 693, 696
    )
  );

-- Create comprehensive INSERT policy for athlete_fact
CREATE POLICY "Public can INSERT survey facts"
  ON public.athlete_fact
  FOR INSERT
  TO public
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      -- Original survey data types
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571,
      -- New data types for sport_id 21 (football)
      7, 72, 255, 256, 365, 366, 679, 680, 681, 682, 686, 687, 688, 693, 696
    )
    AND athlete_id IS NOT NULL
    AND value IS NOT NULL
  );

-- Create comprehensive UPDATE policy for athlete_fact
CREATE POLICY "Public can UPDATE survey facts"
  ON public.athlete_fact
  FOR UPDATE
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      -- Original survey data types
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571,
      -- New data types for sport_id 21 (football)
      7, 72, 255, 256, 365, 366, 679, 680, 681, 682, 686, 687, 688, 693, 696
    )
  )
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      -- Original survey data types
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571,
      -- New data types for sport_id 21 (football)
      7, 72, 255, 256, 365, 366, 679, 680, 681, 682, 686, 687, 688, 693, 696
    )
  );

-- ===========================================
-- PART 2: Fix school_fact RLS policies
-- ===========================================

-- Drop existing school_fact policies
DROP POLICY IF EXISTS "Survey can access school facts" ON public.school_fact;
DROP POLICY IF EXISTS "Public can access school facts for survey" ON public.school_fact;
DROP POLICY IF EXISTS "Comprehensive survey school fact access" ON public.school_fact;

-- Create comprehensive policy for school_fact access
CREATE POLICY "Survey can access school facts"
  ON public.school_fact
  FOR SELECT
  TO public
  USING (
    -- Allow access to all data types needed for surveys
    data_type_id IN (
      -- Original data types
      23, 116, 118, 119,
      -- State data (data_type_id 24) - needed for high school filtering
      24,
      -- High school data (data_type_id 117) - needed for high school selection
      117
    )
    AND value IS NOT NULL
    AND value != ''
  );

-- ===========================================
-- PART 3: Fix school table RLS policies
-- ===========================================

-- Enable RLS on school table if not already enabled
ALTER TABLE public.school ENABLE ROW LEVEL SECURITY;

-- Drop existing school policies
DROP POLICY IF EXISTS "Public can access schools for survey" ON public.school;
DROP POLICY IF EXISTS "Survey can access schools" ON public.school;

-- Create policy for school table access
CREATE POLICY "Survey can access schools"
  ON public.school
  FOR SELECT
  TO public
  USING (
    -- Allow access to all schools for survey purposes
    id IS NOT NULL
    AND name IS NOT NULL
  );

-- ===========================================
-- PART 4: Verify policies were created
-- ===========================================

-- Check athlete_fact policies
SELECT 'Athlete_fact policies:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies 
WHERE tablename = 'athlete_fact'
ORDER BY policyname;

-- Check school_fact policies
SELECT 'School_fact policies:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies 
WHERE tablename = 'school_fact'
ORDER BY policyname;

-- Check school policies
SELECT 'School policies:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies 
WHERE tablename = 'school'
ORDER BY policyname;

-- ===========================================
-- PART 5: Test queries to verify access
-- ===========================================

-- Test school_fact access for states (data_type_id 24)
SELECT 'Testing school_fact access for states:' as test_info;
SELECT 
  data_type_id,
  COUNT(*) as record_count,
  COUNT(DISTINCT value) as unique_states
FROM school_fact 
WHERE data_type_id = 24 
AND value IS NOT NULL
GROUP BY data_type_id;

-- Test school_fact access for high schools (data_type_id 117)
SELECT 'Testing school_fact access for high schools:' as test_info;
SELECT 
  data_type_id,
  COUNT(*) as record_count,
  COUNT(DISTINCT school_id) as unique_schools
FROM school_fact 
WHERE data_type_id = 117 
AND value = 'High School'
GROUP BY data_type_id;

-- Test school table access
SELECT 'Testing school table access:' as test_info;
SELECT 
  COUNT(*) as total_schools,
  COUNT(CASE WHEN name LIKE '%High School%' THEN 1 END) as high_schools
FROM school;
