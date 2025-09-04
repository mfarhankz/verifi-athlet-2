-- Fix the incomplete UPDATE policy for user_customer_map
-- The current policy is missing the WITH CHECK clause content

-- Drop the incomplete UPDATE policy
DROP POLICY IF EXISTS "Admins can update user_customer_map records" ON "public"."user_customer_map";

-- Recreate the UPDATE policy with proper WITH CHECK clause
CREATE POLICY "Admins can update user_customer_map records" ON "public"."user_customer_map"
FOR UPDATE TO public
USING (
  (EXISTS ( 
    SELECT 1
    FROM user_access_override
    WHERE ((user_access_override.user_id = auth.uid()) 
           AND (user_access_override.customer_package_id = '3'::bigint) 
           AND (user_access_override.access_end IS NULL))
  ))
)
WITH CHECK (
  (EXISTS ( 
    SELECT 1
    FROM user_access_override
    WHERE ((user_access_override.user_id = auth.uid()) 
           AND (user_access_override.customer_package_id = '3'::bigint) 
           AND (user_access_override.access_end IS NULL))
  ))
);

-- Verify all policies are correct
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'user_customer_map' 
ORDER BY policyname;

