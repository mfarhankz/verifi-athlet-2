-- Comprehensive fix for survey RLS policies
-- This script addresses all potential issues with the survey submission

-- 1. First, let's check what policies currently exist
SELECT 'Current policies:' as info;
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'athlete_fact';

-- 2. Drop ALL existing policies on athlete_fact to start fresh
DROP POLICY IF EXISTS "Public can SELECT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can UPDATE survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can DELETE survey facts" ON public.athlete_fact;

-- 3. Create a comprehensive SELECT policy for survey data
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

-- 4. Create a comprehensive INSERT policy for survey data
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

-- 5. Create an UPDATE policy for survey data (in case updates are needed)
CREATE POLICY "Public can UPDATE survey facts"
  ON public.athlete_fact
  FOR UPDATE
  TO public
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  )
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  );

-- 6. Verify RLS is enabled on the table
ALTER TABLE public.athlete_fact ENABLE ROW LEVEL SECURITY;

-- 7. Verify the policies were created
SELECT 'New policies created:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies 
WHERE tablename = 'athlete_fact'
ORDER BY policyname;

-- 8. Test the policies with a sample insert
DO $$
DECLARE
  test_athlete_id UUID := '80dd9abb-d895-4548-888e-6031449084aa';
  test_data_type_id INTEGER := 70;
  test_value TEXT := 'TRUE';
  insert_result INTEGER;
BEGIN
  -- Try to insert a test record
  INSERT INTO athlete_fact (
    athlete_id, 
    data_type_id, 
    value, 
    source, 
    date, 
    created_at
  ) VALUES (
    test_athlete_id,
    test_data_type_id,
    test_value,
    'survey',
    NOW(),
    NOW()
  );
  
  GET DIAGNOSTICS insert_result = ROW_COUNT;
  
  IF insert_result > 0 THEN
    RAISE NOTICE 'Test insert successful - % rows inserted', insert_result;
  ELSE
    RAISE NOTICE 'Test insert failed - no rows inserted';
  END IF;
  
  -- Clean up the test record
  DELETE FROM athlete_fact 
  WHERE athlete_id = test_athlete_id 
  AND data_type_id = test_data_type_id 
  AND source = 'survey';
  
  RAISE NOTICE 'Test record cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$; 