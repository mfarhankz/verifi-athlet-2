-- Fix the SELECT policy to allow admins to see all records
-- The current policy only allows seeing active records (access_end IS NULL)
-- But admins need to see all records to manage them

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can see active access only" ON "public"."user_customer_map";

-- Create a new SELECT policy that allows:
-- 1. Admins to see ALL records (both active and inactive)
-- 2. Regular users to see only their own active records
CREATE POLICY "Users can see appropriate records" ON "public"."user_customer_map"
FOR SELECT TO public
USING (
  -- Admins can see all records
  (EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  ))
  OR
  -- Regular users can see only their own active records
  (user_id = auth.uid() AND access_end IS NULL)
);

-- Verify the updated policies
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'user_customer_map' ORDER BY cmd;

