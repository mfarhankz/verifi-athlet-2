-- Comprehensive Survey School Fact RLS Policy
-- This policy allows the survey system to access all necessary school_fact data
-- Based on analysis of the codebase, the survey needs access to:

-- data_type_id 23: School logo URLs
-- data_type_id 116: Conference information  
-- data_type_id 118: NAIA schools (value = 'NAIA')
-- data_type_id 119: NCAA divisions (values = 'D1', 'D2', 'D3')

-- Enable RLS on school_fact table if not already enabled
ALTER TABLE public.school_fact ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Survey can access school facts" ON public.school_fact;
DROP POLICY IF EXISTS "Public can access school facts for survey" ON public.school_fact;
DROP POLICY IF EXISTS "Comprehensive survey school fact access" ON public.school_fact;

-- Create a comprehensive policy for all survey-related school_fact access
CREATE POLICY "Comprehensive survey school fact access"
  ON public.school_fact
  FOR SELECT
  TO public
  USING (
    -- Allow access to all data types needed for surveys
    data_type_id IN (23, 116, 118, 119)
    AND 
    -- Ensure the value is not null
    value IS NOT NULL
    AND
    -- Additional validation for specific data types
    (
      -- For data_type_id 23 (logos), allow any non-empty string
      (data_type_id = 23 AND value != '')
      OR
      -- For data_type_id 116 (conferences), allow any non-empty string
      (data_type_id = 116 AND value != '')
      OR
      -- For data_type_id 118, allow only 'NAIA' value
      (data_type_id = 118 AND value = 'NAIA')
      OR
      -- For data_type_id 119, allow only NCAA division values
      (data_type_id = 119 AND value IN ('D1', 'D2', 'D3'))
    )
  );

-- Create a backup policy for broader access if needed
-- This is useful for debugging or if you need to access other school_fact data
CREATE POLICY "Public can access school facts for survey"
  ON public.school_fact
  FOR SELECT
  TO public
  USING (
    data_type_id IN (23, 116, 118, 119)
    AND value IS NOT NULL
  );

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'school_fact'
ORDER BY policyname;

-- Test queries to verify the policy works correctly

-- Test data_type_id 23 (School logos)
SELECT 'Testing data_type_id 23 (School logos):' as test_info;
SELECT 
  school_id,
  data_type_id,
  LENGTH(value) as logo_url_length,
  COUNT(*) as record_count
FROM school_fact 
WHERE data_type_id = 23 
AND value != ''
GROUP BY school_id, data_type_id, LENGTH(value)
LIMIT 5;

-- Test data_type_id 116 (Conference information)
SELECT 'Testing data_type_id 116 (Conference):' as test_info;
SELECT 
  school_id,
  data_type_id,
  value as conference_name,
  COUNT(*) as record_count
FROM school_fact 
WHERE data_type_id = 116 
AND value != ''
GROUP BY school_id, data_type_id, value
LIMIT 5;

-- Test data_type_id 118 (NAIA schools)
SELECT 'Testing data_type_id 118 (NAIA):' as test_info;
SELECT 
  school_id,
  data_type_id,
  value,
  COUNT(*) as record_count
FROM school_fact 
WHERE data_type_id = 118 
AND value = 'NAIA'
GROUP BY school_id, data_type_id, value
LIMIT 5;

-- Test data_type_id 119 (NCAA divisions)
SELECT 'Testing data_type_id 119 (NCAA divisions):' as test_info;
SELECT 
  school_id,
  data_type_id,
  value,
  COUNT(*) as record_count
FROM school_fact 
WHERE data_type_id = 119 
AND value IN ('D1', 'D2', 'D3')
GROUP BY school_id, data_type_id, value
LIMIT 5;

-- Show comprehensive summary of accessible records
SELECT 'Comprehensive summary of accessible school_fact records:' as summary_info;
SELECT 
  data_type_id,
  CASE 
    WHEN data_type_id = 23 THEN 'School Logo URL'
    WHEN data_type_id = 116 THEN 'Conference'
    WHEN data_type_id = 118 THEN 'NAIA Status'
    WHEN data_type_id = 119 THEN 'NCAA Division'
    ELSE 'Unknown'
  END as data_type_description,
  value,
  COUNT(*) as total_records
FROM school_fact 
WHERE data_type_id IN (23, 116, 118, 119)
GROUP BY data_type_id, value
ORDER BY data_type_id, value;

-- Performance optimization: Create indexes for better query performance
-- These indexes will help the RLS policies perform better
CREATE INDEX IF NOT EXISTS idx_school_fact_data_type_value 
ON school_fact(data_type_id, value) 
WHERE data_type_id IN (23, 116, 118, 119);

CREATE INDEX IF NOT EXISTS idx_school_fact_school_data_type 
ON school_fact(school_id, data_type_id) 
WHERE data_type_id IN (23, 116, 118, 119);

-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'school_fact' 
AND indexname LIKE '%data_type%'; 