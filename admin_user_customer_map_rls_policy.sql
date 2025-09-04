-- RLS Policy for user_customer_map table to allow admin users to manage user access
-- This policy allows users with customer_package_id = 3 (admin access) to insert, update, and delete user_customer_map records

-- Enable RLS on the table (if not already enabled)
ALTER TABLE "public"."user_customer_map" ENABLE ROW LEVEL SECURITY;


-- Policy for INSERT (creating new user_customer_map records)
-- Only admin users can create new user-customer mappings
CREATE POLICY "Admins can insert user_customer_map records" ON "public"."user_customer_map"
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_access_override 
    WHERE user_access_override.user_id = auth.uid() 
    AND user_access_override.customer_package_id = '3' 
    AND user_access_override.access_end IS NULL
  )
);

-- Policy for UPDATE (modifying existing user_customer_map records)
-- Only admin users can update user-customer mappings (including adding access_end dates)
CREATE POLICY "Admins can update user_customer_map records" ON "public"."user_customer_map"
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM user_access_override 
    WHERE user_access_override.user_id = auth.uid() 
    AND user_access_override.customer_package_id = '3' 
    AND user_access_override.access_end IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_access_override 
    WHERE user_access_override.user_id = auth.uid() 
    AND user_access_override.customer_package_id = '3' 
    AND user_access_override.access_end IS NULL
  )
);

-- Policy for DELETE (removing user_customer_map records)
-- Only admin users can delete user-customer mappings
CREATE POLICY "Admins can delete user_customer_map records" ON "public"."user_customer_map"
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM user_access_override 
    WHERE user_access_override.user_id = auth.uid() 
    AND user_access_override.customer_package_id = '3' 
    AND user_access_override.access_end IS NULL
  )
);

-- Note: If you have existing policies on user_customer_map that conflict, 
-- you may need to drop them first using:
-- DROP POLICY IF EXISTS "existing_policy_name" ON "public"."user_customer_map";
