-- Check all RLS policies on user_customer_map table
SELECT 
  schemaname,
  tablename, 
  policyname, 
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_customer_map' 
ORDER BY cmd, policyname;

-- Also check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_customer_map';

