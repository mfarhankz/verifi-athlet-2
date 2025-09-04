-- Comprehensive fix for survey RLS policies
-- This script completely recreates the policies with all necessary data type IDs

-- First, drop existing policies
DROP POLICY IF EXISTS "Public can SELECT survey facts" ON public.athlete_fact;
DROP POLICY IF EXISTS "Public can INSERT survey facts" ON public.athlete_fact;

-- Create new SELECT policy with ALL survey data type IDs
CREATE POLICY "Public can SELECT survey facts"
  ON public.athlete_fact
  FOR SELECT
  USING (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  );

-- Create new INSERT policy with ALL survey data type IDs
CREATE POLICY "Public can INSERT survey facts"
  ON public.athlete_fact
  FOR INSERT
  WITH CHECK (
    source = 'survey'
    AND data_type_id IN (
      1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571
    )
  );

-- Verify the policies were created correctly
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
WHERE tablename = 'athlete_fact' 
AND policyname LIKE '%survey%';

-- Test that the policies are working by checking if we can see the policy details
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'athlete_fact' 
AND policyname = 'Public can INSERT survey facts'; 