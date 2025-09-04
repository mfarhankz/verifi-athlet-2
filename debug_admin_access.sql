-- Debug admin access step by step

-- 1. Check what user you are authenticated as
SELECT auth.uid() as current_user_id;

-- 2. Check if you have any records in user_access_override
SELECT * FROM user_access_override WHERE user_id = auth.uid();

-- 3. Specifically check for admin access (package 3)
SELECT 
  user_id,
  customer_package_id,
  access_end,
  CASE 
    WHEN access_end IS NULL THEN 'Active Admin Access'
    ELSE 'Expired Admin Access'
  END as status
FROM user_access_override 
WHERE user_id = auth.uid() 
  AND customer_package_id = '3'::bigint;

-- 4. Test the exact condition from the RLS policy
SELECT 
  EXISTS (
    SELECT 1
    FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  ) as has_admin_access;

-- 5. Check data types to make sure there's no mismatch
SELECT 
  user_id,
  customer_package_id,
  pg_typeof(customer_package_id) as package_id_type,
  access_end,
  pg_typeof(access_end) as access_end_type
FROM user_access_override 
WHERE user_id = auth.uid();

