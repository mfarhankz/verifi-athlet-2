-- Check if the current authenticated user has admin access
SELECT 
  user_id,
  customer_package_id,
  access_end,
  'Has Admin Access' as status
FROM user_access_override 
WHERE user_id = auth.uid() 
  AND customer_package_id = '3'::bigint 
  AND access_end IS NULL;

-- Also check what user_id you are authenticated as
SELECT auth.uid() as current_user_id;

-- And check all your access overrides
SELECT * FROM user_access_override WHERE user_id = auth.uid();

