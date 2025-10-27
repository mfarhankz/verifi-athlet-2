-- Verify Admin Setup for User Invitation System
-- Run this in your Supabase SQL Editor to check everything is configured correctly

-- 1. Check if user_detail table exists and structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_detail' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if user_customer_map table exists and structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_customer_map' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies on user_customer_map
SELECT 
  policyname, 
  cmd,
  permissive,
  CASE 
    WHEN cmd = 'INSERT' THEN 'Create user-customer mappings'
    WHEN cmd = 'UPDATE' THEN 'Update user-customer mappings' 
    WHEN cmd = 'DELETE' THEN 'Delete user-customer mappings'
    WHEN cmd = 'SELECT' THEN 'Read user-customer mappings'
    ELSE cmd
  END as operation_description
FROM pg_policies 
WHERE tablename = 'user_customer_map'
ORDER BY cmd, policyname;

-- 4. Check if RLS is enabled on both tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_detail', 'user_customer_map')
  AND schemaname = 'public';

-- 5. Check if customer table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'customer' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'sport_id', 'school_id')
ORDER BY ordinal_position;

-- 6. Check sample data in customer table (first 5 records)
SELECT id, sport_id, school_id
FROM customer 
LIMIT 5;

-- 7. Check if user_access_override table exists for admin access
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_access_override' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Check if there are any admin users configured (package ID 3)
SELECT 
  user_id,
  customer_package_id,
  access_end,
  CASE 
    WHEN access_end IS NULL THEN 'Active Admin'
    ELSE 'Expired Admin'
  END as status
FROM user_access_override 
WHERE customer_package_id = 3;

-- 9. Summary: What needs to be verified
SELECT 
  'Configuration Check' as check_type,
  'Expected Results' as expected;

-- Results should show:
-- ✅ user_detail table exists with id, name_first, name_last columns
-- ✅ user_customer_map table exists with user_id, customer_id, access_end columns  
-- ✅ RLS policies exist for admin access (package ID 3)
-- ✅ customer table exists and has data
-- ✅ At least one admin user exists in user_access_override with package ID 3
