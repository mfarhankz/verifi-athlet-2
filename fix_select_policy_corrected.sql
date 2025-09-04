-- Fix the SELECT policy to allow admins to see all records
-- The issue: my previous policy was too restrictive for regular users
-- Original policy allowed any authenticated user to see active records
-- My policy incorrectly restricted users to only their own records

-- Drop the policy I created
DROP POLICY IF EXISTS "Users can see appropriate records" ON "public"."user_customer_map";

-- Recreate the original policy but with admin exception
CREATE POLICY "Authenticated users can see active access only" ON "public"."user_customer_map"
FOR SELECT TO public
USING (
  -- Admins can see ALL records (both active and inactive)
  (EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  ))
  OR
  -- Regular authenticated users can see active records (original behavior)
  ((auth.role() = 'authenticated'::text) AND (access_end IS NULL))
);

-- Verify the updated policies
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'user_customer_map' ORDER BY cmd;
