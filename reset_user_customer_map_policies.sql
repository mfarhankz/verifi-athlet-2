-- Reset all RLS policies on user_customer_map and create clean admin policies
-- This will remove any conflicting policies

-- First, see what policies currently exist
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'user_customer_map';

-- Drop ALL existing policies on user_customer_map
DROP POLICY IF EXISTS "Admins can insert user_customer_map records" ON "public"."user_customer_map";
DROP POLICY IF EXISTS "Admins can update user_customer_map records" ON "public"."user_customer_map";
DROP POLICY IF EXISTS "Admins can delete user_customer_map records" ON "public"."user_customer_map";
DROP POLICY IF EXISTS "Authenticated users can see active access only" ON "public"."user_customer_map";

-- Add any other policies you see from the SELECT above - replace "PolicyName" with actual names:
-- DROP POLICY IF EXISTS "PolicyName" ON "public"."user_customer_map";

-- Now create clean admin policies
CREATE POLICY "Admin full access" ON "public"."user_customer_map"
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_access_override
    WHERE user_access_override.user_id = auth.uid() 
      AND user_access_override.customer_package_id = '3'::bigint 
      AND user_access_override.access_end IS NULL
  )
);

-- Create a basic read policy for regular users
CREATE POLICY "Users can read their own mappings" ON "public"."user_customer_map"
FOR SELECT TO public
USING (user_id = auth.uid());

-- Verify the new policies
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'user_customer_map';

