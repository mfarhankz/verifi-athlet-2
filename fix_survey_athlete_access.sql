-- Fix athlete access for surveys
-- This script allows public access to athlete data for survey purposes

-- 1. Check current policies on athlete table
SELECT 'Current athlete table policies:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'athlete';

-- 2. Enable RLS on athlete table if not already enabled
ALTER TABLE public.athlete ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow public access to athlete data for surveys
-- This allows unauthenticated users to access basic athlete info needed for surveys
CREATE POLICY "Public can access athlete data for surveys"
  ON public.athlete
  FOR SELECT
  TO public
  USING (true);  -- Allow public access to all athlete data for survey purposes

-- 4. Also create a policy for athlete_fact to allow public access to existing survey data
CREATE POLICY "Public can access existing survey facts"
  ON public.athlete_fact
  FOR SELECT
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  );

-- 5. Create a policy for the offer table to allow public access for surveys
CREATE POLICY "Public can access survey offers"
  ON public.offer
  FOR SELECT
  TO public
  USING (source = 'survey');

-- 6. Create a policy for the offer table to allow public inserts for surveys
CREATE POLICY "Public can insert survey offers"
  ON public.offer
  FOR INSERT
  TO public
  WITH CHECK (source = 'survey');

-- 7. Verify all policies were created
SELECT 'All policies created:' as info;
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('athlete', 'athlete_fact', 'offer')
ORDER BY tablename, policyname;

-- 8. Test athlete access
SELECT 'Testing athlete access:' as info;
SELECT 
  id,
  first_name,
  last_name,
  sport_id
FROM athlete 
WHERE id = '80dd9abb-d895-4548-888e-6031449084aa';

-- 9. Test survey fact access
SELECT 'Testing survey fact access:' as info;
SELECT 
  data_type_id,
  value,
  source
FROM athlete_fact 
WHERE athlete_id = '80dd9abb-d895-4548-888e-6031449084aa'
AND source = 'survey'
LIMIT 5; 