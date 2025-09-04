-- Targeted fix for survey athlete access
-- This script allows public access only to specific athlete data needed for surveys

-- 1. Check if RLS is enabled on athlete table
SELECT 'Checking RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'athlete';

-- 2. Enable RLS on athlete table if not already enabled
ALTER TABLE public.athlete ENABLE ROW LEVEL SECURITY;

-- 3. Create a more restrictive policy that only allows access to athletes that have survey data
-- or are specifically allowed for surveys
CREATE POLICY "Public can access athletes with survey access"
  ON public.athlete
  FOR SELECT
  TO public
  USING (
    -- Allow access if the athlete has existing survey data
    EXISTS (
      SELECT 1 FROM athlete_fact 
      WHERE athlete_fact.athlete_id = athlete.id 
      AND athlete_fact.source = 'survey'
    )
    OR
    -- Allow access if the athlete is in a specific list (you can modify this)
    id IN (
      '80dd9abb-d895-4548-888e-6031449084aa'  -- Add specific athlete IDs here
      -- Add more athlete IDs as needed
    )
  );

-- 4. Ensure athlete_fact has the correct policies for surveys
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public can SELECT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;

-- 5. Create comprehensive athlete_fact policies for surveys
CREATE POLICY "Public can SELECT survey facts"
  ON public.athlete_fact
  FOR SELECT
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  );

CREATE POLICY "Public can INSERT survey facts"
  ON public.athlete_fact
  FOR INSERT
  TO public
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
    AND athlete_id IS NOT NULL
    AND value IS NOT NULL
  );

-- 6. Ensure offer table has correct policies
DROP POLICY IF EXISTS "Public can SELECT survey offers" ON public.offer;
DROP POLICY IF EXISTS "Public can INSERT survey offers" ON public.offer;

CREATE POLICY "Public can SELECT survey offers"
  ON public.offer
  FOR SELECT
  TO public
  USING (source = 'survey');

CREATE POLICY "Public can INSERT survey offers"
  ON public.offer
  FOR INSERT
  TO public
  WITH CHECK (source = 'survey');

-- 7. Verify all policies
SELECT 'Verifying policies:' as info;
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('athlete', 'athlete_fact', 'offer')
ORDER BY tablename, policyname;

-- 8. Test the specific athlete access
SELECT 'Testing specific athlete access:' as info;
SELECT 
  id,
  first_name,
  last_name,
  sport_id
FROM athlete 
WHERE id = '80dd9abb-d895-4548-888e-6031449084aa';

-- 9. Test survey data access
SELECT 'Testing survey data access:' as info;
SELECT 
  data_type_id,
  value,
  source
FROM athlete_fact 
WHERE athlete_id = '80dd9abb-d895-4548-888e-6031449084aa'
AND source = 'survey'
LIMIT 5; 