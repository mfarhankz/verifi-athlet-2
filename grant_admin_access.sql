-- Grant admin access to the current user
-- This will allow you to use the admin features

-- First, check your current user ID
SELECT auth.uid() as my_user_id;

-- Insert admin access record for yourself
INSERT INTO user_access_override (
    user_id, 
    customer_package_id, 
    access_end
) VALUES (
    auth.uid(),    -- Your current user ID
    '3',           -- Package ID 3 = Admin access
    NULL           -- NULL = never expires
);

-- Verify the admin access was granted
SELECT 
  user_id,
  customer_package_id,
  access_end,
  'Admin Access Granted!' as status
FROM user_access_override 
WHERE user_id = auth.uid() 
  AND customer_package_id = '3';

-- Test the RLS condition again
SELECT 
  EXISTS (
    SELECT 1
    FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  ) as has_admin_access;

