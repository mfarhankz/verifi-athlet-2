-- Survey School Fact RLS Policy
-- This policy allows the survey system to access school_fact table for specific data types
-- data_type_id 118: NAIA schools (value = 'NAIA')
-- data_type_id 119: NCAA divisions (values = 'D1', 'D2', 'D3')

-- Enable RLS on school_fact table if not already enabled
ALTER TABLE public.school_fact ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Survey can access school facts" ON public.school_fact;
DROP POLICY IF EXISTS "Public can access school facts for survey" ON public.school_fact;

-- Create a comprehensive policy for survey access to school_fact table
CREATE POLICY "Survey can access school facts"
  ON public.school_fact
  FOR SELECT
  TO public
  USING (
    -- Allow access to specific data types needed for surveys
    data_type_id IN (118, 119)
    AND 
    -- Ensure the value is not null and is a valid string
    value IS NOT NULL 
    AND value != ''
    AND
    -- Additional validation for specific values
    (
      -- For data_type_id 118, allow only 'NAIA' value
      (data_type_id = 118 AND value = 'NAIA')
      OR
      -- For data_type_id 119, allow only NCAA division values
      (data_type_id = 119 AND value IN ('D1', 'D2', 'D3'))
    )
  );

-- Create a more permissive policy if you need broader access
-- This allows access to all school_fact records with data_type_id 118 or 119
-- regardless of the specific value (useful for debugging or future expansion)
CREATE POLICY "Public can access school facts for survey"
  ON public.school_fact
  FOR SELECT
  TO public
  USING (
    data_type_id IN (118, 119)
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

-- Test the policy with sample queries
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

-- Show summary of accessible records
SELECT 'Summary of accessible school_fact records:' as summary_info;
SELECT 
  data_type_id,
  value,
  COUNT(*) as total_records
FROM school_fact 
WHERE data_type_id IN (118, 119)
GROUP BY data_type_id, value
ORDER BY data_type_id, value; 