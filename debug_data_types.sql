-- Debug data type issues that might be causing RLS problems

-- 1. Check your admin access record and data types
SELECT 
  user_id,
  customer_package_id,
  pg_typeof(customer_package_id) as package_id_type,
  access_end,
  pg_typeof(access_end) as access_end_type
FROM user_access_override 
WHERE user_id = auth.uid() 
  AND customer_package_id = '3';

-- 2. Test the RLS condition with different type castings
SELECT 
  'Test 1 - String comparison' as test,
  EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'
      AND user_access_override.access_end IS NULL
  ) as result
UNION ALL
SELECT 
  'Test 2 - Bigint comparison' as test,
  EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint
      AND user_access_override.access_end IS NULL
  ) as result
UNION ALL
SELECT 
  'Test 3 - Integer comparison' as test,
  EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = 3
      AND user_access_override.access_end IS NULL
  ) as result;

-- 3. Check if the policy condition matches exactly
SELECT 
  'Exact policy condition' as test,
  (EXISTS ( SELECT 1
   FROM user_access_override
  WHERE ((user_access_override.user_id = auth.uid()) AND (user_access_override.customer_package_id = '3'::bigint) AND (user_access_override.access_end IS NULL)))) as result;

