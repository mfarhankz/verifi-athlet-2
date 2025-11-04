-- Fix RLS policy to allow data_type_id 250 for survey completion marker
-- This script adds data_type_id 250 to the athlete_fact INSERT policy

-- Drop existing athlete_fact INSERT policy
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;

-- Create updated INSERT policy for athlete_fact that includes data_type_id 250
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
      7, 72, 255, 256, 365, 366, 679, 680, 681, 682, 686, 687, 688, 693, 696,
      -- Survey completion marker
      250
    )
    AND athlete_id IS NOT NULL
    AND value IS NOT NULL
  );

-- Verify the policy was created correctly
SELECT 'Updated athlete_fact INSERT policy:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'athlete_fact' 
AND cmd = 'INSERT'
ORDER BY policyname;
