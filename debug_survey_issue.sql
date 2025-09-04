-- Diagnostic script to debug survey RLS issue
-- Run this in Supabase SQL editor to identify the problem

-- 1. Check if the athlete exists
SELECT 
  id,
  first_name,
  last_name,
  sport_id
FROM athlete 
WHERE id = '80dd9abb-d895-4548-888e-6031449084aa';

-- 2. Check current RLS policies on athlete_fact table
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
WHERE tablename = 'athlete_fact';

-- 3. Check if RLS is enabled on athlete_fact table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'athlete_fact';

-- 4. Test the RLS policy manually with a sample insert
-- This will help identify if the policy is working correctly
DO $$
DECLARE
  test_athlete_id UUID := '80dd9abb-d895-4548-888e-6031449084aa';
  test_data_type_id INTEGER := 70; -- Consent checkbox
  test_value TEXT := 'TRUE';
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
  
  RAISE NOTICE 'Test insert successful';
  
  -- Clean up the test record
  DELETE FROM athlete_fact 
  WHERE athlete_id = test_athlete_id 
  AND data_type_id = test_data_type_id 
  AND source = 'survey';
  
  RAISE NOTICE 'Test record cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- 5. Check if there are any existing survey records for this athlete
SELECT 
  data_type_id,
  value,
  source,
  created_at
FROM athlete_fact 
WHERE athlete_id = '80dd9abb-d895-4548-888e-6031449084aa'
AND source = 'survey'
ORDER BY created_at DESC;

-- 6. Check the exact policy conditions
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'athlete_fact' 
AND policyname = 'Public can INSERT survey facts';

-- 7. Verify the data type IDs in the policy match what the survey is trying to insert
-- The survey is trying to insert: 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77
-- Check if these are all in the policy
SELECT 
  'Policy check' as check_type,
  CASE 
    WHEN '49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,77' = 
         '49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,77'
    THEN 'All survey IDs are in policy'
    ELSE 'Some survey IDs are missing from policy'
  END as result; 