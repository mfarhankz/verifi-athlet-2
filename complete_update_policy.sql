-- Complete the broken UPDATE policy for user_customer_map
-- The WITH CHECK clause is currently incomplete and missing its condition

ALTER POLICY "Admins can update user_customer_map records"
ON "public"."user_customer_map"
TO public
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

